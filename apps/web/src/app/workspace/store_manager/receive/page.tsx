import { WorkspaceShell } from "@/components/workspace-shell";
import { prisma } from "@waypoint/database";
import { requireRole } from "@/lib/auth";
import { displayDate, label } from "@/lib/format";
import { ReceiptConfirmation } from "./receipt-confirmation";

function shortReference(prefix: string, id: string) {
  const raw = id.replace(/^ORD-/i, "").replace(/[^a-z0-9]/gi, "");
  const numeric = raw.match(/\d+/g)?.join("") ?? "";
  if (numeric.length >= 4) return `${prefix}-${numeric.slice(-4)}`;
  const value = raw || id;
  const hashed = [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9000, 0);
  return `${prefix}-${1000 + hashed}`;
}

export default async function ReceivePage() {
  const session = await requireRole("store_manager");
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [orders, receivedThisWeek, issuesReported, totalDeliveries] = session.outletId
    ? await Promise.all([
      prisma.order.findMany({
        where: { outletId: session.outletId, status: "DELIVERED", receipt: { is: null } },
        include: {
          lines: true,
          outlet: true,
          loadIssues: true,
          deliveryOutcome: { include: { driver: true } },
          allocations: { include: { trip: { include: { driver: true, vehicle: true } } }, orderBy: { sequence: "asc" } }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.receiptRecord.count({ where: { confirmedAt: { gte: weekStart }, order: { outletId: session.outletId } } }),
      prisma.issueCase.count({ where: { createdAt: { gte: weekStart }, order: { outletId: session.outletId } } }),
      prisma.order.count({ where: { outletId: session.outletId, status: "DELIVERED" } })
    ])
    : [[], 0, 0, 0] as const;

  const deliveries = orders.map((order) => {
    const allocation = order.allocations[0];
    const deliveredAt = order.deliveryOutcome?.recordedAt ?? order.updatedAt;
    const items = order.lines.map((line) => ({
      code: line.id,
      product: `${line.description} (${line.productCode})`,
      ordered: line.quantity,
      delivered: line.quantity
    }));

    if (!items.length) {
      items.push({ code: order.id, product: "Order units", ordered: order.units, delivered: order.units });
    }

    return {
      id: order.id,
      orderRef: shortReference("ORD", order.id),
      deliveryRef: shortReference("DEL", order.id),
      requestedDate: order.requestedDate.toISOString(),
      requestedDateLabel: displayDate(order.requestedDate),
      deliveryWindow: `${order.deliveryWindowOpen}-${order.deliveryWindowClose}`,
      status: label(order.status),
      units: order.units,
      itemCount: items.length,
      brand: order.outlet.brand,
      type: order.temperatureRequired === "REEFER" ? "Chilled" : "Ambient",
      driverName: order.deliveryOutcome?.driver.displayName ?? allocation?.trip.driver?.displayName ?? "Not recorded",
      receiverName: order.deliveryOutcome?.receiverName ?? "Not recorded",
      vehicleId: allocation?.trip.vehicleId ?? "Not recorded",
      deliveredAt: deliveredAt.toISOString(),
      deliveredAtLabel: displayDate(deliveredAt),
      loaderNotes: order.loadIssues.map((issue) => issue.summary),
      items
    };
  });

  return (
    <WorkspaceShell role="store_manager" active="Receive">
      <ReceiptConfirmation
        deliveries={deliveries}
        summary={{
          awaitingReceipt: deliveries.length,
          receivedThisWeek,
          issuesReported,
          totalDeliveries
        }}
      />
    </WorkspaceShell>
  );
}
