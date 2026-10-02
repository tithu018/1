export type PendingDelivery = { operationId: string; orderId: string; outcome: "DELIVERED" | "CANNOT_DELIVER"; receiverName?: string; note?: string; clientUpdatedAt?: string };
export function readPending(accountId: string): PendingDelivery[] {
  try { return JSON.parse(localStorage.getItem(`waypoint-driver-pending-${accountId}`) ?? "[]"); } catch { return []; }
}
export function writePending(accountId: string, records: PendingDelivery[]) {
  localStorage.setItem(`waypoint-driver-pending-${accountId}`, JSON.stringify(records));
}
