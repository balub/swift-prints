-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "stlKey" TEXT NOT NULL,
    "volumeMm3" DOUBLE PRECISION NOT NULL,
    "boundingBoxX" DOUBLE PRECISION NOT NULL,
    "boundingBoxY" DOUBLE PRECISION NOT NULL,
    "boundingBoxZ" DOUBLE PRECISION NOT NULL,
    "needsSupports" BOOLEAN NOT NULL DEFAULT false,
    "baseFilamentEstimateG" DOUBLE PRECISION NOT NULL,
    "basePrintTimeHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentPricing" (
    "id" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "filamentType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerGram" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FilamentPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "filamentId" TEXT NOT NULL,
    "teamNumber" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantEmail" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Upload_createdAt_idx" ON "Upload"("createdAt");

-- CreateIndex
CREATE INDEX "Printer_isActive_idx" ON "Printer"("isActive");

-- CreateIndex
CREATE INDEX "FilamentPricing_printerId_idx" ON "FilamentPricing"("printerId");

-- CreateIndex
CREATE UNIQUE INDEX "FilamentPricing_printerId_filamentType_key" ON "FilamentPricing"("printerId", "filamentType");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_teamNumber_idx" ON "Order"("teamNumber");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- AddForeignKey
ALTER TABLE "FilamentPricing" ADD CONSTRAINT "FilamentPricing_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "FilamentPricing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
