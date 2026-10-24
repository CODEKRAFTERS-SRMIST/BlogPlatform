import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

/**
 * Where uploaded images go.
 *
 * Cloudflare R2 is the real destination, but it needs five environment
 * variables and a local checkout usually has none of them - which is why
 * picking an image locally failed with a bare "Failed to upload image". When
 * R2 is not configured we now write to Server/uploads instead and serve it
 * from /uploads, so the feature works end to end on a laptop. Production has
 * the variables set and never touches that path.
 */
const REQUIRED_R2_VARS = [
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

export function missingR2Vars() {
  return REQUIRED_R2_VARS.filter((name) => !process.env[name]);
}

export function isR2Configured() {
  return missingR2Vars().length === 0;
}

/** Local disk is only acceptable off production. */
export function canUseLocalFallback() {
  return process.env.NODE_ENV !== "production";
}

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

function safeExtension(file) {
  const fromName = path.extname(file.originalname || "").toLowerCase();
  if (/^\.(jpe?g|png|webp|gif|avif)$/.test(fromName)) return fromName;

  // Trust the declared type when the filename carries nothing usable.
  const fromMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  }[file.mimetype];

  return fromMime || ".jpg";
}

async function uploadToLocalDisk(file, folder) {
  const dir = path.join(LOCAL_UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });

  const name = `${uuidv4()}${safeExtension(file)}`;
  await fs.writeFile(path.join(dir, name), file.buffer);

  // Relative on purpose: the browser resolves it against whatever host it is
  // talking to, so the same URL works through the Next proxy and directly.
  return `/uploads/${folder}/${name}`;
}

export async function uploadFile(file, folder = "blogs") {
  if (!isR2Configured()) {
    if (canUseLocalFallback()) {
      console.warn(
        `[upload] R2 is not configured (missing ${missingR2Vars().join(", ")}). ` +
          `Saving to ${LOCAL_UPLOAD_DIR} and serving from /uploads instead.`,
      );
      return uploadToLocalDisk(file, folder);
    }

    const err = new Error(
      `Image storage is not configured on the server: missing ${missingR2Vars().join(", ")}.`,
    );
    err.code = "STORAGE_NOT_CONFIGURED";
    throw err;
  }

  const key = `${folder}/${uuidv4()}${safeExtension(file)}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await getS3Client().send(command);

  // Trailing slashes in R2_PUBLIC_URL would otherwise produce a double slash,
  // which some CDNs treat as a different (missing) object.
  const base = String(process.env.R2_PUBLIC_URL).replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function deleteFile(url) {
  if (!url) return;

  // Locally stored files are removed from disk, not from the bucket.
  if (url.startsWith("/uploads/")) {
    const relative = url.replace(/^\/uploads\//, "");
    const target = path.resolve(LOCAL_UPLOAD_DIR, relative);
    // Never let a crafted URL escape the uploads directory.
    if (!target.startsWith(LOCAL_UPLOAD_DIR)) return;
    await fs.rm(target, { force: true });
    return;
  }

  if (!isR2Configured()) return;

  const base = String(process.env.R2_PUBLIC_URL).replace(/\/+$/, "");
  const key = url.replace(`${base}/`, "");
  if (!key || key === url) return;

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  await getS3Client().send(command);
}
