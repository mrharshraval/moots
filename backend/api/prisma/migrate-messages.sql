-- Migration: Update Messages to use senderParticipantId instead of senderId

-- 1. Add new column (nullable initially)
ALTER TABLE "Message" ADD COLUMN "senderParticipantId" TEXT;

-- 2. Backfill senderParticipantId by looking up the Participant for the message's conversation and senderId
UPDATE "Message" m
SET "senderParticipantId" = p.id
FROM "Participant" p
JOIN "Actor" a ON p."actorId" = a.id
WHERE m."conversationId" = p."conversationId"
  AND m."senderId" = a."userId";

-- 3. Delete any messages that could not be mapped (or keep them and assign to a system participant)
DELETE FROM "Message" WHERE "senderParticipantId" IS NULL;

-- 4. Make column NOT NULL
ALTER TABLE "Message" ALTER COLUMN "senderParticipantId" SET NOT NULL;

-- 5. Add Foreign Key constraint
ALTER TABLE "Message" 
ADD CONSTRAINT "Message_senderParticipantId_fkey" 
FOREIGN KEY ("senderParticipantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Drop the old senderId column and its foreign key
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_senderId_fkey";
ALTER TABLE "Message" DROP COLUMN "senderId";
