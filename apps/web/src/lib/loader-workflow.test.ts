import { describe, expect, it } from "vitest";
import { isFreshUrgent, loadLineSeeds, validateLoadAccounting } from "./loader-workflow";

describe("loader workflow", () => {
  it("uses real order lines and supplies an order fallback", () => {
    expect(loadLineSeeds({ id: "ORD-1", units: 4, lines: [{ id: "LINE-1", description: "Tea", productCode: "FR-1", quantity: 4 }] })).toEqual([{ lineKey: "line:LINE-1", orderId: "ORD-1", orderLineId: "LINE-1", description: "Tea", productCode: "FR-1", plannedQuantity: 4 }]);
    expect(loadLineSeeds({ id: "ORD-2", units: 3, lines: [] })[0]).toMatchObject({ lineKey: "order:ORD-2", plannedQuantity: 3 });
  });

  it("permits a documented partial load but rejects unexplained gaps", () => {
    const lines = [{ lineKey: "line:1", plannedQuantity: 10, loadedQuantity: 8 }];
    expect(validateLoadAccounting(lines, [{ lineKey: "line:1", quantity: 2, withdrawnAt: null }])).toEqual([]);
    expect(validateLoadAccounting(lines, [])).toHaveLength(1);
    expect(validateLoadAccounting(lines, [{ lineKey: "line:1", quantity: 2, withdrawnAt: new Date() }])).toHaveLength(1);
  });

  it("marks only pre-08:00 Fresh departures as urgent", () => {
    expect(isFreshUrgent("FRESH", "2026-10-04T01:30:00.000Z")).toBe(true);
    expect(isFreshUrgent("STYLE", "2026-10-04T01:30:00.000Z")).toBe(false);
    expect(isFreshUrgent("FRESH", "2026-10-04T03:00:00.000Z")).toBe(false);
  });
});
