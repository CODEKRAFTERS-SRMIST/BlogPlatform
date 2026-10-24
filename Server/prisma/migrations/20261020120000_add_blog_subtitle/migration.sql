-- Adds the blog subtitle. Written to be safe to re-run: the column may already
-- have been added by hand on databases that were built with `prisma db push`.
ALTER TABLE "Blog" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
