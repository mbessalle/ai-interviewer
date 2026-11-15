-- Interviews created with the same name used to share one link name, and the link opened
-- whichever came first. Keep the oldest as it is and number the later ones (-2, -3, ...).
UPDATE "interview" AS i
SET "readable_slug" = i."readable_slug" || '-' || d.n
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "readable_slug" ORDER BY "created_at", "id") AS n
  FROM "interview"
  WHERE "readable_slug" IS NOT NULL
) AS d
WHERE i."id" = d."id" AND d.n > 1;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_readable_slug_unique" UNIQUE("readable_slug");