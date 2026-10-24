import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

// Open SQLite database file
const sqlite = new Database("prisma/dev.db");

// Create Prisma adapter
const adapter = new PrismaBetterSqlite3(sqlite);

// Create Prisma Client
const prisma = new PrismaClient({
  adapter,
});

export default prisma;
