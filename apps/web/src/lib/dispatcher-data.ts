import { prisma, type Prisma } from "@waypoint/database";

// Orders on another published run stay with that run, even when it is overdue.
export function planningQueueWhere(depotId: string, serviceDate: Date): Prisma.OrderWhereInput {
  return {
    outlet: { depotId }, requestedDate: { lte: serviceDate },
    status: { in: ["SUBMITTED", "CONFIRMED", "DEFERRED", "ALLOCATED", "LOADED"] },
    allocations: { none: { plan: { status: "PUBLISHED", serviceDate: { not: serviceDate } } } }
  };
}

export async function getDispatcherBoard(depotId: string, serviceDate: Date) {
  return prisma.trip.findMany({
    where: {
      plan: { depotId, status: "PUBLISHED" },
      OR: [
        { status: { in: ["ALLOCATED", "LOADED", "OUT_FOR_DELIVERY"] } },
        { plan: { serviceDate } },
        { allocations: { some: { order: { status: "DELIVERED", receipt: { is: null } } } } }
      ]
    },
    include: {
      plan: true, driver: { select: { id: true, displayName: true, isActive: true } },
      vehicle: { select: { isInWorkshop: true } },
      allocations: { orderBy: { sequence: "asc" }, include: { order: { include: {
        receipt: true, deliveryOutcome: true,
        issues: { where: { status: { not: "RESOLVED" } }, select: { id: true, summary: true } }
      } } } }
    },
    orderBy: [{ plan: { serviceDate: "asc" } }, { tripNumber: "asc" }]
  });
}
