import { Router } from "express";
import upload from "../middleware/upload.js";
import { uploadFile, isR2Configured, missingR2Vars, canUseLocalFallback } from "../services/r2.service.js";
import { authenticate } from "../middleware/auth.js";
import { generalLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post(
  "/upload",
  authenticate,
  generalLimiter,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        const tooBig = err.code === "LIMIT_FILE_SIZE";
        return res.status(tooBig ? 413 : 400).json({
          success: false,
          error: {
            code: tooBig ? "FILE_TOO_LARGE" : "UPLOAD_REJECTED",
            message: tooBig
              ? "That image is over the 5 MB limit. Pick a smaller one."
              : err.message,
          },
        });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: "No image file provided" },
      });
    }

    try {
      const url = await uploadFile(req.file);
      res.json({ success: true, data: { url } });
    } catch (error) {
      // Say which variables are missing rather than a flat "failed": a bare
      // message here is what made a pure configuration problem look like a
      // code bug when uploading locally.
      if (error.code === "STORAGE_NOT_CONFIGURED") {
        console.error(
          `Image upload unavailable: missing ${missingR2Vars().join(", ")}`,
        );
        return res.status(503).json({
          success: false,
          error: {
            code: "STORAGE_NOT_CONFIGURED",
            message:
              "Image uploads are not configured on the server. Please contact an admin.",
          },
        });
      }

      console.error("Image upload failed:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: "Could not save the image. Please try again.",
        },
      });
    }
  },
);

export default router;
