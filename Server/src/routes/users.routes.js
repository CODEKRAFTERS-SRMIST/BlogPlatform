import express from "express";
import * as authController from "../controllers/auth.controller.js";
import * as interactionController from "../controllers/interaction.controller.js";
import { registrationLimiter, tokenLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", registrationLimiter, authController.register);
router.post("/set-password", tokenLimiter, authController.setPassword);
router.post("/verify-email", tokenLimiter, authController.verifyEmail);
router.post("/forgot-password", tokenLimiter, authController.requestPasswordReset);
router.get("/:userId/stats", interactionController.getPublicUserStats);

export default router;
