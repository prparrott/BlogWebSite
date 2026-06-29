import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";

const defaultLocalDatabaseUrl = "file:db/blog.db";
const databaseUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  defaultLocalDatabaseUrl;

if (databaseUrl.startsWith("file:")) {
  const databasePath = databaseUrl.replace(/^file:/, "") || "db/blog.db";
  mkdirSync(dirname(resolve(databasePath)), { recursive: true });
}

export const client = createClient({
  url: databaseUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });
