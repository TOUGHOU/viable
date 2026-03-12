-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '新对话',
    "updatedAt" DATETIME NOT NULL,
    "hasPreview" BOOLEAN NOT NULL DEFAULT false,
    "previewPort" INTEGER,
    "previewUrl" TEXT,
    "sandboxId" TEXT,
    "previewStatus" TEXT NOT NULL DEFAULT 'pending',
    "yn" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_conversations" ("hasPreview", "id", "previewPort", "previewStatus", "previewUrl", "sandboxId", "title", "updatedAt") SELECT "hasPreview", "id", "previewPort", "previewStatus", "previewUrl", "sandboxId", "title", "updatedAt" FROM "conversations";
DROP TABLE "conversations";
ALTER TABLE "new_conversations" RENAME TO "conversations";
CREATE TABLE "new_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentFormat" TEXT DEFAULT 'text',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "model" TEXT,
    "metadata" TEXT,
    "yn" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_messages" ("content", "contentFormat", "conversationId", "createdAt", "id", "metadata", "model", "role", "updatedAt") SELECT "content", "contentFormat", "conversationId", "createdAt", "id", "metadata", "model", "role", "updatedAt" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
