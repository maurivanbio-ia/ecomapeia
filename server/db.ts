import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;

// If no DATABASE_URL, create mock objects so the rest of the server still loads.
// The actual data operations will use MemStorage instead.
export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : ({
      connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
      query: async () => ({ rows: [] }),
      end: async () => {},
    } as any);

export const db = DATABASE_URL
  ? drizzle(pool as Pool, { schema })
  : ({
      select: () => ({ from: () => ({ where: async () => [] }) }),
      insert: () => ({ values: () => ({ returning: async () => [] }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
      delete: () => ({ where: async () => [] }),
    } as any);

