export type Temperature = "ambient" | "chilled";
export type VehicleType = "truck" | "van";

export interface AllocationVehicle {
  id: string;
  depot: string;
  type: VehicleType;
  temperature: "ambient" | "reefer";
  weightCapacityKg: number;
  volumeCapacityM3: number;
  inWorkshop?: boolean;
}

export interface AllocationOrder {
  id: string;
  outletId: string;
  depot: string;
  brand: string;
  district: string;
  temperature: Temperature;
  parkingConstraint: "normal" | "van_only" | "mall_dock";
  weightKg: number;
  volumeM3: number;
}

export type ConstraintCode =
  | "VEHICLE_IN_WORKSHOP"
  | "WRONG_DEPOT"
  | "TEMPERATURE"
  | "VAN_ONLY"
  | "MIXED_BRAND"
  | "MIXED_DISTRICT"
  | "WEIGHT_CAPACITY"
  | "VOLUME_CAPACITY"
  | "DUPLICATE_ORDER";

export interface ConstraintFailure {
  code: ConstraintCode;
  message: string;
  orderId?: string;
}

export interface TripEvaluation {
  valid: boolean;
  totalWeightKg: number;
  totalVolumeM3: number;
  failures: ConstraintFailure[];
}

export function evaluateTrip(vehicle: AllocationVehicle, orders: readonly AllocationOrder[]): TripEvaluation {
  const failures: ConstraintFailure[] = [];
  const uniqueOrderIds = new Set<string>();
  const brands = new Set<string>();
  const districts = new Set<string>();
  let totalWeightKg = 0;
  let totalVolumeM3 = 0;

  if (vehicle.inWorkshop) failures.push({ code: "VEHICLE_IN_WORKSHOP", message: `${vehicle.id} is in workshop.` });

  for (const order of orders) {
    if (uniqueOrderIds.has(order.id)) failures.push({ code: "DUPLICATE_ORDER", orderId: order.id, message: `${order.id} appears more than once in this trip.` });
    uniqueOrderIds.add(order.id);
    brands.add(order.brand);
    districts.add(order.district);
    totalWeightKg += order.weightKg;
    totalVolumeM3 += order.volumeM3;

    if (order.depot !== vehicle.depot) failures.push({ code: "WRONG_DEPOT", orderId: order.id, message: `${order.id} belongs to ${order.depot}, not ${vehicle.depot}.` });
    if (order.temperature === "chilled" && vehicle.temperature !== "reefer") failures.push({ code: "TEMPERATURE", orderId: order.id, message: `${order.id} needs a reefer vehicle.` });
    if (order.parkingConstraint === "van_only" && vehicle.type !== "van") failures.push({ code: "VAN_ONLY", orderId: order.id, message: `${order.id} requires a van.` });
  }

  if (brands.size > 1) failures.push({ code: "MIXED_BRAND", message: "A trip may serve one brand only." });
  if (districts.size > 1) failures.push({ code: "MIXED_DISTRICT", message: "A trip may serve one district only." });
  if (totalWeightKg > vehicle.weightCapacityKg) failures.push({ code: "WEIGHT_CAPACITY", message: `Weight ${totalWeightKg} kg exceeds ${vehicle.id} capacity.` });
  if (totalVolumeM3 > vehicle.volumeCapacityM3) failures.push({ code: "VOLUME_CAPACITY", message: `Volume ${totalVolumeM3} m³ exceeds ${vehicle.id} capacity.` });

  return { valid: failures.length === 0, totalWeightKg, totalVolumeM3, failures };
}

export interface AllocationSuggestion {
  served: AllocationOrder[];
  deferred: Array<{ order: AllocationOrder; reason: string }>;
  trips: Array<{ vehicleId: string; orders: AllocationOrder[]; evaluation: TripEvaluation }>;
}

export function suggestAllocation(vehicles: readonly AllocationVehicle[], orders: readonly AllocationOrder[]): AllocationSuggestion {
  const trips: AllocationSuggestion["trips"] = [];
  const deferred: AllocationSuggestion["deferred"] = [];
  const served: AllocationOrder[] = [];

  for (const order of orders) {
    const compatible = vehicles
      .filter((vehicle) => !vehicle.inWorkshop)
      .filter((vehicle) => evaluateTrip(vehicle, [order]).valid)
      .map((vehicle) => {
        const existing = trips.find((trip) => trip.vehicleId === vehicle.id && trip.orders[0]?.brand === order.brand && trip.orders[0]?.district === order.district);
        const candidateOrders = existing ? [...existing.orders, order] : [order];
        return { vehicle, existing, evaluation: evaluateTrip(vehicle, candidateOrders) };
      })
      .filter((candidate) => candidate.existing || trips.filter((trip) => trip.vehicleId === candidate.vehicle.id).length < 2)
      .filter((candidate) => candidate.evaluation.valid)
      .sort((a, b) => (a.existing ? 0 : 1) - (b.existing ? 0 : 1));

    const candidate = compatible[0];
    if (!candidate) {
      deferred.push({ order, reason: "No available vehicle meets capacity, temperature, access, depot, brand and district constraints." });
      continue;
    }

    if (candidate.existing) {
      candidate.existing.orders.push(order);
      candidate.existing.evaluation = candidate.evaluation;
    } else {
      trips.push({ vehicleId: candidate.vehicle.id, orders: [order], evaluation: candidate.evaluation });
    }
    served.push(order);
  }

  return { served, deferred, trips };
}
