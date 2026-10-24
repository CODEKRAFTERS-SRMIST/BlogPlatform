import { ShareablePost, getExcerpt } from "./share";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/**
 * Splits text into lines that fit `maxWidth`.
 *
 * Wrapping is word-based, but a single word wider than the line is broken
 * character by character. Without that fallback a long unbroken string (a URL,
 * or "aaaaaaaaaaaaaaaa") counts as one word and runs straight off the canvas
 * instead of flowing onto the next line.
 */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  const flush = () => {
    if (line) {
      lines.push(line);
      line = "";
    }
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;

    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    flush();
    if (lines.length >= maxLines) break;

    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      continue;
    }

    // The word alone is too wide: break it across lines by character.
    let chunk = "";
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxWidth) {
        if (!chunk) break;
        lines.push(chunk);
        chunk = ch;
        if (lines.length >= maxLines) break;
      } else {
        chunk += ch;
      }
    }
    if (lines.length >= maxLines) {
      line = "";
      break;
    }
    line = chunk;
  }

  flush();

  const truncated = lines.length >= maxLines;
  const trimmed = lines.slice(0, maxLines);

  if (truncated && trimmed.length) {
    const last = trimmed[trimmed.length - 1];
    let shortened = last;
    while (shortened && ctx.measureText(`${shortened}...`).width > maxWidth) {
      shortened = shortened.slice(0, -1);
    }
    trimmed[trimmed.length - 1] = `${shortened.trimEnd()}...`;
  }

  return trimmed;
}

/**
 * Loads the cover image so it can be drawn onto the story canvas.
 *
 * The canvas is exported with toBlob(), which the browser refuses on a canvas
 * "tainted" by a cross-origin image, so the image host must send CORS headers.
 * We request it with crossOrigin="anonymous" and then confirm the pixels are
 * readable; a missing CORS header costs us the cover, not the whole image.
 */
export async function loadImageForCanvas(src: string): Promise<HTMLImageElement | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  const loaded = await new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    setTimeout(() => done(false), 6000);
    img.src = src;
  });

  if (!loaded || !img.complete || img.naturalWidth === 0) return null;

  try {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const probeCtx = probe.getContext("2d");
    if (!probeCtx) return null;
    probeCtx.drawImage(img, 0, 0, 1, 1);
    probeCtx.getImageData(0, 0, 1, 1);
  } catch {
    console.warn("Cover image is not CORS-readable; building the card without it:", src);
    return null;
  }

  return img;
}

const FONT = "Inter, Segoe UI, system-ui, sans-serif";

const TITLE_SIZE = 68;
const TITLE_LINE = 84;
const TITLE_MAX_LINES = 3;

const BODY_SIZE = 34;
const BODY_LINE = 48;
const BODY_MAX_LINES = 2;

const MARGIN = 80;
const TEXT_WIDTH = STORY_WIDTH - MARGIN * 2;
const TEXT_BOTTOM = 1726; // text block is bottom-aligned here, above the author row

export interface StoryCardResult {
  blob: Blob;
  coverIncluded: boolean;
}

/**
 * Renders the 9:16 story image. The text block is measured first and laid out
 * from the bottom up, so a long title or summary can never overflow the card.
 */
export async function generateStoryCard(
  post: ShareablePost & { image?: string; coverImage?: string },
  coverUrl?: string,
): Promise<StoryCardResult | null> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  let coverIncluded = false;
  if (coverUrl) {
    const img = await loadImageForCanvas(coverUrl);
    if (img) {
      coverIncluded = true;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = STORY_WIDTH / 1180;
      let sx = 0;
      let sy = 0;
      let sWidth = img.naturalWidth;
      let sHeight = img.naturalHeight;

      if (imgAspect > targetAspect) {
        sWidth = img.naturalHeight * targetAspect;
        sx = (img.naturalWidth - sWidth) / 2;
      } else {
        sHeight = img.naturalWidth / targetAspect;
        sy = (img.naturalHeight - sHeight) / 2;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, STORY_WIDTH, 1180);
    }
  }

  if (!coverIncluded) {
    const grad = ctx.createLinearGradient(0, 0, STORY_WIDTH, 1180);
    grad.addColorStop(0, "#1c1f2b");
    grad.addColorStop(1, "#0b0c10");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STORY_WIDTH, 1180);
    ctx.strokeStyle = "rgba(245, 184, 0, 0.10)";
    ctx.lineWidth = 3;
    ctx.strokeRect(MARGIN + 10, 250, STORY_WIDTH - (MARGIN + 10) * 2, 620);
  }

  // Fade the cover into the solid lower half
  const fade = ctx.createLinearGradient(0, 520, 0, 1190);
  fade.addColorStop(0, "rgba(11, 12, 16, 0)");
  fade.addColorStop(0.55, "rgba(11, 12, 16, 0.86)");
  fade.addColorStop(1, "#0b0c10");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 520, STORY_WIDTH, 670);
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 1185, STORY_WIDTH, STORY_HEIGHT - 1185);

  // Brand mark
  ctx.fillStyle = "#f5b800";
  ctx.fillRect(MARGIN, 96, 10, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 28px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("CODEKRAFTERS", MARGIN + 30, 130);

  // Measure the text block before drawing so it is always bottom-aligned
  ctx.font = `800 ${TITLE_SIZE}px ${FONT}`;
  const titleLines = wrapLines(ctx, post.title || "Untitled", TEXT_WIDTH, TITLE_MAX_LINES);

  const excerpt = getExcerpt(post, 220);
  ctx.font = `400 ${BODY_SIZE}px ${FONT}`;
  const bodyLines = excerpt ? wrapLines(ctx, excerpt, TEXT_WIDTH, BODY_MAX_LINES) : [];

  const titleHeight = titleLines.length * TITLE_LINE;
  const bodyHeight = bodyLines.length * BODY_LINE;
  const gap = bodyLines.length ? 34 : 0;
  const blockTop = TEXT_BOTTOM - (titleHeight + gap + bodyHeight);

  // Accent rule sits just above the title
  ctx.fillStyle = "#f5b800";
  ctx.fillRect(MARGIN, blockTop - 48, 96, 8);

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${TITLE_SIZE}px ${FONT}`;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, MARGIN, blockTop + TITLE_LINE * (i + 1) - 20);
  });

  if (bodyLines.length) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = `400 ${BODY_SIZE}px ${FONT}`;
    const bodyTop = blockTop + titleHeight + gap;
    bodyLines.forEach((line, i) => {
      ctx.fillText(line, MARGIN, bodyTop + BODY_LINE * (i + 1) - 14);
    });
  }

  // Author row
  const authorY = 1822;
  ctx.fillStyle = "#f5b800";
  ctx.beginPath();
  ctx.arc(MARGIN + 24, authorY, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0b0c10";
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText((post.author || "U").charAt(0).toUpperCase(), MARGIN + 24, authorY + 10);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 30px ${FONT}`;
  const authorLines = wrapLines(ctx, post.author || "CodeKrafters", TEXT_WIDTH - 120, 1);
  ctx.fillText(authorLines[0] || "CodeKrafters", MARGIN + 68, authorY + 10);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) return null;

  return { blob, coverIncluded };
}

export function storyFileName(title: string): string {
  const safe = title.replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 30);
  return `codekrafters_${safe || "story"}.png`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** True when this browser can hand an image file to another app. */
export function canShareFile(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function" &&
    navigator.canShare({ files: [file] })
  );
}
