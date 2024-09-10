ALTER TABLE "embeddings" ADD COLUMN "section" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "title" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "url" varchar(255);