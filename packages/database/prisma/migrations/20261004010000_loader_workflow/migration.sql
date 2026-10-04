CREATE TYPE "LoadSessionStatus" AS ENUM ('LOADING', 'CONFIRMED', 'REVERIFY_REQUIRED');
CREATE TYPE "LoadIssueType" AS ENUM ('MISSING', 'DAMAGED');

ALTER TABLE "LoadIssue"
  ADD COLUMN "orderLineId" TEXT,
  ADD COLUMN "lineKey" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "type" "LoadIssueType" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "photoName" TEXT,
  ADD COLUMN "photoMimeType" TEXT,
  ADD COLUMN "photoData" BYTEA,
  ADD COLUMN "withdrawnAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "LoadSession" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "planVersion" INTEGER NOT NULL,
  "vehicleIdSnapshot" TEXT NOT NULL,
  "status" "LoadSessionStatus" NOT NULL DEFAULT 'LOADING',
  "loadingOrderAcknowledgedAt" TIMESTAMP(3) NOT NULL,
  "reeferTemperatureC" DECIMAL(5,2),
  "reeferConfirmedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "confirmedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoadSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoadLine" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "lineKey" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "orderLineId" TEXT,
  "plannedQuantity" INTEGER NOT NULL,
  "loadedQuantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoadLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoadSession_tripId_key" ON "LoadSession"("tripId");
CREATE INDEX "LoadSession_status_updatedAt_idx" ON "LoadSession"("status", "updatedAt");
CREATE UNIQUE INDEX "LoadLine_sessionId_lineKey_key" ON "LoadLine"("sessionId", "lineKey");
CREATE INDEX "LoadLine_orderId_idx" ON "LoadLine"("orderId");
CREATE INDEX "LoadIssue_tripId_lineKey_withdrawnAt_idx" ON "LoadIssue"("tripId", "lineKey", "withdrawnAt");

ALTER TABLE "LoadSession" ADD CONSTRAINT "LoadSession_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadSession" ADD CONSTRAINT "LoadSession_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoadLine" ADD CONSTRAINT "LoadLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LoadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadLine" ADD CONSTRAINT "LoadLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadLine" ADD CONSTRAINT "LoadLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoadIssue" ADD CONSTRAINT "LoadIssue_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
