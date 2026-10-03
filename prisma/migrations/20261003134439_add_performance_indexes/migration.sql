-- CreateIndex
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_parentId_createdAt_idx" ON "comments"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_status_createdAt_idx" ON "posts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "posts_organizationId_createdAt_idx" ON "posts"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_authorId_createdAt_idx" ON "posts"("authorId", "createdAt");
