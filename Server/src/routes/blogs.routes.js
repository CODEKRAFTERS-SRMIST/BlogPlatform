import express from "express";
import * as blogsController from "../controllers/blogs.controller.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { ensureMember } from "../middleware/role.js";

const router = express.Router();

// Public endpoints (optional auth - user info attached if token present)
router.get("/public", optionalAuth, blogsController.getPublicBlogs);
router.get("/public/:id", optionalAuth, blogsController.getPublicBlogById);

// Member endpoints (require auth + member role)
router.use(authenticate);
router.post("/", ensureMember, blogsController.createDraft);
router.patch("/:id", ensureMember, blogsController.editDraft);
router.delete("/:id", ensureMember, blogsController.deleteDraft);
router.post("/:id/submit", ensureMember, blogsController.submitForReview);
router.get("/my", ensureMember, blogsController.getMyBlogs);

export default router;
