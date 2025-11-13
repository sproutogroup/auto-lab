import dotenv from "dotenv";
dotenv.config();

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
 throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Enhanced database connection with error handling
export async function checkDatabaseConnection(): Promise<{
 connected: boolean;
 error?: string;
}> {
 try {
  await db.execute(sql`SELECT 1`);
  return { connected: true };
 } catch (error) {
  console.error("Database connection error:", error);
  return {
   connected: false,
   error: error instanceof Error ? error.message : "Unknown database error",
  };
 }
}

// Helper function to handle database operations with error handling
export async function withErrorHandling<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
 try {
  return await operation();
 } catch (error) {
  console.error(`Database error in ${operationName}:`, error);
  throw new Error(
   `Database operation failed: ${operationName}${error instanceof Error ? ` - ${error.message}` : ""}`,
  );
 }
}
