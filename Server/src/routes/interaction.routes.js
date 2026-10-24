import express from "express";
import * as interactionController from "../controllers/interaction.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { ensureMember } from "../middleware/role.js";

const router = express.Router();

// Public routes (optional auth - user info attached if token present)
router.get("/likes/:blogId", optionalAuth, interactionController.getLikes);
router.get("/comments/:blogId", interactionController.getComments);
router.get("/stats/platform", interactionController.getPlatformStats);

/*
 * Writing needs an account in good standing, not merely a valid token.
 *
 * These three had `authenticate` alone, which only proves the token parses
 * and has not been revoked - it says nothing about who that account is now.
 * Reading stays as it was: the lists above are public, and a signed-out
 * visitor can see them.
 */
router.post("/like/:blogId", authenticate, ensureMember, interactionController.toggleLike);
router.post("/comment/:blogId", authenticate, ensureMember, interactionController.addComment);
router.delete("/comment/:commentId", authenticate, ensureMember, interactionController.deleteComment);

// User stats (auth required)
router.get("/users/me/stats", authenticate, interactionController.getUserStats);

export default router;
