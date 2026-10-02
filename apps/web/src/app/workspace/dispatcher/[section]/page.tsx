import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./section.module.css";

const pages: Record<string, { active: string; title: string; subtitle: string; rows: string[][] }> = {
  board: {
    active: "Live Board",
    title: "Live Board",
    subtitle: "Wed 25 Mar 2026 - 05:40 - Plan v2",
    rows: [["VEH012", "Loaded - driver starting route"], ["VEH009", "Plan changed - verified"], ["OUT009", "Delivery waiting for driver review before sync"]]
  },
  attention: {
    active: "Needs Attention",
    title: "Needs Attention",
    subtitle: "Issues and planning exceptions that need a decision",
    rows: [["ISS-0417", "Store reported shortfall also flagged by loader"], ["ORD0096815", "210 chilled units - 1.6x usual order"], ["OUT010", "Second deferral in a row"]]
  },
  deferrals: {
    active: "Deferral Log",
    title: "Deferral Log",
    subtitle: "Recorded reasons and next actions for deferred orders",
    rows: [["ORD0096654", "Capacity full - moved to Wed 25 Mar"], ["ORD0096518", "Temperature vehicle unavailable - protected outlet"], ["ORD0096862", "Vehicle access restriction"]]
  },
  capacity: {
    active: "Capacity Forecast",
    title: "Capacity Forecast",
    subtitle: "Demand and vehicle load forecast",
    rows: [["Fresh chilled", "Near capacity on Wed 25 Mar"], ["Ambient dry", "Sufficient capacity"], ["Style & Tech", "Mall dock routes need van compatibility"]]
  },
  reference: {
    active: "Reference Data",
    title: "Reference Data",
    subtitle: "Vehicles, outlet rules and planning constraints",
    rows: [["VEH025", "Out of service"], ["OUT035", "Mall bay - dock access"], ["Rule", "No order may be split across vehicles"]]
  }
};

export default async function DispatcherSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();

  return (
    <WorkspaceShell role="dispatcher" active={page.active}>
      <section className={styles.page}>
        <header><h1>{page.title}</h1><p>{page.subtitle}</p></header>
        <section className={styles.card}>
          {page.rows.map(([title, detail]) => <article key={title}><strong>{title}</strong><span>{detail}</span></article>)}
        </section>
      </section>
    </WorkspaceShell>
  );
}
