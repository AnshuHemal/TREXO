-- AlterTable: add theme column with default "system"
ALTER TABLE "users" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';
