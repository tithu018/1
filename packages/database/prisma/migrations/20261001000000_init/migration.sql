-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STORE_MANAGER', 'DISPATCHER', 'LOADER', 'DRIVER');
CREATE TYPE "Brand" AS ENUM ('FRESH', 'STYLE', 'TECH');
CREATE TYPE "VehicleType" AS ENUM ('TRUCK', 'VAN');
CREATE TYPE "VehicleTemperature" AS ENUM ('AMBIENT', 'REEFER');
CREATE TYPE "OrderStatus" AS ENUM ('SUBMITTED', 'CONFIRMED', 'ALLOCATED', 'LOADED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DEFERRED', 'CANCELLED');
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
CREATE TYPE "IssueStatus" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'RESOLVED', 'REOPENED');

-- CreateTable
CREATE TABLE "Depot" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "Depot_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Outlet" ("id" TEXT NOT NULL, "brand" "Brand" NOT NULL, "district" TEXT NOT NULL, "depotId" TEXT NOT NULL, "dockType" TEXT NOT NULL, "parkingConstraint" TEXT NOT NULL, "mallWindow" TEXT, "windowOpenTime" TEXT NOT NULL, "windowCloseTime" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Vehicle" ("id" TEXT NOT NULL, "depotId" TEXT NOT NULL, "type" "VehicleType" NOT NULL, "temperature" "VehicleTemperature" NOT NULL, "weightCapacityKg" DECIMAL(12,2) NOT NULL, "volumeCapacityM3" DECIMAL(12,3) NOT NULL, "kilometersPerLitre" DECIMAL(8,3) NOT NULL, "weeklyFuelQuotaL" DECIMAL(12,2) NOT NULL, "isInWorkshop" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Account" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "displayName" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL, "outletId" TEXT, "depotId" TEXT, "locale" TEXT NOT NULL DEFAULT 'en', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Account_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Order" ("id" TEXT NOT NULL, "outletId" TEXT NOT NULL, "requestedDate" TIMESTAMP(3) NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'SUBMITTED', "temperatureRequired" "VehicleTemperature" NOT NULL, "units" INTEGER NOT NULL, "weightKg" DECIMAL(12,2) NOT NULL, "volumeM3" DECIMAL(12,3) NOT NULL, "submittedAt" TIMESTAMP(3), "deliveryWindowOpen" TEXT NOT NULL, "deliveryWindowClose" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id"));
CREATE TABLE "OrderLine" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "productCode" TEXT NOT NULL, "description" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "weightKg" DECIMAL(12,2) NOT NULL, "volumeM3" DECIMAL(12,3) NOT NULL, CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Plan" ("id" TEXT NOT NULL, "depotId" TEXT NOT NULL, "serviceDate" TIMESTAMP(3) NOT NULL, "version" INTEGER NOT NULL, "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Plan_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Trip" ("id" TEXT NOT NULL, "planId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "tripNumber" INTEGER NOT NULL, "brand" "Brand" NOT NULL, "district" TEXT NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'ALLOCATED', "plannedStart" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Trip_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Allocation" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "planId" TEXT NOT NULL, "tripId" TEXT NOT NULL, "sequence" INTEGER NOT NULL, CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "OrderStatusEvent" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "status" "OrderStatus" NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "IssueCase" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "status" "IssueStatus" NOT NULL DEFAULT 'REPORTED', "summary" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "IssueCase_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditEvent" ("id" TEXT NOT NULL, "actorId" TEXT, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "action" TEXT NOT NULL, "payload" JSONB, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"));

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "Plan_depotId_serviceDate_version_key" ON "Plan"("depotId", "serviceDate", "version");
CREATE UNIQUE INDEX "Trip_planId_vehicleId_tripNumber_key" ON "Trip"("planId", "vehicleId", "tripNumber");
CREATE UNIQUE INDEX "Allocation_planId_orderId_key" ON "Allocation"("planId", "orderId");
CREATE UNIQUE INDEX "Allocation_tripId_sequence_key" ON "Allocation"("tripId", "sequence");
CREATE INDEX "AuditEvent_entityType_entityId_occurredAt_idx" ON "AuditEvent"("entityType", "entityId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueCase" ADD CONSTRAINT "IssueCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
