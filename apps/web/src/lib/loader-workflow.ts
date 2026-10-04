export type LoaderLineSeed = {
  lineKey: string;
  orderId: string;
  orderLineId: string | null;
  description: string;
  productCode: string;
  plannedQuantity: number;
};

type OrderSeed = {
  id: string;
  units: number;
  lines: Array<{ id: string; description: string; productCode: string; quantity: number }>;
};

export function loadLineSeeds(order: OrderSeed): LoaderLineSeed[] {
  if (order.lines.length) {
    return order.lines.map((line) => ({
      lineKey: `line:${line.id}`,
      orderId: order.id,
      orderLineId: line.id,
      description: line.description,
      productCode: line.productCode,
      plannedQuantity: line.quantity
    }));
  }
  return [{
    lineKey: `order:${order.id}`,
    orderId: order.id,
    orderLineId: null,
    description: "Order total",
    productCode: order.id,
    plannedQuantity: order.units
  }];
}

export function validateLoadAccounting(lines: Array<{ lineKey: string; plannedQuantity: number; loadedQuantity: number }>, issues: Array<{ lineKey: string; quantity: number | null; withdrawnAt: Date | string | null }>) {
  const problems: string[] = [];
  for (const line of lines) {
    const flagged = issues
      .filter((issue) => issue.lineKey === line.lineKey && !issue.withdrawnAt)
      .reduce((sum, issue) => sum + (issue.quantity ?? 0), 0);
    if (!Number.isSafeInteger(line.plannedQuantity) || line.plannedQuantity < 1) problems.push(`${line.lineKey} has an invalid planned quantity.`);
    if (!Number.isSafeInteger(line.loadedQuantity) || line.loadedQuantity < 0 || line.loadedQuantity > line.plannedQuantity) problems.push(`${line.lineKey} has an invalid loaded quantity.`);
    if (line.loadedQuantity + flagged !== line.plannedQuantity) problems.push(`${line.lineKey} is not fully loaded or documented by a flag.`);
  }
  return problems;
}

export function isFreshUrgent(brand: string, plannedStart: Date | string | null) {
  if (brand !== "FRESH" || !plannedStart) return false;
  const time = new Date(plannedStart);
  return Number.isFinite(time.getTime()) && Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Colombo" }).format(time)) < 8;
}
