import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, pool } from "./db";
import { storage } from "./storage";
import { users, interactions, jobs, tasks } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

declare global {
 namespace Express {
  interface User {
   id: number;
   username: string;
   email: string | null;
   first_name: string | null;
   last_name: string | null;
   profile_image_url: string | null;
   role: string;
   is_active: boolean;
   last_login: Date | null;
   created_at: Date | null;
   updated_at: Date | null;
  }
 }
}

declare module "express-session" {
 interface SessionData {
  user?: Express.User;
 }
}

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface AuthenticatedRequest extends Express.Request {
 user?: Express.User;
 body: any;
 params: any;
 query: any;
}

export function setupAuth(app: Express) {
 // Validate session secret in production
 if (process.env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes("change-this")) {
   throw new Error("SESSION_SECRET must be set to a secure random string in production");
  }
 }

 // Always use PostgreSQL session store to persist sessions across deployments
 let sessionStore;
 try {
  sessionStore = new PostgresSessionStore({
   pool: pool,
   tableName: "sessions",
   createTableIfMissing: true,
   pruneSessionInterval: 60 * 15, // prune expired sessions every 15 minutes
  });
 } catch (error) {
  console.error("Failed to initialize PostgreSQL session store:", error);
  // Fallback to memory store with warning
  console.warn("Falling back to memory store - sessions will not persist across server restarts");
  sessionStore = new MemoryStore({
   checkPeriod: 86400000,
  });
 }

 const sessionSettings: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "dev-secret-key-not-for-production",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  name: "dealership.sid", // Custom session name
  cookie: {
   secure: process.env.NODE_ENV === "production",
   httpOnly: true,
   maxAge: 60 * 60 * 1000, // 1 hour default
   sameSite: "lax",
  },
  rolling: true, // Reset expiration on activity
 };

 app.set("trust proxy", 1);
 app.use(session(sessionSettings));

 // Helper function to hash passwords
 const hashPassword = async (password: string): Promise<string> => {
  // Reduced from 12 to 10 for better performance (still secure)
  const saltRounds = process.env.NODE_ENV === "production" ? 10 : 8;
  return await bcrypt.hash(password, saltRounds);
 };

 // Helper function to compare passwords
 const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
 };

 // Registration endpoint
 app.post("/api/auth/register", async (req, res) => {
  try {
   const { username, password, email, first_name, last_name, role } = req.body;

   // Validate required fields
   if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
   }

   // Check if user already exists
   const existingUser = await db.select().from(users).where(eq(users.username, username));
   if (existingUser.length > 0) {
    return res.status(400).json({ message: "Username already exists" });
   }

   // Hash password
   const hashedPassword = await hashPassword(password);

   // Create new user
   const newUser = await db
    .insert(users)
    .values({
     username,
     password: hashedPassword,
     email: email || null,
     first_name: first_name || null,
     last_name: last_name || null,
     role: role || "salesperson",
     is_active: true,
    })
    .returning();

   // Don't return password in response
   const { password: _, ...userWithoutPassword } = newUser[0];

   res.status(201).json({
    message: "User created successfully",
    user: userWithoutPassword,
   });
  } catch (error) {
   console.error("Registration error:", error);
   res.status(500).json({ message: "Failed to create user" });
  }
 });

 // Login endpoint
 app.post("/api/auth/login", async (req, res) => {
  try {
   const { username, password, remember_me } = req.body;

   // Validate required fields
   if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
   }

   // Find user
   const user = await db.select().from(users).where(eq(users.username, username));
   if (user.length === 0) {
    return res.status(401).json({ message: "Invalid username or password" });
   }

   const foundUser = user[0];

   // Check if user is active
   if (!foundUser.is_active) {
    return res.status(401).json({ message: "Account is disabled" });
   }

   // Check password
   const isPasswordValid = await comparePassword(password, foundUser.password);
   if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid username or password" });
   }

   // Update last login
   await db.update(users).set({ last_login: new Date() }).where(eq(users.id, foundUser.id));

   // Create session
   const { password: _, ...userWithoutPassword } = foundUser;
   req.session.user = userWithoutPassword;
   req.session.user.last_login = new Date();

   // Set session duration based on remember_me flag
   if (remember_me) {
    // 8 hours for remember me
    req.session.cookie.maxAge = 8 * 60 * 60 * 1000;
   } else {
    // 1 hour for normal session
    req.session.cookie.maxAge = 60 * 60 * 1000;
   }

   res.json({
    message: "Login successful",
    user: userWithoutPassword,
   });
  } catch (error) {
   console.error("Login error:", error);
   res.status(500).json({ message: "Login failed" });
  }
 });

 // Logout endpoint
 app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(err => {
   if (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Logout failed" });
   }
   // Clear both default and custom session cookies with proper options
   res.clearCookie("connect.sid", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
   });
   res.clearCookie("dealership.sid", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
   });
   res.json({ message: "Logout successful" });
  });
 });

 // Get current user endpoint
 app.get("/api/auth/user", (req, res) => {
  try {
   if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
   }
   res.json({ user: req.session.user });
  } catch (error) {
   console.error("Auth user error:", error);
   res.status(500).json({ message: "Authentication check failed" });
  }
 });

 // Get user permissions endpoint
 app.get("/api/auth/permissions", async (req, res) => {
  try {
   if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
   }

   const userId = req.session.user.id;
   const permissions = await storage.getUserPermissions(userId);

   // Transform permissions to match frontend expectations
   const transformedPermissions = permissions.map(permission => ({
    id: permission.id,
    user_id: permission.user_id,
    page_key: permission.page_key,
    can_view: permission.permission_level !== "hidden",
    access_level: permission.permission_level === "full_access" ? "full_access" : "view_only",
    is_visible: permission.permission_level !== "hidden",
   }));

   res.json(transformedPermissions);
  } catch (error) {
   console.error("Get permissions error:", error);
   res.status(500).json({ message: "Failed to get permissions" });
  }
 });

 // Update user profile endpoint
 app.put("/api/auth/profile", async (req, res) => {
  try {
   if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
   }

   const { first_name, last_name, email } = req.body;
   const userId = req.session.user.id;

   // Update user profile
   const updatedUser = await db
    .update(users)
    .set({
     first_name: first_name || null,
     last_name: last_name || null,
     email: email || null,
     updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

   if (updatedUser.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   const { password: _, ...userWithoutPassword } = updatedUser[0];
   req.session.user = userWithoutPassword;

   res.json({
    message: "Profile updated successfully",
    user: userWithoutPassword,
   });
  } catch (error) {
   console.error("Profile update error:", error);
   res.status(500).json({ message: "Failed to update profile" });
  }
 });

 // Change password endpoint
 app.put("/api/auth/change-password", async (req, res) => {
  try {
   if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
   }

   const { current_password, new_password } = req.body;
   const userId = req.session.user.id;

   // Validate required fields
   if (!current_password || !new_password) {
    return res.status(400).json({ message: "Current password and new password are required" });
   }

   // Get user's current password
   const user = await db.select().from(users).where(eq(users.id, userId));
   if (user.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   // Verify current password
   const isCurrentPasswordValid = await comparePassword(current_password, user[0].password);
   if (!isCurrentPasswordValid) {
    return res.status(401).json({ message: "Current password is incorrect" });
   }

   // Hash new password
   const hashedNewPassword = await hashPassword(new_password);

   // Update password
   await db
    .update(users)
    .set({
     password: hashedNewPassword,
     updated_at: new Date(),
    })
    .where(eq(users.id, userId));

   res.json({ message: "Password changed successfully" });
  } catch (error) {
   console.error("Password change error:", error);
   res.status(500).json({ message: "Failed to change password" });
  }
 });

 // Admin-only user management endpoints

 // Get all users (admin only)
 app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
   const allUsers = await db
    .select({
     id: users.id,
     username: users.username,
     email: users.email,
     first_name: users.first_name,
     last_name: users.last_name,
     role: users.role,
     is_active: users.is_active,
     last_login: users.last_login,
     created_at: users.created_at,
     updated_at: users.updated_at,
    })
    .from(users);

   res.json(allUsers);
  } catch (error) {
   console.error("Get users error:", error);
   res.status(500).json({ message: "Failed to fetch users" });
  }
 });

 // Create user (admin only)
 app.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
   const { username, password, email, first_name, last_name, role, is_active } = req.body;

   // Validate required fields
   if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
   }

   // Check if user already exists
   const existingUser = await db.select().from(users).where(eq(users.username, username));
   if (existingUser.length > 0) {
    return res.status(400).json({ message: "Username already exists" });
   }

   // Hash password
   const hashedPassword = await hashPassword(password);

   // Create new user
   const newUser = await db
    .insert(users)
    .values({
     username,
     password: hashedPassword,
     email: email || null,
     first_name: first_name || null,
     last_name: last_name || null,
     role: role || "salesperson",
     is_active: is_active !== undefined ? is_active : true,
    })
    .returning({
     id: users.id,
     username: users.username,
     email: users.email,
     first_name: users.first_name,
     last_name: users.last_name,
     role: users.role,
     is_active: users.is_active,
     created_at: users.created_at,
     updated_at: users.updated_at,
    });

   res.status(201).json({
    message: "User created successfully",
    user: newUser[0],
   });
  } catch (error) {
   console.error("Create user error:", error);
   res.status(500).json({ message: "Failed to create user" });
  }
 });

 // Update user (admin only)
 app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
   const userId = parseInt(req.params.id);
   const { username, email, first_name, last_name, role, is_active } = req.body;

   // Check if user exists
   const existingUser = await db.select().from(users).where(eq(users.id, userId));
   if (existingUser.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   // If username is being changed, check for conflicts
   if (username && username !== existingUser[0].username) {
    const usernameConflict = await db.select().from(users).where(eq(users.username, username));
    if (usernameConflict.length > 0) {
     return res.status(400).json({ message: "Username already exists" });
    }
   }

   // Update user
   const updatedUser = await db
    .update(users)
    .set({
     username: username || existingUser[0].username,
     email: email !== undefined ? email : existingUser[0].email,
     first_name: first_name !== undefined ? first_name : existingUser[0].first_name,
     last_name: last_name !== undefined ? last_name : existingUser[0].last_name,
     role: role || existingUser[0].role,
     is_active: is_active !== undefined ? is_active : existingUser[0].is_active,
     updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
     id: users.id,
     username: users.username,
     email: users.email,
     first_name: users.first_name,
     last_name: users.last_name,
     role: users.role,
     is_active: users.is_active,
     last_login: users.last_login,
     created_at: users.created_at,
     updated_at: users.updated_at,
    });

   res.json({
    message: "User updated successfully",
    user: updatedUser[0],
   });
  } catch (error) {
   console.error("Update user error:", error);
   res.status(500).json({ message: "Failed to update user" });
  }
 });

 // Reset user password (admin only)
 app.put("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
   const userId = parseInt(req.params.id);
   const { new_password } = req.body;

   // Validate required fields
   if (!new_password) {
    return res.status(400).json({ message: "New password is required" });
   }

   // Check if user exists
   const existingUser = await db.select().from(users).where(eq(users.id, userId));
   if (existingUser.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   // Hash new password
   const hashedPassword = await hashPassword(new_password);

   // Update password
   await db
    .update(users)
    .set({
     password: hashedPassword,
     updated_at: new Date(),
    })
    .where(eq(users.id, userId));

   res.json({ message: "Password reset successfully" });
  } catch (error) {
   console.error("Reset password error:", error);
   res.status(500).json({ message: "Failed to reset password" });
  }
 });

 // Update user (admin only)
 app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
   const userId = parseInt(req.params.id);
   const { username, email, first_name, last_name, role, is_active } = req.body;

   // Check if user exists
   const existingUser = await db.select().from(users).where(eq(users.id, userId));
   if (existingUser.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   // If updating username, check for conflicts
   if (username && username !== existingUser[0].username) {
    const userWithSameUsername = await db.select().from(users).where(eq(users.username, username));
    if (userWithSameUsername.length > 0) {
     return res.status(400).json({ message: "Username already exists" });
    }
   }

   // If updating email, check for conflicts
   if (email && email !== existingUser[0].email) {
    const userWithSameEmail = await db.select().from(users).where(eq(users.email, email));
    if (userWithSameEmail.length > 0) {
     return res.status(400).json({ message: "Email already exists" });
    }
   }

   // Update user
   const updatedUser = await db
    .update(users)
    .set({
     ...(username && { username }),
     ...(email && { email }),
     ...(first_name && { first_name }),
     ...(last_name && { last_name }),
     ...(role && { role }),
     ...(is_active !== undefined && { is_active }),
     updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
     id: users.id,
     username: users.username,
     email: users.email,
     first_name: users.first_name,
     last_name: users.last_name,
     role: users.role,
     is_active: users.is_active,
     last_login: users.last_login,
     created_at: users.created_at,
     updated_at: users.updated_at,
    });

   res.json({
    message: "User updated successfully",
    user: updatedUser[0],
   });
  } catch (error) {
   console.error("Update user error:", error);
   res.status(500).json({ message: "Failed to update user" });
  }
 });

 // Delete user (admin only)
 app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
   const userId = parseInt(req.params.id);

   // Prevent admin from deleting themselves
   if (req.session.user && req.session.user.id === userId) {
    return res.status(400).json({ message: "Cannot delete your own account" });
   }

   // Prevent deletion of system user
   const userToDelete = await db.select().from(users).where(eq(users.id, userId));
   if (userToDelete.length > 0 && userToDelete[0].username === "system") {
    return res.status(400).json({ message: "Cannot delete system user" });
   }

   // Check if user exists
   const existingUser = await db.select().from(users).where(eq(users.id, userId));
   if (existingUser.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   // Handle foreign key constraints by reassigning or deleting related records
   // First, find or create a system user to reassign interactions to
   let systemUser = await db.select().from(users).where(eq(users.username, "system"));
   if (systemUser.length === 0) {
    // Create a system user if it doesn't exist
    systemUser = await db
     .insert(users)
     .values({
      username: "system",
      password: await bcrypt.hash("system", 10),
      email: "system@autolab.com",
      first_name: "System",
      last_name: "User",
      role: "admin",
      is_active: false,
     })
     .returning();
   }

   // Reassign or delete interactions
   const userInteractions = await db.select().from(interactions).where(eq(interactions.user_id, userId));
   if (userInteractions.length > 0) {
    if (systemUser[0].id === userId) {
     // If deleting system user, delete its interactions
     await db.delete(interactions).where(eq(interactions.user_id, userId));
    } else {
     // Otherwise reassign to system user
     await db.update(interactions).set({ user_id: systemUser[0].id }).where(eq(interactions.user_id, userId));
    }
   }

   // Reassign job relationships to system user
   await db.update(jobs).set({ assigned_to_id: systemUser[0].id }).where(eq(jobs.assigned_to_id, userId));

   await db.update(jobs).set({ created_by_id: systemUser[0].id }).where(eq(jobs.created_by_id, userId));

   await db.update(jobs).set({ supervisor_id: systemUser[0].id }).where(eq(jobs.supervisor_id, userId));

   await db
    .update(jobs)
    .set({ quality_check_by_id: systemUser[0].id })
    .where(eq(jobs.quality_check_by_id, userId));

   // Reassign task relationships to system user
   await db.update(tasks).set({ assignedToId: systemUser[0].id }).where(eq(tasks.assignedToId, userId));

   await db.update(tasks).set({ createdById: systemUser[0].id }).where(eq(tasks.createdById, userId));

   // Delete the user
   await db.delete(users).where(eq(users.id, userId));
   res.json({ message: "User deleted successfully" });
  } catch (error) {
   console.error("Delete user error:", error);
   res.status(500).json({ message: "Failed to delete user" });
  }
 });

 // Toggle user active status (admin only)
 app.put("/api/admin/users/:id/toggle-status", requireAdmin, async (req, res) => {
  try {
   const userId = parseInt(req.params.id);

   // Prevent admin from deactivating themselves
   if (req.session.user && req.session.user.id === userId) {
    return res.status(400).json({ message: "Cannot deactivate your own account" });
   }

   // Check if user exists
   const existingUser = await db.select().from(users).where(eq(users.id, userId));
   if (existingUser.length === 0) {
    return res.status(404).json({ message: "User not found" });
   }

   // Toggle active status
   const updatedUser = await db
    .update(users)
    .set({
     is_active: !existingUser[0].is_active,
     updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
     id: users.id,
     username: users.username,
     email: users.email,
     first_name: users.first_name,
     last_name: users.last_name,
     role: users.role,
     is_active: users.is_active,
     last_login: users.last_login,
     created_at: users.created_at,
     updated_at: users.updated_at,
    });

   res.json({
    message: `User ${updatedUser[0].is_active ? "activated" : "deactivated"} successfully`,
    user: updatedUser[0],
   });
  } catch (error) {
   console.error("Toggle user status error:", error);
   res.status(500).json({ message: "Failed to toggle user status" });
  }
 });
}

// Middleware to check if user is authenticated
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
 // Allow internal service calls from DealerGPT
 if ((req as any).get && (req as any).get("x-internal-service") === "true") {
  // Create a system user for internal calls
  req.user = {
   id: 1,
   username: "system",
   role: "admin",
   email: null,
   first_name: null,
   last_name: null,
   profile_image_url: null,
   is_active: true,
   last_login: null,
   created_at: null,
   updated_at: null,
  };
  return next();
 }

 if (!req.session.user) {
  return res.status(401).json({ message: "Authentication required" });
 }
 req.user = req.session.user;
 next();
}

// Middleware to check if user has admin role
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
 if (!req.session.user || req.session.user.role !== "admin") {
  return res.status(403).json({ message: "Admin access required" });
 }
 req.user = req.session.user;
 next();
}

// Middleware to check if user has admin or manager role
export function requireManager(req: AuthenticatedRequest, res: Response, next: NextFunction) {
 if (!req.session.user || !["admin", "manager"].includes(req.session.user.role)) {
  return res.status(403).json({ message: "Manager access required" });
 }
 req.user = req.session.user;
 next();
}

export function requirePermission(pageKey: string) {
 return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.session.user;
  if (!user) {
   return res.status(401).json({ message: "Authentication required" });
  }

  // Admin has access to everything
  if (user.role === "admin") {
   req.user = user;
   return next();
  }

  try {
   const permissions = await storage.getUserPermissions(user.id);
   const permission = permissions.find(p => p.page_key === pageKey);

   // Check if permission exists and is not hidden
   if (!permission || permission.permission_level === "hidden") {
    return res.status(403).json({ message: "Access denied: insufficient permissions" });
   }

   req.user = user;
   next();
  } catch (error) {
   console.error("Permission check error:", error);
   res.status(500).json({ message: "Permission check failed" });
  }
 };
}
