-- AlterTable
ALTER TABLE "field_operations" ADD COLUMN     "auravantUuid" TEXT,
ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'johndeere',
ADD COLUMN     "herdUuid" TEXT,
ADD COLUMN     "labourTypeId" INTEGER,
ADD COLUMN     "paddockId" INTEGER,
ADD COLUMN     "status" INTEGER,
ADD COLUMN     "workOrderUuid" TEXT,
ADD COLUMN     "yeargroup" INTEGER,
ALTER COLUMN "johnDeereFieldId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auravantConnected" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "auravant_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "extensionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "auravant_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livestock_herds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "herdUuid" TEXT NOT NULL,
    "herdName" TEXT NOT NULL,
    "animalCount" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "weightUnit" TEXT NOT NULL DEFAULT 'Kg',
    "typeId" INTEGER NOT NULL,
    "paddockId" INTEGER,
    "fieldId" INTEGER,
    "farmId" INTEGER,
    "dataSource" TEXT NOT NULL DEFAULT 'auravant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livestock_herds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workOrderUuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yeargroup" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "recommendations" JSONB,
    "labourOperations" TEXT[],
    "dataSource" TEXT NOT NULL DEFAULT 'auravant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auravant_tokens_userId_key" ON "auravant_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "livestock_herds_herdUuid_key" ON "livestock_herds"("herdUuid");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_workOrderUuid_key" ON "work_orders"("workOrderUuid");

-- AddForeignKey
ALTER TABLE "auravant_tokens" ADD CONSTRAINT "auravant_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livestock_herds" ADD CONSTRAINT "livestock_herds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
