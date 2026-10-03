import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readPending, writePending } from "./driver-offline";
let records: Map<string, string>;
beforeEach(() => { records = new Map(); vi.stubGlobal("localStorage", { getItem: (key: string) => records.get(key), setItem: (key: string, value: string) => records.set(key, value) }); });
afterEach(() => vi.unstubAllGlobals());
it("keeps pending delivery evidence isolated by account", () => {
  const evidence = { operationId: "offline-1", orderId: "order-1", outcome: "DELIVERED" as const, receiverName: "Receiver", photoKey: "proof/photo", clientUpdatedAt: "2026-10-02T00:00:00Z" };
  writePending("driver-a", [evidence]); expect(readPending("driver-a")).toEqual([evidence]); expect(readPending("driver-b")).toEqual([]);
  writePending("driver-a", []); expect(readPending("driver-a")).toEqual([]);
});
it("handles corrupt cache without crashing sync", () => { for (const value of ['{', '{}', '[null,{"outcome":"invalid"}]']) { records.set("waypoint-driver-pending-a", value); expect(readPending("a")).toEqual([]); } });
