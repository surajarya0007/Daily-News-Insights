CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "ArticleChunk" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ArticleChunk_articleId_idx" ON "ArticleChunk"("articleId");
CREATE INDEX IF NOT EXISTS "ArticleChunk_type_idx" ON "ArticleChunk"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleChunk_articleId_type_position_key" ON "ArticleChunk"("articleId", "type", "position");

ALTER TABLE "ArticleChunk"
  ADD CONSTRAINT "ArticleChunk_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
