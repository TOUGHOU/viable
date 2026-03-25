-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
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
    CONSTRAINT "projects_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("createdAt", "currentVersionId", "deletedAt", "description", "framework", "hasPreview", "id", "name", "previewPort", "previewStatus", "previewUrl", "sandboxId", "styling", "templateId", "updatedAt", "userId", "yn") SELECT "createdAt", "currentVersionId", "deletedAt", "description", "framework", "hasPreview", "id", "name", "previewPort", "previewStatus", "previewUrl", "sandboxId", "styling", "templateId", "updatedAt", "userId", "yn" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE INDEX "projects_userId_idx" ON "projects"("userId");
CREATE INDEX "projects_templateId_idx" ON "projects"("templateId");
CREATE INDEX "projects_yn_idx" ON "projects"("yn");
CREATE INDEX "projects_userId_yn_idx" ON "projects"("userId", "yn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
