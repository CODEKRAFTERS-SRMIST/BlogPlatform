import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import registerRoutes from "./routes/index.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";
import uploadRoute from "./routes/upload.routes.js";
import "./config/env.js";

dotenv.config();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:", process.env.R2_PUBLIC_URL].filter(Boolean),
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(generalLimiter);

// Serves the images written by the local-disk fallback in r2.service.js, used
// when R2 is not configured (a plain checkout). With R2 configured this
// directory stays empty and nothing is served from it.
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "uploads"), {
    maxAge: "7d",
    fallthrough: true,
  }),
);

app.use("/api", uploadRoute);

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.get("/", (req, res) => res.json({ ok: true, message: "Backend API Working" }));
app.get('/health', async (req, res) => {
  try {
    const prisma = (await import('./db/db.js')).default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: error.message, timestamp: new Date().toISOString() });
  }
});

registerRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
