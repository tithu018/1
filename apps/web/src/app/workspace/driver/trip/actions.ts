"use server";

import { recordDriverOutcome } from "@/lib/workflow-actions";

export async function recordDelivery(orderId: string, proofNote?: string) {
  await recordDriverOutcome({ operationId: `delivery-${orderId}`, orderId, outcome: "DELIVERED", note: proofNote });
}

export async function reportDeliveryException(orderId: string, reason: string) {
  if (!reason.trim()) throw new Error("Choose a reason before recording the problem.");
  await recordDriverOutcome({ operationId: `problem-${orderId}-${reason.trim()}`, orderId, outcome: "CANNOT_DELIVER", note: reason });
}
