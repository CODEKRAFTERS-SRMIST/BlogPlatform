import { PrismaClient } from "@prisma/client";

/**
 * The one Prisma client for the whole server.
 *
 * Query logging is off unless it is asked for. It used to be on permanently,
 * so every statement the app ran - thousands a day - was formatted and
 * written to stdout in production, where nobody reads it. Two things made
 * that worse than merely wasteful: it pushed the errors you actually need
 * out of Render's limited log buffer, and the WHERE clauses carry member
 * email addresses, so the logs collected personal data as a side effect.
 *
 * Set PRISMA_LOG=query in the environment to turn it back on when something
 * needs debugging in place - add the variable, restart, read, remove it
 * again. No code change and no deploy.
 */
const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG === "query" ? ["query", "error"] : ["error"],
});

export default prisma;
