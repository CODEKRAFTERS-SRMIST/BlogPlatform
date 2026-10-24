import app from "./app.js";
import { logger } from "./utils/logger.js";
import "./config/env.js";

// Matches the Next proxy default in client/next.config.ts.
const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason) => {
  logger.error("FATAL: Unhandled Rejection", { reason: reason?.toString() });
});

process.on("uncaughtException", (error) => {
  logger.error("FATAL: Uncaught Exception", { message: error.message, stack: error.stack });
  process.exit(1);
});

app.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`)); // triggered restart
