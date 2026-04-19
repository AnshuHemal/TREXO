-- AlterTable: add customFieldsConfig to projects
ALTER TABLE "projects" ADD COLUMN "customFieldsConfig" JSONB;

-- AlterTable: add customFields to issues
ALTER TABLE "issues" ADD COLUMN "customFields" JSONB;
