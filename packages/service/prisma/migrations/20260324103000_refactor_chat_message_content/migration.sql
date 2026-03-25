PRAGMA foreign_keys=OFF;

CREATE TABLE "_chat_messages_legacy" AS
SELECT * FROM "chat_messages";

CREATE TABLE "new_chat_messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "parentId" TEXT,
  "role" TEXT NOT NULL,
  "messageType" TEXT NOT NULL DEFAULT 'text',
  "contentText" TEXT,
  "contentParts" TEXT,
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

INSERT INTO "new_chat_messages" (
  "id",
  "projectId",
  "conversationId",
  "parentId",
  "role",
  "messageType",
  "contentText",
  "contentParts",
  "metadata",
  "versionId",
  "status",
  "createdAt",
  "updatedAt",
  "yn",
  "deletedAt"
)
SELECT
  "id",
  "projectId",
  "conversationId",
  "parentId",
  "role",
  "messageType",
  "contentText",
  CASE
    WHEN "messageType" = 'parts' THEN "contentJson"
    ELSE NULL
  END,
  "metadata",
  "versionId",
  "status",
  "createdAt",
  "updatedAt",
  "yn",
  "deletedAt"
FROM "chat_messages";

DROP TABLE "chat_messages";
ALTER TABLE "new_chat_messages" RENAME TO "chat_messages";

CREATE INDEX "chat_messages_projectId_idx" ON "chat_messages"("projectId");
CREATE INDEX "chat_messages_projectId_createdAt_idx" ON "chat_messages"("projectId", "createdAt");
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");
CREATE INDEX "chat_messages_parentId_idx" ON "chat_messages"("parentId");
CREATE INDEX "chat_messages_versionId_idx" ON "chat_messages"("versionId");
CREATE INDEX "chat_messages_yn_idx" ON "chat_messages"("yn");

CREATE TABLE "chat_message_tool_calls" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "toolCallId" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "argumentsJson" TEXT,
  "success" BOOLEAN NOT NULL,
  "resultSummary" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  CONSTRAINT "chat_message_tool_calls_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "chat_message_tool_calls_messageId_idx" ON "chat_message_tool_calls"("messageId");
CREATE INDEX "chat_message_tool_calls_messageId_createdAt_idx" ON "chat_message_tool_calls"("messageId", "createdAt");
CREATE INDEX "chat_message_tool_calls_toolCallId_idx" ON "chat_message_tool_calls"("toolCallId");

INSERT INTO "chat_message_tool_calls" (
  "id",
  "messageId",
  "toolCallId",
  "toolName",
  "argumentsJson",
  "success",
  "resultSummary",
  "createdAt",
  "updatedAt"
)
SELECT
  lower(hex(randomblob(8))),
  m."id",
  json_extract(value, '$.id'),
  json_extract(value, '$.name'),
  json_extract(value, '$.arguments'),
  CASE
    WHEN json_extract(value, '$.success') = 1 OR json_extract(value, '$.success') = 'true' THEN 1
    ELSE 0
  END,
  json_extract(value, '$.resultSummary'),
  m."createdAt",
  m."updatedAt"
FROM "_chat_messages_legacy" AS m, json_each(m."contentJson", '$.toolCalls')
WHERE m."messageType" != 'parts'
  AND m."contentJson" IS NOT NULL
  AND json_type(m."contentJson", '$.toolCalls') = 'array';

DROP TABLE "_chat_messages_legacy";

PRAGMA foreign_keys=ON;
