"use server";

import { type Prisma } from "@waypoint/database";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { loadLineSeeds, validateLoadAccounting } from "@/lib/loader-workflow";
import { serializable } from "@/lib/transactions";

type StartLoadingInput = {
  tripId: string;
  planVersion: number;
  loadingOrderConfirmed: boolean;
  reeferTemperatureC?: number | null;
  reeferConfirmed?: boolean;
};

type LineStateInput = {
  tripId: string;
  planVersion: number;
  lineKey: string;
  loaded: boolean;
};

export type LoaderIssueInput = {
  tripId: string;
  planVersion: number;
  lineKey: string;
  type: "MISSING" | "DAMAGED";
  quantity: number;
  note?: string;
  photo?: { name: string; mimeType: string; base64: string } | null;
};

async function currentTrip(tx: Prisma.TransactionClient, tripId: string, depotId: string, planVersion: number) {
  const trip = await tx.trip.findFirst({
    where: { id: tripId, plan: { depotId, status: "PUBLISHED", version: planVersion } },
    include: {
      plan: true,
      vehicle: true,
      loadSession: { include: { lines: true } },
      allocations: { include: { order: { include: { lines: true, outlet: true } } }, orderBy: { sequence: "desc" } },
      loadIssues: true
    }
  });
  if (!trip) throw new Error("The published plan changed. Return to the trip queue and open the latest version.");
  return trip;
}

export async function startLoading(input: StartLoadingInput) {
  const session = await requireRole("loader");
  if (!session.depotId) throw new Error("This Loader terminal is not assigned to a depot.");
  if (!input.loadingOrderConfirmed) throw new Error("Confirm the reverse loading order before starting.");
  const result = await serializable(async (tx) => {
    const trip = await currentTrip(tx, input.tripId, session.depotId!, input.planVersion);
    if (!["ALLOCATED", "LOADED"].includes(trip.status) || trip.vehicle.isInWorkshop) throw new Error("This trip is not available for loading.");
    if (trip.vehicle.temperature === "REEFER") {
      if (!input.reeferConfirmed || input.reeferTemperatureC === null || input.reeferTemperatureC === undefined || !Number.isFinite(input.reeferTemperatureC)) throw new Error("Record the reefer reading and confirm the unit is at temperature.");
    }
    if (trip.loadSession) {
      if (trip.loadSession.planVersion !== trip.plan.version || trip.loadSession.vehicleIdSnapshot !== trip.vehicleId) throw new Error("This load belongs to an older plan or vehicle and must be re-verified.");
      return { id: trip.loadSession.id, startedAt: trip.loadSession.createdAt.toISOString(), status: trip.loadSession.status };
    }
    const seeds = trip.allocations.flatMap((allocation) => loadLineSeeds(allocation.order));
    if (!seeds.length) throw new Error("This trip has no loadable order lines.");
    const now = new Date();
    const created = await tx.loadSession.create({
      data: {
        tripId: trip.id,
        planVersion: trip.plan.version,
        vehicleIdSnapshot: trip.vehicleId,
        loadingOrderAcknowledgedAt: now,
        reeferTemperatureC: trip.vehicle.temperature === "REEFER" ? input.reeferTemperatureC : null,
        reeferConfirmedAt: trip.vehicle.temperature === "REEFER" ? now : null,
        lines: { create: seeds.map((line) => ({ lineKey: line.lineKey, orderId: line.orderId, orderLineId: line.orderLineId, plannedQuantity: line.plannedQuantity })) }
      }
    });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "LoadSession", entityId: created.id, action: "loading_started", payload: { tripId: trip.id, planVersion: trip.plan.version, vehicleId: trip.vehicleId, reeferTemperatureC: input.reeferTemperatureC ?? null } } });
    return { id: created.id, startedAt: created.createdAt.toISOString(), status: created.status };
  });
  revalidatePath("/workspace/loader/load");
  return result;
}

export async function setLoadLineState(input: LineStateInput) {
  const session = await requireRole("loader");
  if (!session.depotId || !input.lineKey) throw new Error("Invalid checklist update.");
  return serializable(async (tx) => {
    const trip = await currentTrip(tx, input.tripId, session.depotId!, input.planVersion);
    if (!trip.loadSession || trip.loadSession.status !== "LOADING") throw new Error("Start loading before updating the checklist.");
    const line = trip.loadSession.lines.find((entry) => entry.lineKey === input.lineKey);
    if (!line) throw new Error("This checklist line is not part of the published trip.");
    const activeFlag = trip.loadIssues.find((issue) => issue.lineKey === line.lineKey && !issue.withdrawnAt);
    if (input.loaded && activeFlag) throw new Error("Withdraw the flag before marking this line fully loaded.");
    const loadedQuantity = input.loaded ? line.plannedQuantity : 0;
    if (line.loadedQuantity === loadedQuantity) return { lineKey: line.lineKey, loadedQuantity, updatedAt: line.updatedAt.toISOString() };
    const updated = await tx.loadLine.update({ where: { id: line.id }, data: { loadedQuantity } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "LoadLine", entityId: line.id, action: input.loaded ? "line_loaded" : "line_unchecked", payload: { tripId: trip.id, lineKey: line.lineKey, from: line.loadedQuantity, to: loadedQuantity, planVersion: trip.plan.version } } });
    return { lineKey: line.lineKey, loadedQuantity, updatedAt: updated.updatedAt.toISOString() };
  });
}

function decodePhoto(photo: LoaderIssueInput["photo"]) {
  if (!photo) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.mimeType)) throw new Error("Attach a JPG, PNG, or WebP image.");
  const data = Buffer.from(photo.base64, "base64");
  if (!data.length || data.length > 700_000) throw new Error("Photo evidence must be smaller than 700 KB.");
  return { data, name: photo.name.slice(0, 120), mimeType: photo.mimeType };
}

export async function reportLoaderIssue(input: LoaderIssueInput) {
  const session = await requireRole("loader");
  if (!session.depotId || !["MISSING", "DAMAGED"].includes(input.type) || !Number.isSafeInteger(input.quantity) || input.quantity < 1) throw new Error("Choose a problem type and a whole positive quantity.");
  const note = input.note?.trim() ?? "";
  if (note.length > 500) throw new Error("Keep the note under 500 characters.");
  const photo = decodePhoto(input.photo);
  const result = await serializable(async (tx) => {
    const trip = await currentTrip(tx, input.tripId, session.depotId!, input.planVersion);
    if (!trip.loadSession || trip.loadSession.status !== "LOADING") throw new Error("Start loading before reporting a shortfall.");
    const line = trip.loadSession.lines.find((entry) => entry.lineKey === input.lineKey);
    if (!line || input.quantity > line.plannedQuantity) throw new Error("The affected quantity exceeds this checklist line.");
    if (trip.loadIssues.some((issue) => issue.lineKey === line.lineKey && !issue.withdrawnAt)) throw new Error("This line already has an active flag. Withdraw it before creating another.");
    const seed = trip.allocations.flatMap((allocation) => loadLineSeeds(allocation.order)).find((entry) => entry.lineKey === line.lineKey);
    if (!seed) throw new Error("This checklist line is no longer in the published trip.");
    const problem = input.type === "MISSING" ? "Missing" : "Damaged";
    const summary = `${problem}: ${seed.description}`;
    const issue = await tx.issueCase.create({ data: { orderId: line.orderId, summary: `Loading: ${summary}`, openedById: session.accountId, events: { create: { to: "REPORTED", note: note || `${input.quantity} affected`, actorId: session.accountId } } } });
    const loadIssue = await tx.loadIssue.create({ data: { tripId: trip.id, orderId: line.orderId, orderLineId: line.orderLineId, lineKey: line.lineKey, issueId: issue.id, type: input.type, summary, quantity: input.quantity, note: note || null, photoName: photo?.name, photoMimeType: photo?.mimeType, photoData: photo?.data, createdById: session.accountId } });
    await tx.loadLine.update({ where: { id: line.id }, data: { loadedQuantity: line.plannedQuantity - input.quantity } });
    const order = trip.allocations.find((allocation) => allocation.orderId === line.orderId)!.order;
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ outletId: order.outletId }, { depotId: session.depotId, role: "DISPATCHER" }, { id: trip.driverId ?? "" }] }, select: { id: true, role: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "LOAD", title: `${problem} during loading`, body: `${input.quantity} × ${seed.description} · ${order.id} · ${trip.vehicleId}`, entityType: recipient.role === "STORE_MANAGER" ? "Order" : "IssueCase", entityId: recipient.role === "STORE_MANAGER" ? order.id : issue.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "LoadIssue", entityId: loadIssue.id, action: "reported", payload: { tripId: trip.id, planVersion: trip.plan.version, lineKey: line.lineKey, type: input.type, quantity: input.quantity, note: note || null, photoAttached: Boolean(photo) } } });
    return { id: loadIssue.id, issueId: issue.id, lineKey: line.lineKey, type: input.type, quantity: input.quantity, summary, loadedQuantity: line.plannedQuantity - input.quantity };
  });
  revalidatePath("/workspace", "layout");
  return result;
}

export async function withdrawLoaderIssue(loadIssueId: string) {
  const session = await requireRole("loader");
  if (!session.depotId) throw new Error("This Loader terminal is not assigned to a depot.");
  const result = await serializable(async (tx) => {
    const loadIssue = await tx.loadIssue.findFirst({ where: { id: loadIssueId, withdrawnAt: null, trip: { plan: { depotId: session.depotId, status: "PUBLISHED" } } }, include: { trip: { include: { loadSession: { include: { lines: true } }, plan: true } }, issue: true, order: true } });
    if (!loadIssue?.trip.loadSession || loadIssue.trip.loadSession.status !== "LOADING" || loadIssue.trip.status !== "ALLOCATED") throw new Error("Flags can only be withdrawn before the trip is confirmed loaded.");
    const now = new Date();
    await tx.loadIssue.update({ where: { id: loadIssue.id }, data: { withdrawnAt: now } });
    const line = loadIssue.trip.loadSession.lines.find((entry) => entry.lineKey === loadIssue.lineKey);
    if (line) await tx.loadLine.update({ where: { id: line.id }, data: { loadedQuantity: 0 } });
    if (loadIssue.issue && loadIssue.issue.status !== "RESOLVED") {
      await tx.issueCase.update({ where: { id: loadIssue.issue.id }, data: { status: "RESOLVED" } });
      await tx.issueEvent.create({ data: { issueId: loadIssue.issue.id, from: loadIssue.issue.status, to: "RESOLVED", note: "Loader withdrew the flag before hand-off.", actorId: session.accountId } });
    }
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ outletId: loadIssue.order.outletId }, { depotId: session.depotId, role: "DISPATCHER" }, { id: loadIssue.trip.driverId ?? "" }] }, select: { id: true, role: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "LOAD", title: "Loading flag withdrawn", body: `${loadIssue.summary} · ${loadIssue.orderId}`, entityType: recipient.role === "STORE_MANAGER" ? "Order" : "IssueCase", entityId: recipient.role === "STORE_MANAGER" ? loadIssue.orderId : loadIssue.issueId })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "LoadIssue", entityId: loadIssue.id, action: "withdrawn", payload: { tripId: loadIssue.tripId, lineKey: loadIssue.lineKey } } });
    return { id: loadIssue.id, lineKey: loadIssue.lineKey };
  });
  revalidatePath("/workspace", "layout");
  return result;
}

export async function confirmTripLoaded(tripId: string, expectedPlanVersion: number) {
  const session = await requireRole("loader");
  if (!session.depotId) throw new Error("This Loader terminal is not assigned to a depot.");
  const result = await serializable(async (tx) => {
    const trip = await currentTrip(tx, tripId, session.depotId!, expectedPlanVersion);
    if (trip.status === "LOADED" && trip.loadSession?.status === "CONFIRMED") return { tripId: trip.id, confirmedAt: trip.loadSession.confirmedAt!.toISOString(), plannedUnits: trip.loadSession.lines.reduce((sum, line) => sum + line.plannedQuantity, 0), loadedUnits: trip.loadSession.lines.reduce((sum, line) => sum + line.loadedQuantity, 0), flags: trip.loadIssues.filter((issue) => !issue.withdrawnAt).length };
    if (trip.status !== "ALLOCATED" || trip.vehicle.isInWorkshop || !trip.loadSession || trip.loadSession.status !== "LOADING") throw new Error("This trip is not ready for loading confirmation.");
    if (!trip.loadSession.loadingOrderAcknowledgedAt || (trip.vehicle.temperature === "REEFER" && (!trip.loadSession.reeferConfirmedAt || trip.loadSession.reeferTemperatureC === null))) throw new Error("Complete the required pre-load checks.");
    const activeIssues = trip.loadIssues.filter((issue) => !issue.withdrawnAt);
    const problems = validateLoadAccounting(trip.loadSession.lines, activeIssues);
    if (problems.length) throw new Error("Every checklist line must be loaded or covered by a documented flag.");
    const expectedSeeds = trip.allocations.flatMap((allocation) => loadLineSeeds(allocation.order));
    if (expectedSeeds.length !== trip.loadSession.lines.length || expectedSeeds.some((seed) => !trip.loadSession!.lines.some((line) => line.lineKey === seed.lineKey && line.plannedQuantity === seed.plannedQuantity))) throw new Error("The checklist no longer matches the published trip.");
    const now = new Date();
    await tx.loadSession.update({ where: { id: trip.loadSession.id }, data: { status: "CONFIRMED", confirmedAt: now, confirmedById: session.accountId } });
    await tx.trip.update({ where: { id: trip.id }, data: { status: "LOADED" } });
    for (const allocation of trip.allocations) {
      await tx.order.update({ where: { id: allocation.orderId }, data: { status: "LOADED" } });
      await tx.orderStatusEvent.create({ data: { orderId: allocation.orderId, status: "LOADED", reason: `Loader confirmed ${trip.vehicleId} · plan v${trip.plan.version}` } });
    }
    const plannedUnits = trip.loadSession.lines.reduce((sum, line) => sum + line.plannedQuantity, 0);
    const loadedUnits = trip.loadSession.lines.reduce((sum, line) => sum + line.loadedQuantity, 0);
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ depotId: session.depotId, role: "DISPATCHER" }, { id: trip.driverId ?? "" }, { outletId: { in: trip.allocations.map((allocation) => allocation.order.outletId) } }] }, select: { id: true, role: true, outletId: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => { const storeOrder = recipient.outletId ? trip.allocations.find((allocation) => allocation.order.outletId === recipient.outletId)?.orderId : null; return { recipientId: recipient.id, type: "LOAD", title: `${trip.vehicleId} loaded`, body: `${loadedUnits} of ${plannedUnits} units loaded · ${activeIssues.length} ${activeIssues.length === 1 ? "flag" : "flags"}.`, entityType: storeOrder ? "Order" : "Trip", entityId: storeOrder ?? trip.id }; }) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Trip", entityId: trip.id, action: "load_confirmed", payload: { planVersion: trip.plan.version, vehicleId: trip.vehicleId, plannedUnits, loadedUnits, flags: activeIssues.map((issue) => issue.id), lineSnapshot: trip.loadSession.lines.map((line) => ({ lineKey: line.lineKey, planned: line.plannedQuantity, loaded: line.loadedQuantity })) } } });
    return { tripId: trip.id, confirmedAt: now.toISOString(), plannedUnits, loadedUnits, flags: activeIssues.length };
  });
  revalidatePath("/workspace", "layout");
  return result;
}

export async function acknowledgePlanChange(planId: string) {
  const session = await requireRole("loader");
  if (!session.depotId) throw new Error("This Loader terminal is not assigned to a depot.");
  return serializable(async (tx) => {
    const plan = await tx.plan.findFirst({ where: { id: planId, depotId: session.depotId, status: "PUBLISHED", version: { gt: 1 } } });
    if (!plan) throw new Error("The changed plan is no longer current.");
    const existing = await tx.auditEvent.findFirst({ where: { actorId: session.accountId, entityType: "Plan", entityId: plan.id, action: "plan_change_acknowledged" } });
    if (!existing) await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Plan", entityId: plan.id, action: "plan_change_acknowledged", payload: { version: plan.version } } });
    return plan.version;
  });
}
