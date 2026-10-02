"use server";

import { prisma } from "@waypoint/database";
import { freshCatalog } from "@waypoint/domain";
import { requireRole } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function submitFreshOrder(lines: { code: string; quantity: number }[], note: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  const catalog = new Map(freshCatalog.map((product) => [product.code, product]));
  const selected = lines.map((line) => ({ product: catalog.get(line.code), quantity: Number(line.quantity) })).filter((line) => line.product && Number.isInteger(line.quantity) && line.quantity > 0) as { product: (typeof freshCatalog)[number]; quantity: number }[];
  if (!selected.length) throw new Error("Add at least one product before submitting.");
  const totals = selected.reduce((sum, line) => ({ units: sum.units + line.quantity, weightKg: sum.weightKg + line.product.unitWeightKg * line.quantity, volumeM3: sum.volumeM3 + line.product.unitVolumeM3 * line.quantity }), { units: 0, weightKg: 0, volumeM3: 0 });
  const requestedDate = new Date(); requestedDate.setDate(requestedDate.getDate() + 1); requestedDate.setHours(0, 0, 0, 0);
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({ data: { id: `ORD-${randomUUID()}`, outletId: session.outletId!, requestedDate, status: "SUBMITTED", temperatureRequired: selected.some((line) => line.product.category === "Chilled") ? "REEFER" : "AMBIENT", units: totals.units, weightKg: totals.weightKg, volumeM3: totals.volumeM3, submittedAt: new Date(), deliveryWindowOpen: "05:00", deliveryWindowClose: "07:30", lines: { create: selected.map((line) => ({ id: `LINE-${randomUUID()}`, productCode: line.product.code, description: line.product.name, quantity: line.quantity, weightKg: line.product.unitWeightKg * line.quantity, volumeM3: line.product.unitVolumeM3 * line.quantity })) } } });
    await tx.orderStatusEvent.create({ data: { id: `STATUS-${randomUUID()}`, orderId: created.id, status: "SUBMITTED" } });
    await tx.auditEvent.create({ data: { id: `AUDIT-${randomUUID()}`, actorId: session.accountId, entityType: "Order", entityId: created.id, action: "submitted", payload: { note: note.trim() || null, units: totals.units } } });
    return created;
  });
  return order.id;
}

export async function updateStoreOrder(orderId: string, lines: { lineId: string; quantity: number }[]) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId }, include: { lines: true } });
    if (!order) throw new Error("Order not found for this outlet.");
    if (!["SUBMITTED", "CONFIRMED", "DEFERRED"].includes(order.status)) throw new Error("This order can no longer be edited.");
    const quantities = new Map(lines.map((line) => [line.lineId, Math.max(0, Math.floor(line.quantity))]));
    const updatedLines = order.lines.map((line) => ({ line, quantity: quantities.get(line.id) ?? line.quantity })).filter((entry) => entry.quantity > 0);
    if (!updatedLines.length) throw new Error("Keep at least one product on the order.");
    const units = updatedLines.reduce((sum, entry) => sum + entry.quantity, 0);
    const weightKg = updatedLines.reduce((sum, entry) => sum + Number(entry.line.weightKg) / entry.line.quantity * entry.quantity, 0);
    const volumeM3 = updatedLines.reduce((sum, entry) => sum + Number(entry.line.volumeM3) / entry.line.quantity * entry.quantity, 0);
    for (const entry of updatedLines) await tx.orderLine.update({ where: { id: entry.line.id }, data: { quantity: entry.quantity, weightKg: Number(entry.line.weightKg) / entry.line.quantity * entry.quantity, volumeM3: Number(entry.line.volumeM3) / entry.line.quantity * entry.quantity } });
    await tx.order.update({ where: { id: order.id }, data: { units, weightKg, volumeM3 } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.id, action: "updated", payload: { units, lineCount: updatedLines.length } } });
    return order.id;
  });
}

export async function cancelStoreOrder(orderId: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId } });
    if (!order || !["SUBMITTED", "CONFIRMED", "DEFERRED"].includes(order.status)) throw new Error("This order can no longer be cancelled.");
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "CANCELLED", reason: "Cancelled by Store Manager" } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.id, action: "cancelled" } });
  });
}

export async function acknowledgeDeferral(orderId: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  await prisma.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "deferral_acknowledged" } });
}
