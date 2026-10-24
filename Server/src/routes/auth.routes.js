import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refreshToken);

router.get("/me", authenticate, authController.getCurrentUser);
router.post("/change-password", authenticate, authController.changePassword);
export default router;
