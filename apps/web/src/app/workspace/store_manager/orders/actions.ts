"use server";

import { prisma } from "@waypoint/database";
import { freshCatalog } from "@waypoint/domain";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { serializable } from "@/lib/transactions";
import { randomUUID } from "crypto";
import { nextServiceDate } from "@/lib/operating-date";

export async function submitFreshOrder(lines: { code: string; quantity: number }[], note: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  const outlet = await prisma.outlet.findUnique({ where: { id: session.outletId } });
  if (!outlet || outlet.brand !== "FRESH") throw new Error("This catalogue is available to Fresh outlets only.");
  const catalog = new Map(freshCatalog.map((product) => [product.code, product]));
  if (!lines.length || new Set(lines.map((line) => line.code)).size !== lines.length || lines.some((line) => !catalog.has(line.code) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 100000)) throw new Error("Choose valid products with whole positive quantities.");
  const selected = lines.map((line) => ({ product: catalog.get(line.code), quantity: Number(line.quantity) })).filter((line) => line.product && Number.isInteger(line.quantity) && line.quantity > 0) as { product: (typeof freshCatalog)[number]; quantity: number }[];
  if (!selected.length) throw new Error("Add at least one product before submitting.");
  const totals = selected.reduce((sum, line) => ({ units: sum.units + line.quantity, weightKg: sum.weightKg + line.product.unitWeightKg * line.quantity, volumeM3: sum.volumeM3 + line.product.unitVolumeM3 * line.quantity }), { units: 0, weightKg: 0, volumeM3: 0 });
  const requestedDate = nextServiceDate();
  const order = await serializable(async (tx) => {
    const created = await tx.order.create({ data: { id: `ORD-${randomUUID()}`, outletId: session.outletId!, requestedDate, status: "SUBMITTED", temperatureRequired: selected.some((line) => line.product.category === "Chilled") ? "REEFER" : "AMBIENT", units: totals.units, weightKg: totals.weightKg, volumeM3: totals.volumeM3, submittedAt: new Date(), deliveryWindowOpen: outlet.windowOpenTime, deliveryWindowClose: outlet.windowCloseTime, lines: { create: selected.map((line) => ({ id: `LINE-${randomUUID()}`, productCode: line.product.code, description: line.product.name, quantity: line.quantity, weightKg: line.product.unitWeightKg * line.quantity, volumeM3: line.product.unitVolumeM3 * line.quantity })) } } });
    await tx.orderStatusEvent.create({ data: { id: `STATUS-${randomUUID()}`, orderId: created.id, status: "SUBMITTED" } });
    await tx.auditEvent.create({ data: { id: `AUDIT-${randomUUID()}`, actorId: session.accountId, entityType: "Order", entityId: created.id, action: "submitted", payload: { note: note.trim() || null, units: totals.units } } });
    return created;
  });
  revalidatePath("/workspace/store_manager");
  revalidatePath("/workspace/store_manager/status");
  revalidatePath("/workspace/store_manager/history");
  return { id: order.id, submittedAt: order.submittedAt!.toISOString(), requestedDate: order.requestedDate.toISOString() };
}

export async function submitRetailOrder(input: { code: string; description: string; quantity: number; unitWeightKg: number; unitVolumeM3: number; note: string }) {
  const session = await requireRole("store_manager");
  const outlet = session.outletId ? await prisma.outlet.findUnique({ where: { id: session.outletId } }) : null;
  if (!outlet || outlet.brand === "FRESH") throw new Error("Style or Tech outlet access required.");
  if (!input.code.trim() || input.code.length > 100 || !input.description.trim() || input.description.length > 300 || !Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 100000 || !Number.isFinite(input.unitWeightKg) || input.unitWeightKg <= 0 || !Number.isFinite(input.unitVolumeM3) || input.unitVolumeM3 <= 0 || input.unitWeightKg * input.quantity >= 1e10 || input.unitVolumeM3 * input.quantity >= 1e9) throw new Error("Enter an item, whole quantity, weight and volume within supported limits.");
  const requestedDate = nextServiceDate();
  const order = await serializable(async (tx) => {
    const created = await tx.order.create({ data: { id: `ORD-${randomUUID()}`, outletId: outlet.id, requestedDate, submittedAt: new Date(), units: input.quantity, weightKg: input.quantity * input.unitWeightKg, volumeM3: input.quantity * input.unitVolumeM3, temperatureRequired: "AMBIENT", deliveryWindowOpen: outlet.windowOpenTime, deliveryWindowClose: outlet.windowCloseTime, lines: { create: { productCode: input.code.trim(), description: input.description.trim(), quantity: input.quantity, weightKg: input.quantity * input.unitWeightKg, volumeM3: input.quantity * input.unitVolumeM3 } } } });
    await tx.orderStatusEvent.create({ data: { orderId: created.id, status: "SUBMITTED" } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: created.id, action: "submitted", payload: { note: input.note.trim() || null, brand: outlet.brand } } });
    return created;
  });
  revalidatePath("/workspace/store_manager");
  revalidatePath("/workspace/store_manager/status");
  revalidatePath("/workspace/store_manager/history");
  return { id: order.id, submittedAt: order.submittedAt!.toISOString(), requestedDate: order.requestedDate.toISOString() };
}

export async function updateStoreOrder(orderId: string, lines: { lineId: string; quantity: number }[]) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  const updatedId = await serializable(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId }, include: { lines: true } });
    if (!order) throw new Error("Order not found for this outlet.");
    if (!["SUBMITTED", "CONFIRMED", "DEFERRED"].includes(order.status)) throw new Error("This order can no longer be edited.");
    if (!lines.length || new Set(lines.map((line) => line.lineId)).size !== lines.length || lines.some((line) => !order.lines.some((existing) => existing.id === line.lineId) || !Number.isSafeInteger(line.quantity) || line.quantity < 0 || line.quantity > 100000)) throw new Error("Choose valid order lines and whole quantities.");
    const quantities = new Map(lines.map((line) => [line.lineId, line.quantity]));
    const updatedLines = order.lines.map((line) => ({ line, quantity: quantities.get(line.id) ?? line.quantity })).filter((entry) => entry.quantity > 0);
    if (!updatedLines.length) throw new Error("Keep at least one product on the order.");
    const units = updatedLines.reduce((sum, entry) => sum + entry.quantity, 0);
    const weightKg = updatedLines.reduce((sum, entry) => sum + Number(entry.line.weightKg) / entry.line.quantity * entry.quantity, 0);
    const volumeM3 = updatedLines.reduce((sum, entry) => sum + Number(entry.line.volumeM3) / entry.line.quantity * entry.quantity, 0);
    await tx.orderLine.deleteMany({ where: { orderId: order.id, id: { notIn: updatedLines.map((entry) => entry.line.id) } } });
    for (const entry of updatedLines) await tx.orderLine.update({ where: { id: entry.line.id }, data: { quantity: entry.quantity, weightKg: Number(entry.line.weightKg) / entry.line.quantity * entry.quantity, volumeM3: Number(entry.line.volumeM3) / entry.line.quantity * entry.quantity } });
    await tx.order.update({ where: { id: order.id }, data: { units, weightKg, volumeM3 } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.id, action: "updated", payload: { units, lineCount: updatedLines.length } } });
    return order.id;
  });
  revalidatePath("/workspace/store_manager");
  revalidatePath("/workspace/store_manager/status");
  revalidatePath(`/workspace/store_manager/orders/${orderId}`);
  return updatedId;
}

export async function cancelStoreOrder(orderId: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  await serializable(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId } });
    if (!order || !["SUBMITTED", "CONFIRMED", "DEFERRED"].includes(order.status)) throw new Error("This order can no longer be cancelled.");
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "CANCELLED", reason: "Cancelled by Store Manager" } });
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: order.id, action: "cancelled" } });
  });
  revalidatePath("/workspace/store_manager");
  revalidatePath("/workspace/store_manager/status");
  revalidatePath("/workspace/store_manager/history");
  revalidatePath(`/workspace/store_manager/orders/${orderId}`);
}

export async function acknowledgeDeferral(orderId: string) {
  const session = await requireRole("store_manager");
  if (!session.outletId) throw new Error("The signed-in store account is not linked to an outlet.");
  await serializable(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, outletId: session.outletId, status: "DEFERRED" } });
    if (!order) throw new Error("Deferred order not found for your outlet.");
    await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Order", entityId: orderId, action: "deferral_acknowledged" } });
  });
  revalidatePath("/workspace/store_manager");
  revalidatePath("/workspace/store_manager/status");
}
