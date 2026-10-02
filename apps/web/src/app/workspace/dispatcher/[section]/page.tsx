import { notFound } from "next/navigation";
import { prisma } from "@waypoint/database";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireRole } from "@/lib/auth";
import styles from "./section.module.css";

export default async function DispatcherSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!["board", "attention", "deferrals", "capacity", "reference"].includes(section)) notFound();
  const session = await requireRole("dispatcher");
  if (!session.depotId) notFound();
  const [plans, vehicles, outlets, orders, issues] = await Promise.all([
    prisma.plan.findMany({ where: { depotId: session.depotId }, include: { trips: { include: { vehicle: true, allocations: { include: { order: true }, orderBy: { sequence: "asc" } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.vehicle.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" }, take: 50 }),
    prisma.outlet.findMany({ where: { depotId: session.depotId }, orderBy: { id: "asc" }, take: 50 }),
    prisma.order.findMany({ where: { outlet: { depotId: session.depotId } }, include: { outlet: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.issueCase.findMany({ where: { order: { outlet: { depotId: session.depotId } }, status: { not: "RESOLVED" } }, include: { order: true }, orderBy: { updatedAt: "desc" }, take: 20 })
  ]);
  const latestPlan = plans[0];
  const pageTitle = section === "board" ? "Live Board" : section === "attention" ? "Needs Attention" : section === "deferrals" ? "Deferral Log" : section === "capacity" ? "Capacity Forecast" : "Reference Data";
  const pageSubtitle = section === "board" ? `${latestPlan ? `Plan v${latestPlan.version}` : "No published plan"} - live trip state from the shared record` : section === "attention" ? "Issues and planning exceptions that need a decision" : section === "deferrals" ? "Recorded deferred orders and their current status" : section === "capacity" ? "Current order demand against the registered fleet" : "Vehicles, outlets and planning constraints";
  const rows: string[][] = section === "board"
    ? (latestPlan?.trips.flatMap((trip) => [[trip.vehicleId, `${trip.status.replaceAll("_", " ")} - ${trip.allocations.length} stops`, trip.brand, trip.district]]) ?? [])
    : section === "attention"
      ? issues.map((issue) => [issue.id, `${issue.summary} - ${issue.status.replaceAll("_", " ")}`])
      : section === "deferrals"
        ? orders.filter((order) => order.status === "DEFERRED").map((order) => [order.id, `${order.outletId} - ${order.units} units - deferred`])
        : section === "capacity"
          ? [["Orders", String(orders.length)], ["Ambient units", String(orders.filter((order) => order.temperatureRequired === "AMBIENT").reduce((sum, order) => sum + order.units, 0))], ["Chilled units", String(orders.filter((order) => order.temperatureRequired === "REEFER").reduce((sum, order) => sum + order.units, 0))], ["Registered vehicles", String(vehicles.length)]]
          : [...vehicles.map((vehicle) => [vehicle.id, `${vehicle.temperature.toLowerCase()} - ${vehicle.isInWorkshop ? "Out of service" : "Available"}`]), ...outlets.map((outlet) => [outlet.id, `${outlet.brand} - ${outlet.dockType} dock`])];

  return (
    <WorkspaceShell role="dispatcher" active={pageTitle}>
      <section className={styles.page}>
        <header><h1>{pageTitle}</h1><p>{pageSubtitle}</p></header>
        <section className={styles.card}>
          {rows.length ? rows.map((row, index) => <article key={`${row[0]}-${index}`}><strong>{row[0]}</strong><span>{row.slice(1).join(" - ")}</span></article>) : <article><strong>Nothing to show yet</strong><span>Generate or publish a plan to populate this workspace.</span></article>}
        </section>
      </section>
    </WorkspaceShell>
  );
}
