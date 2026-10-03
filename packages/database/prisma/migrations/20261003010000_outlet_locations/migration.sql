ALTER TABLE "Outlet" ADD COLUMN "address" TEXT;
ALTER TABLE "Outlet" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Outlet" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_location_valid" CHECK (
  ("latitude" IS NULL AND "longitude" IS NULL) OR
  ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
);
