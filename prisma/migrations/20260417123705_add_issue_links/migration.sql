-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('BLOCKS', 'BLOCKED_BY', 'DUPLICATES', 'RELATES_TO');

-- CreateTable
CREATE TABLE "issue_links" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "LinkType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issue_links_sourceId_targetId_type_key" ON "issue_links"("sourceId", "targetId", "type");

-- AddForeignKey
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
