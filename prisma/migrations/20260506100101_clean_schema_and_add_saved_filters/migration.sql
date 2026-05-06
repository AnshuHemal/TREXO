/*
  Warnings:

  - You are about to drop the column `theme` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "issue_templates" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "theme";

-- AddForeignKey
ALTER TABLE "issue_templates" ADD CONSTRAINT "issue_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
