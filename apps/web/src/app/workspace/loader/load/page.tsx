import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { loadLineSeeds } from "@/lib/loader-workflow";
import { LoadChecklistV2 } from "./load-checklist-v2";

export default async function LoaderLoadPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const requested = (await searchParams).trip;
  const session = await requireRole("loader");
  const plan = session.depotId ? await prisma.plan.findFirst({ where: { depotId: session.depotId, status: "PUBLISHED" }, include: { trips: { include: { vehicle: true, loadSession: { include: { lines: true } }, loadIssues: true, allocations: { include: { order: { include: { lines: true, outlet: true } } }, orderBy: { sequence: "desc" } } }, orderBy: [{ plannedStart: "asc" }, { tripNumber: "asc" }] } }, orderBy: [{ serviceDate: "desc" }, { version: "desc" }] }) : null;
  const trip = requested ? plan?.trips.find((trip) => trip.id === requested) : plan?.trips.find((trip) => trip.loadSession?.status === "LOADING") ?? plan?.trips.find((trip) => trip.status === "ALLOCATED") ?? plan?.trips.find((trip) => trip.status === "LOADED");
  const data = trip && plan ? {
    id: trip.id,
    planId: plan.id,
    planVersion: plan.version,
    tripNumber: trip.tripNumber,
    brand: trip.brand,
    district: trip.district,
    status: trip.status,
    plannedStart: trip.plannedStart?.toISOString() ?? null,
    vehicle: { id: trip.vehicle.id, type: trip.vehicle.type, temperature: trip.vehicle.temperature, weightCapacityKg: Number(trip.vehicle.weightCapacityKg), volumeCapacityM3: Number(trip.vehicle.volumeCapacityM3) },
    session: trip.loadSession ? { status: trip.loadSession.status, startedAt: trip.loadSession.createdAt.toISOString(), confirmedAt: trip.loadSession.confirmedAt?.toISOString() ?? null, reeferTemperatureC: trip.loadSession.reeferTemperatureC === null ? null : Number(trip.loadSession.reeferTemperatureC), lines: trip.loadSession.lines.map((line) => ({ lineKey: line.lineKey, loadedQuantity: line.loadedQuantity, plannedQuantity: line.plannedQuantity })) } : null,
    flags: trip.loadIssues.map((issue) => ({ id: issue.id, issueId: issue.issueId, lineKey: issue.lineKey, type: issue.type, quantity: issue.quantity ?? 0, summary: issue.summary, note: issue.note, photoName: issue.photoName, withdrawnAt: issue.withdrawnAt?.toISOString() ?? null })),
    stops: trip.allocations.map((allocation) => ({
      sequence: allocation.sequence,
      orderId: allocation.orderId,
      outletId: allocation.order.outletId,
      brand: allocation.order.outlet.brand,
      dockType: allocation.order.outlet.dockType,
      units: allocation.order.units,
      weightKg: Number(allocation.order.weightKg),
      volumeM3: Number(allocation.order.volumeM3),
      lines: loadLineSeeds(allocation.order)
    }))
  } : null;
  return <WorkspaceShell role="loader" active="Active load"><LoadChecklistV2 trip={data} /></WorkspaceShell>;
}
