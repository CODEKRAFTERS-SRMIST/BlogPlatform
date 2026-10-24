/**
 * Shrinks a picked image before it is uploaded.
 *
 * Phone cameras produce 4-12 MB files, which the API rejects at 5 MB (the 413
 * you get when picking a photo straight from a phone). Even when one squeezes
 * under the limit, serving a multi-megabyte cover makes the feed crawl on
 * mobile data. Resizing to a sensible width first solves both: a 1920px cover
 * at quality 0.82 is normally 200-500 KB with no visible loss.
 */

export const MAX_DIMENSION = 1920;
export const TARGET_BYTES = 1.5 * 1024 * 1024;
export const HARD_LIMIT_BYTES = 5 * 1024 * 1024; // must match multer on the server

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export interface CompressResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  wasCompressed: boolean;
}

/**
 * Returns a smaller version of `file`, or the original when it is already small
 * or cannot be processed. Never throws: a failure here must not block posting.
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const unchanged: CompressResult = {
    file,
    originalBytes: file.size,
    compressedBytes: file.size,
    wasCompressed: false,
  };

  // GIFs would lose their animation, and SVGs are already tiny
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return unchanged;
  }

  try {
    const img = await loadImage(file);
    if (!img || !img.naturalWidth) return unchanged;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    // Already small enough and no resize needed
    if (scale === 1 && file.size <= TARGET_BYTES) return unchanged;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Flatten transparency onto white, since JPEG has no alpha channel
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let blob: Blob | null = null;
    for (const quality of [0.82, 0.7, 0.6, 0.5]) {
      blob = await toBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= TARGET_BYTES) break;
    }
    if (!blob) return unchanged;

    // Keep whichever is actually smaller
    if (blob.size >= file.size) return unchanged;

    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    const compressed = new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: compressed,
      originalBytes: file.size,
      compressedBytes: compressed.size,
      wasCompressed: true,
    };
  } catch (err) {
    console.warn("Image compression failed, uploading the original:", err);
    return unchanged;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
