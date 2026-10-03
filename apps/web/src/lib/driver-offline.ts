export type PendingDelivery = { operationId: string; orderId: string; outcome: "DELIVERED" | "CANNOT_DELIVER"; receiverName?: string; note?: string; photoKey?: string; signatureKey?: string; clientUpdatedAt?: string };
export function readPending(accountId: string): PendingDelivery[] {
  try {
    const records: unknown = JSON.parse(localStorage.getItem(`waypoint-driver-pending-${accountId}`) ?? "[]");
    return Array.isArray(records) ? records.filter((record): record is PendingDelivery => Boolean(record && typeof record === "object" && typeof record.operationId === "string" && typeof record.orderId === "string" && ["DELIVERED", "CANNOT_DELIVER"].includes(record.outcome))) : [];
  } catch { return []; }
}
export function writePending(accountId: string, records: PendingDelivery[]) {
  localStorage.setItem(`waypoint-driver-pending-${accountId}`, JSON.stringify(records));
}
