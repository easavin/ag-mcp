-- AlterTable
ALTER TABLE "users" ADD COLUMN     "satshotConnected" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "satshot_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "username" TEXT,
    "server" TEXT NOT NULL DEFAULT 'us',
    "expiresAt" TIMESTAMP(3),
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "satshot_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "satshot_tokens_userId_key" ON "satshot_tokens"("userId");

-- CreateIndex
CREATE INDEX "chat_sessions_userId_idx" ON "chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "messages_sessionId_idx" ON "messages"("sessionId");

-- CreateIndex
CREATE INDEX "messages_sessionId_createdAt_idx" ON "messages"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "satshot_tokens" ADD CONSTRAINT "satshot_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
