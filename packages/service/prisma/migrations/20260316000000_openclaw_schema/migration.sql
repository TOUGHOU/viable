-- OpenClaw Control UI schema: drop old tables, create users, templates, projects, versions, version_diffs, chat_messages
PRAGMA foreign_keys=off;

-- DropTable
DROP TABLE IF EXISTS "conversations";
DROP TABLE IF EXISTS "messages";

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" INTEGER NOT NULL,
    "lastSeenAt" INTEGER NOT NULL,
    "projectLimit" INTEGER NOT NULL DEFAULT 1,
    "yn" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" INTEGER
);

-- CreateTable templates
CREATE TABLE "templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "thumbnail" TEXT,
    "starterFiles" TEXT,
    "prompt" TEXT,
    "isPublic" INTEGER NOT NULL DEFAULT 1,
    "createdAt" INTEGER NOT NULL,
    "yn" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" INTEGER
);

-- CreateTable projects (without currentVersionId to avoid circular FK; add after versions)
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT,
    "framework" TEXT NOT NULL DEFAULT 'react',
    "styling" TEXT NOT NULL DEFAULT 'tailwind',
    "currentVersionId" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "yn" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" INTEGER,
    "hasPreview" BOOLEAN NOT NULL DEFAULT false,
    "previewPort" INTEGER,
    "previewUrl" TEXT,
    "sandboxId" TEXT,
    "previewStatus" TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "projects_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable versions
CREATE TABLE "versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "baseVersionId" TEXT,
    "prompt" TEXT NOT NULL,
    "aiResponse" TEXT,
    "label" TEXT,
    "hasFullSnapshot" INTEGER NOT NULL DEFAULT 0,
    "createdAt" INTEGER NOT NULL,
    "yn" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" INTEGER,
    CONSTRAINT "versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "versions_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Add FK from projects.currentVersionId to versions (SQLite: recreate projects with FK)
-- SQLite does not support ADD CONSTRAINT; we leave currentVersionId without FK in DB, Prisma schema still has the relation for ORM
-- So no change needed; currentVersionId is just a column.

-- CreateTable version_diffs
CREATE TABLE "version_diffs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "createdAt" INTEGER NOT NULL,
    "yn" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" INTEGER,
    CONSTRAINT "version_diffs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "versions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable chat_messages
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "parentId" TEXT,
    "role" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "contentText" TEXT,
    "contentJson" TEXT,
    "metadata" TEXT,
    "versionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "yn" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" INTEGER,
    CONSTRAINT "chat_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "users_lastSeenAt_idx" ON "users"("lastSeenAt");
CREATE INDEX "users_yn_idx" ON "users"("yn");
CREATE INDEX "templates_category_idx" ON "templates"("category");
CREATE INDEX "templates_isPublic_idx" ON "templates"("isPublic");
CREATE INDEX "templates_yn_idx" ON "templates"("yn");
CREATE INDEX "projects_userId_idx" ON "projects"("userId");
CREATE INDEX "projects_templateId_idx" ON "projects"("templateId");
CREATE INDEX "projects_yn_idx" ON "projects"("yn");
CREATE INDEX "projects_userId_yn_idx" ON "projects"("userId", "yn");
CREATE INDEX "versions_projectId_idx" ON "versions"("projectId");
CREATE INDEX "versions_createdAt_idx" ON "versions"("createdAt");
CREATE INDEX "versions_yn_idx" ON "versions"("yn");
CREATE UNIQUE INDEX "versions_projectId_versionNumber_key" ON "versions"("projectId", "versionNumber");
CREATE INDEX "version_diffs_yn_idx" ON "version_diffs"("yn");
CREATE UNIQUE INDEX "version_diffs_versionId_key" ON "version_diffs"("versionId");
CREATE INDEX "chat_messages_projectId_idx" ON "chat_messages"("projectId");
CREATE INDEX "chat_messages_projectId_createdAt_idx" ON "chat_messages"("projectId", "createdAt");
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");
CREATE INDEX "chat_messages_parentId_idx" ON "chat_messages"("parentId");
CREATE INDEX "chat_messages_versionId_idx" ON "chat_messages"("versionId");
CREATE INDEX "chat_messages_yn_idx" ON "chat_messages"("yn");

PRAGMA foreign_keys=on;
