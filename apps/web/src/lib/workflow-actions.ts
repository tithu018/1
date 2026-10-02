"use server";

import { prisma } from "@waypoint/database";
import { getSession } from "@/lib/auth";

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
  return prisma.$transaction(async (tx) => {
    const issue = await tx.issueCase.findUnique({ where: { id: issueId }, include: { order: { include: { outlet: true } } } });
    if (!issue || (session.outletId && issue.order.outletId !== session.outletId) || (session.depotId && issue.order.outlet.depotId !== session.depotId)) throw new Error("Issue is outside your scope.");
    if (!issueTransitions[issue.status].includes(nextStatus)) throw new Error(`Cannot move ${issue.status} to ${nextStatus}.`);
    await tx.issueCase.update({ where: { id: issue.id }, data: { status: nextStatus } });
    await tx.issueEvent.create({ data: { issueId: issue.id, from: issue.status, to: nextStatus, note, actorId: session.accountId } });
    const recipients = await tx.account.findMany({ where: { OR: [{ outletId: issue.order.outletId }, { depotId: issue.order.outlet.depotId }] }, select: { id: true } });
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
  if (!summary.trim() || quantity < 0) throw new Error("Issue details are invalid.");
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, plan: { depotId: session.depotId } }, include: { plan: true } });
    const order = await tx.order.findFirst({ where: { id: orderId, outlet: { depotId: session.depotId } } });
    if (!trip || !order) throw new Error("Trip and order must belong to the Loader depot.");
    const issue = await tx.issueCase.create({ data: { orderId, summary: `Loading: ${summary.trim()}`, openedById: session.accountId, events: { create: { to: "REPORTED", note: note.trim() || null, actorId: session.accountId } } } });
    await tx.loadIssue.create({ data: { tripId, orderId, issueId: issue.id, summary: summary.trim(), quantity, note: note.trim() || null, createdById: session.accountId } });
    const recipients = await tx.account.findMany({ where: { OR: [{ outletId: order.outletId }, { depotId: session.depotId }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "LOAD", title: `Loading issue for ${order.id}`, body: summary.trim(), entityType: "IssueCase", entityId: issue.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "LoadIssue", entityId: issue.id, action: "reported", payload: { tripId, orderId, quantity, note: note.trim() || null } } });
    return issue.id;
  });
}

export async function recordDriverOutcome(input: { operationId: string; orderId: string; outcome: "DELIVERED" | "CANNOT_DELIVER"; receiverName?: string; note?: string; photoKey?: string; signatureKey?: string; clientUpdatedAt?: string }) {
  const session = await getSession();
  if (!session || session.role !== "driver" || !session.depotId) throw new Error("Driver access required.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.syncOperation.findUnique({ where: { operationId: input.operationId } });
    if (existing) return existing.id;
    const order = await tx.order.findFirst({ where: { id: input.orderId, outlet: { depotId: session.depotId } }, include: { outlet: true } });
    if (!order || !["LOADED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) throw new Error("Order is not assigned and ready for Driver outcome.");
    const operation = await tx.syncOperation.create({ data: { operationId: input.operationId, accountId: session.accountId, entityType: "Order", entityId: order.id, payload: input } });
    if (input.clientUpdatedAt && order.updatedAt > new Date(input.clientUpdatedAt)) {
      await tx.syncConflict.create({ data: { operationId: operation.operationId, localPayload: input, serverPayload: { orderId: order.id, status: order.status, updatedAt: order.updatedAt.toISOString() } } });
      await tx.syncOperation.update({ where: { id: operation.id }, data: { status: "CONFLICT", serverPayload: { orderId: order.id, status: order.status, updatedAt: order.updatedAt.toISOString() } } });
      return operation.id;
    }
    await tx.deliveryOutcomeRecord.upsert({ where: { orderId: order.id }, update: { outcome: input.outcome, receiverName: input.receiverName, note: input.note }, create: { orderId: order.id, driverId: session.accountId, outcome: input.outcome, receiverName: input.receiverName, note: input.note } });
    if (input.photoKey) await tx.proofAsset.create({ data: { orderId: order.id, capturedById: session.accountId, type: "PHOTO", storageKey: input.photoKey } });
    if (input.signatureKey) await tx.proofAsset.create({ data: { orderId: order.id, capturedById: session.accountId, type: "SIGNATURE", storageKey: input.signatureKey } });
    const status = input.outcome === "DELIVERED" ? "DELIVERED" : "OUT_FOR_DELIVERY";
    await tx.order.update({ where: { id: order.id }, data: { status } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status, reason: input.note ?? input.outcome } });
    await tx.syncOperation.update({ where: { id: operation.id }, data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() } });
    const recipients = await tx.account.findMany({ where: { OR: [{ outletId: order.outletId }, { depotId: session.depotId }] }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.filter((recipient) => recipient.id !== session.accountId).map((recipient) => ({ recipientId: recipient.id, type: "DELIVERY", title: `${order.id} ${input.outcome === "DELIVERED" ? "delivered" : "needs attention"}`, body: input.note ?? "Driver outcome recorded.", entityType: "Order", entityId: order.id })) });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.id, action: "driver_outcome_recorded", payload: { operationId: input.operationId, outcome: input.outcome, receiverName: input.receiverName ?? null, proof: Boolean(input.photoKey || input.signatureKey) } } });
    return operation.id;
  });
}

export async function resolveDriverSyncConflict(operationId: string, resolution: "KEEP_LOCAL" | "KEEP_SERVER") {
  const session = await getSession();
  if (!session || session.role !== "driver") throw new Error("Driver access required.");
  const operation = await prisma.syncOperation.findFirst({ where: { operationId, accountId: session.accountId }, include: { conflict: true } });
  if (!operation?.conflict) throw new Error("Sync conflict not found.");
  await prisma.$transaction(async (tx) => {
    await tx.syncConflict.update({ where: { operationId }, data: { resolution, resolvedAt: new Date() } });
    await tx.syncOperation.update({ where: { operationId }, data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "SyncOperation", entityId: operation.id, action: "conflict_resolved", payload: { resolution } } });
  });
}