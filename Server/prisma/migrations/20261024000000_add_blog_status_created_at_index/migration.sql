-- The public feed asks for published posts, newest first, a page at a time
-- (status = 'published' ORDER BY created_at DESC LIMIT ...). The separate
-- indexes on status and created_at cannot satisfy that in a single pass; this
-- composite one can. Ascending on purpose: it matches what the schema
-- generates, and Postgres reads a btree backwards for DESC just as happily.
--
-- IF NOT EXISTS so it is safe to re-run on a database where it was added by
-- hand, the same way the subtitle migration is written.
CREATE INDEX IF NOT EXISTS "Blog_status_created_at_idx" ON "Blog"("status", "created_at");
