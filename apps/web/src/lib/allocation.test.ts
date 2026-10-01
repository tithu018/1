import { describe, expect, it } from "vitest";
import { evaluateTrip, suggestAllocation, type AllocationOrder, type AllocationVehicle } from "@waypoint/allocation";

const reeferVan: AllocationVehicle = { id: "VEH036", depot: "Peliyagoda", type: "van", temperature: "reefer", weightCapacityKg: 1040, volumeCapacityM3: 7 };
const ambientTruck: AllocationVehicle = { id: "VEH012", depot: "Peliyagoda", type: "truck", temperature: "ambient", weightCapacityKg: 4200, volumeCapacityM3: 24 };
const chilledVanOnlyOrder: AllocationOrder = { id: "ORD-1", outletId: "OUT012", depot: "Peliyagoda", brand: "Fresh", district: "Colombo", temperature: "chilled", parkingConstraint: "van_only", weightKg: 555, volumeM3: 3 };

describe("allocation constraints", () => {
  it("accepts an order on a compatible reefer van", () => {
    expect(evaluateTrip(reeferVan, [chilledVanOnlyOrder])).toMatchObject({ valid: true, totalWeightKg: 555, totalVolumeM3: 3 });
  });

  it("reports all incompatible vehicle constraints", () => {
    expect(evaluateTrip(ambientTruck, [chilledVanOnlyOrder]).failures.map((failure) => failure.code)).toEqual(expect.arrayContaining(["TEMPERATURE", "VAN_ONLY"]));
  });

  it("does not split an infeasible order and records a defer reason", () => {
    const tooHeavy = { ...chilledVanOnlyOrder, id: "ORD-2", weightKg: 2000 };
    const suggestion = suggestAllocation([reeferVan], [tooHeavy]);
    expect(suggestion.served).toHaveLength(0);
    expect(suggestion.deferred).toHaveLength(1);
    expect(suggestion.deferred[0].order.id).toBe("ORD-2");
  });
});
