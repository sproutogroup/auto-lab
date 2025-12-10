import dotenv from "dotenv";
dotenv.config();

import { Pool as PgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Check if we're using Neon or local PostgreSQL
const isNeon = process.env.DATABASE_URL.includes('neon.tech') || process.env.USE_NEON === 'true';

let pool: any;
let db: any;

if (isNeon) {
  // Production: Use Neon serverless
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
  console.log("✓ Using Neon serverless database");
} else {
  // Local: Use standard PostgreSQL
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg({ client: pool, schema });
  console.log("✓ Using local PostgreSQL database");
}

export { pool, db };

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
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database error in ${operationName}:`, error);
    throw new Error(
      `Database operation failed: ${operationName}${
        error instanceof Error ? ` - ${error.message}` : ""
      }`
    );
  }
}