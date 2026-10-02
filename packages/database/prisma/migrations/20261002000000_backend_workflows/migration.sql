CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'PLAN', 'LOAD', 'DELIVERY', 'ISSUE', 'SYSTEM');
CREATE TYPE "ProofType" AS ENUM ('PHOTO', 'SIGNATURE');
CREATE TYPE "DeliveryOutcome" AS ENUM ('DELIVERED', 'CANNOT_DELIVER');
CREATE TYPE "SyncOperationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'CONFLICT', 'FAILED');

ALTER TABLE "IssueCase" ADD COLUMN "openedById" TEXT;

CREATE TABLE "IssueEvent" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "from" "IssueStatus",
  "to" "IssueStatus" NOT NULL,
  "note" TEXT,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProofAsset" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "capturedById" TEXT,
  "type" "ProofType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProofAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DeliveryOutcomeRecord" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "outcome" "DeliveryOutcome" NOT NULL,
  "receiverName" TEXT,
  "note" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryOutcomeRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReceiptRecord" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "confirmedById" TEXT NOT NULL,
  "expectedUnits" INTEGER NOT NULL,
  "receivedUnits" INTEGER NOT NULL,
  "outcome" TEXT NOT NULL,
  "note" TEXT,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SyncOperation" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "status" "SyncOperationStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "serverPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SyncConflict" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "localPayload" JSONB NOT NULL,
  "serverPayload" JSONB NOT NULL,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SyncConflict_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LoadIssue" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "issueId" TEXT,
  "summary" TEXT NOT NULL,
  "quantity" INTEGER,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoadIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryOutcomeRecord_orderId_key" ON "DeliveryOutcomeRecord"("orderId");
CREATE UNIQUE INDEX "ReceiptRecord_orderId_key" ON "ReceiptRecord"("orderId");
CREATE UNIQUE INDEX "SyncOperation_operationId_key" ON "SyncOperation"("operationId");
CREATE UNIQUE INDEX "SyncConflict_operationId_key" ON "SyncConflict"("operationId");
CREATE UNIQUE INDEX "LoadIssue_issueId_key" ON "LoadIssue"("issueId");
CREATE INDEX "IssueEvent_issueId_createdAt_idx" ON "IssueEvent"("issueId", "createdAt");
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "ProofAsset_orderId_createdAt_idx" ON "ProofAsset"("orderId", "createdAt");
CREATE INDEX "SyncOperation_accountId_status_createdAt_idx" ON "SyncOperation"("accountId", "status", "createdAt");
CREATE INDEX "LoadIssue_tripId_createdAt_idx" ON "LoadIssue"("tripId", "createdAt");
CREATE INDEX "LoadIssue_orderId_createdAt_idx" ON "LoadIssue"("orderId", "createdAt");

ALTER TABLE "IssueCase" ADD CONSTRAINT "IssueCase_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IssueEvent" ADD CONSTRAINT "IssueEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "IssueCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueEvent" ADD CONSTRAINT "IssueEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProofAsset" ADD CONSTRAINT "ProofAsset_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProofAsset" ADD CONSTRAINT "ProofAsset_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryOutcomeRecord" ADD CONSTRAINT "DeliveryOutcomeRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryOutcomeRecord" ADD CONSTRAINT "DeliveryOutcomeRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptRecord" ADD CONSTRAINT "ReceiptRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceiptRecord" ADD CONSTRAINT "ReceiptRecord_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncConflict" ADD CONSTRAINT "SyncConflict_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "SyncOperation"("operationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadIssue" ADD CONSTRAINT "LoadIssue_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadIssue" ADD CONSTRAINT "LoadIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoadIssue" ADD CONSTRAINT "LoadIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "IssueCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoadIssue" ADD CONSTRAINT "LoadIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;