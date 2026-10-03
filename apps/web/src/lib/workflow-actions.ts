"use server";

import { prisma, type Prisma } from "@waypoint/database";
import { getSession, type Session } from "@/lib/auth";
import { serializable } from "@/lib/transactions";
import { revalidatePath } from "next/cache";

const issueTransitions: Record<string, string[]> = {
  REPORTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["RESOLVED"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["ACKNOWLEDGED"]
};

export async function transitionIssue(issueId: string, nextStatus: "ACKNOWLEDGED" | "UNDER_REVIEW" | "RESOLVED" | "REOPENED", note: string) {
  const session = await getSession();
  if (!session || !["store_manager", "dispatcher", "loader"].includes(session.role)) throw new Error("You are not allowed to change issue status.");
  if (!note.trim()) throw new Error("A lifecycle transition needs a note.");
  return serializable(async (tx) => {
    const issue = await tx.issueCase.findUnique({ where: { id: issueId }, include: { order: { include: { outlet: true } } } });
    if (!issue || (session.role === "store_manager" ? !session.outletId || issue.order.outletId !== session.outletId : !session.depotId || issue.order.outlet.depotId !== session.depotId)) throw new Error("Issue is outside your scope.");
    if (session.role === "store_manager" && nextStatus !== "REOPENED") throw new Error("Store managers can reopen resolved issues. Dispatchers manage resolutions.");
    if (session.role === "loader" && (nextStatus !== "ACKNOWLEDGED" || issue.openedById !== session.accountId)) throw new Error("Loaders can acknowledge their own reports only.");
    if (!issueTransitions[issue.status]?.includes(nextStatus)) throw new Error(`Cannot move ${issue.status} to ${nextStatus}.`);
    await tx.issueCase.update({ where: { id: issue.id }, data: { status: nextStatus } });
    await tx.issueEvent.create({ data: { issueId: issue.id, from: issue.status, to: nextStatus, note, actorId: session.accountId } });
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ outletId: issue.order.outletId }, { depotId: issue.order.outlet.depotId, role: { in: ["DISPATCHER", "LOADER"] } }, { assignedTrips: { some: { allocations: { some: { orderId: issue.orderId } }, plan: { status: "PUBLISHED" } } } }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "ISSUE", title: `Issue ${issue.id} updated`, body: `${issue.summary} is now ${nextStatus.replaceAll("_", " ")}.`, entityType: "IssueCase", entityId: issue.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "IssueCase", entityId: issue.id, action: "status_changed", payload: { from: issue.status, to: nextStatus, note } } });
    return issue.id;
  });
}

export async function acknowledgeNotification(notificationId: string) {
  const session = await getSession();
  if (!session) throw new Error("Sign in required.");
  await prisma.notification.updateMany({ where: { id: notificationId, recipientId: session.accountId, readAt: null }, data: { readAt: new Date() } });
}

export async function createLoaderIssue(tripId: string, orderId: string, summary: string, quantity: number, note: string) {
  const session = await getSession();
  if (!session || session.role !== "loader" || !session.depotId) throw new Error("Loader access required.");
  if (!summary.trim() || summary.length > 300 || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Enter an issue and whole positive quantity.");
  return serializable(async (tx) => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, plan: { depotId: session.depotId, status: "PUBLISHED" }, status: { in: ["ALLOCATED", "LOADED"] }, allocations: { some: { orderId } } }, include: { plan: true } });
    const order = await tx.order.findFirst({ where: { id: orderId, outlet: { depotId: session.depotId } } });
    if (!trip || !order) throw new Error("Trip and order must belong to the Loader depot.");
    if (quantity > order.units) throw new Error("Issue quantity exceeds the order.");
    const issue = await tx.issueCase.create({ data: { orderId, summary: `Loading: ${summary.trim()}`, openedById: session.accountId, events: { create: { to: "REPORTED", note: note.trim() || null, actorId: session.accountId } } } });
    await tx.loadIssue.create({ data: { tripId, orderId, issueId: issue.id, summary: summary.trim(), quantity, note: note.trim() || null, createdById: session.accountId } });
    const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ outletId: order.outletId }, { depotId: session.depotId, role: { in: ["DISPATCHER", "LOADER"] } }, { id: trip.driverId ?? "" }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "LOAD", title: `Loading issue for ${order.id}`, body: summary.trim(), entityType: "IssueCase", entityId: issue.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "LoadIssue", entityId: issue.id, action: "reported", payload: { tripId, orderId, quantity, note: note.trim() || null } } });
    return issue.id;
  });
}


type DriverInput = { operationId: string; orderId: string; outcome: "DELIVERED" | "CANNOT_DELIVER"; receiverName?: string; note?: string; photoKey?: string; signatureKey?: string; clientUpdatedAt?: string };

async function applyDriverOutcome(tx: Prisma.TransactionClient, session: Session, input: DriverInput, correction = false) {
  if (!input.operationId?.trim() || input.operationId.length > 200 || !input.orderId || !["DELIVERED", "CANNOT_DELIVER"].includes(input.outcome)) throw new Error("Invalid delivery operation.");
  if (input.clientUpdatedAt && !Number.isFinite(new Date(input.clientUpdatedAt).getTime())) throw new Error("Invalid record version.");
  if (input.outcome === "DELIVERED" && !input.receiverName?.trim() && !input.photoKey?.trim() && !input.signatureKey?.trim()) throw new Error("Add a receiver name or proof of delivery.");
  if (input.outcome === "CANNOT_DELIVER" && !input.note?.trim()) throw new Error("Enter a delivery problem.");
  const existing = await tx.syncOperation.findUnique({ where: { operationId: input.operationId } });
  if (existing) {
    if (existing.accountId !== session.accountId) throw new Error("This operation belongs to another account.");
    const previous = existing.payload as unknown as DriverInput;
    if (["orderId", "outcome", "receiverName", "note", "photoKey", "signatureKey", "clientUpdatedAt"].some((key) => previous[key as keyof DriverInput] !== input[key as keyof DriverInput])) throw new Error("Operation ID already used for different data.");
    return { id: existing.id, status: existing.status };
  }
  const order = await tx.order.findFirst({
    where: { id: input.orderId, outlet: { depotId: session.depotId }, allocations: { some: { trip: { driverId: session.accountId, plan: { status: "PUBLISHED" }, status: { in: ["OUT_FOR_DELIVERY", "DELIVERED"] } } } } },
    include: { outlet: true, allocations: { where: { trip: { driverId: session.accountId, plan: { status: "PUBLISHED" } } }, include: { trip: true } } }
  });
  if (!order || !["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) throw new Error("Order is not on your active trip.");
  const operation = await tx.syncOperation.create({ data: { operationId: input.operationId, accountId: session.accountId, entityType: "Order", entityId: order.id, payload: input } });
  if (input.clientUpdatedAt && order.updatedAt.getTime() !== new Date(input.clientUpdatedAt).getTime()) {
    const serverPayload = { orderId: order.id, status: order.status, updatedAt: order.updatedAt.toISOString() };
    await tx.syncConflict.create({ data: { operationId: operation.operationId, localPayload: input, serverPayload } });
    await tx.syncOperation.update({ where: { id: operation.id }, data: { status: "CONFLICT", serverPayload } });
    return { id: operation.id, status: "CONFLICT" as const };
  }
  if (order.status === "DELIVERED" && !correction) throw new Error("Delivery already recorded. Resolve any conflicting record in Sync.");
  await tx.deliveryOutcomeRecord.upsert({ where: { orderId: order.id }, update: { driverId: session.accountId, outcome: input.outcome, receiverName: input.receiverName?.trim() || null, note: input.note?.trim() || null, recordedAt: new Date() }, create: { orderId: order.id, driverId: session.accountId, outcome: input.outcome, receiverName: input.receiverName?.trim() || null, note: input.note?.trim() || null } });
  if (input.photoKey) await tx.proofAsset.create({ data: { orderId: order.id, capturedById: session.accountId, type: "PHOTO", storageKey: input.photoKey } });
  if (input.signatureKey) await tx.proofAsset.create({ data: { orderId: order.id, capturedById: session.accountId, type: "SIGNATURE", storageKey: input.signatureKey } });
  const status = input.outcome === "DELIVERED" ? "DELIVERED" : "OUT_FOR_DELIVERY";
  await tx.order.update({ where: { id: order.id }, data: { status } });
  await tx.orderStatusEvent.create({ data: { orderId: order.id, status, reason: input.note ?? input.outcome } });
  if (input.outcome === "CANNOT_DELIVER") await tx.issueCase.create({ data: { orderId: order.id, openedById: session.accountId, summary: `Delivery: ${input.note!.trim()}`, events: { create: { to: "REPORTED", actorId: session.accountId, note: input.note } } } });
  const trip = order.allocations[0].trip;
  const remaining = await tx.order.count({ where: { allocations: { some: { tripId: trip.id } }, status: { not: "DELIVERED" } } });
  await tx.trip.update({ where: { id: trip.id }, data: { status: remaining ? "OUT_FOR_DELIVERY" : "DELIVERED" } });
  await tx.syncOperation.update({ where: { id: operation.id }, data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() } });
  const recipients = await tx.account.findMany({ where: { isActive: true, OR: [{ outletId: order.outletId }, { depotId: session.depotId, role: "DISPATCHER" }] }, select: { id: true } });
  await tx.notification.createMany({ data: recipients.map((recipient) => ({ recipientId: recipient.id, type: "DELIVERY", title: `${order.id} ${input.outcome === "DELIVERED" ? "delivered" : "needs attention"}`, body: input.note ?? "Driver outcome recorded.", entityType: "Order", entityId: order.id })) });
  await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.id, action: correction ? "driver_outcome_corrected" : "driver_outcome_recorded", payload: { operationId: input.operationId, outcome: input.outcome, receiverName: input.receiverName ?? null, proof: Boolean(input.photoKey || input.signatureKey) } } });
  return { id: operation.id, status: "ACKNOWLEDGED" as const };
}

export async function recordDriverOutcome(input: DriverInput) {
  const session = await getSession();
  if (!session || session.role !== "driver" || !session.depotId) throw new Error("Driver access required.");
  const result = await serializable((tx) => applyDriverOutcome(tx, session, input));
  revalidatePath("/workspace", "layout");
  return result;
}

export async function startDriverTrip(tripId: string) {
  const session = await getSession();
  if (!session || session.role !== "driver" || !session.depotId) throw new Error("Driver access required.");
  const versions = await serializable(async (tx) => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, driverId: session.accountId, plan: { depotId: session.depotId, status: "PUBLISHED" } }, include: { allocations: { include: { order: true } }, vehicle: true } });
    if (!trip || !["LOADED", "OUT_FOR_DELIVERY"].includes(trip.status)) throw new Error("Your trip must be loaded before departure.");
    if (trip.status === "OUT_FOR_DELIVERY") return trip.allocations.map((allocation) => ({ orderId: allocation.orderId, updatedAt: allocation.order.updatedAt.toISOString() }));
    if (trip.vehicle.isInWorkshop || !trip.allocations.length || trip.allocations.some((allocation) => allocation.order.status !== "LOADED")) throw new Error("Loading must be re-verified before departure.");
    if (await tx.trip.count({ where: { driverId: session.accountId, status: "OUT_FOR_DELIVERY", plan: { status: "PUBLISHED" } } })) throw new Error("Complete your active trip before starting another.");
    await tx.trip.update({ where: { id: trip.id }, data: { status: "OUT_FOR_DELIVERY" } });
    for (const allocation of trip.allocations) {
      await tx.order.update({ where: { id: allocation.orderId }, data: { status: "OUT_FOR_DELIVERY" } });
      await tx.orderStatusEvent.create({ data: { orderId: allocation.orderId, status: "OUT_FOR_DELIVERY" } });
    }
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Trip", entityId: trip.id, action: "departed" } });
    const orders = await tx.order.findMany({ where: { allocations: { some: { tripId: trip.id } } }, select: { id: true, updatedAt: true } });
    return orders.map((order) => ({ orderId: order.id, updatedAt: order.updatedAt.toISOString() }));
  });
  revalidatePath("/workspace", "layout");
  return versions;
}

export async function resolveDriverSyncConflict(operationId: string, resolution: "KEEP_LOCAL" | "KEEP_SERVER") {
  const session = await getSession();
  if (!session || session.role !== "driver" || !session.depotId) throw new Error("Driver access required.");
  if (!["KEEP_LOCAL", "KEEP_SERVER"].includes(resolution)) throw new Error("Choose a valid conflict resolution.");
  await serializable(async (tx) => {
    const operation = await tx.syncOperation.findFirst({ where: { operationId, accountId: session.accountId, status: "CONFLICT" }, include: { conflict: true } });
    if (!operation?.conflict || operation.conflict.resolvedAt) throw new Error("Unresolved conflict not found.");
    if (resolution === "KEEP_LOCAL") {
      const payload = operation.payload as unknown as DriverInput;
      const correction = { ...payload, operationId: `${operationId}-resolved-local` };
      delete correction.clientUpdatedAt;
      await applyDriverOutcome(tx, session, correction, true);
    }
    await tx.syncConflict.update({ where: { operationId }, data: { resolution, resolvedAt: new Date() } });
    await tx.syncOperation.update({ where: { operationId }, data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "SyncOperation", entityId: operation.id, action: "conflict_resolved", payload: { resolution } } });
  });
  revalidatePath("/workspace", "layout");
}
