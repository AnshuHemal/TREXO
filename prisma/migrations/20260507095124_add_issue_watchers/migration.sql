-- CreateTable
CREATE TABLE "issue_watchers" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_watchers_issueId_idx" ON "issue_watchers"("issueId");

-- CreateIndex
CREATE INDEX "issue_watchers_userId_idx" ON "issue_watchers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "issue_watchers_issueId_userId_key" ON "issue_watchers"("issueId", "userId");

-- AddForeignKey
ALTER TABLE "issue_watchers" ADD CONSTRAINT "issue_watchers_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_watchers" ADD CONSTRAINT "issue_watchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
