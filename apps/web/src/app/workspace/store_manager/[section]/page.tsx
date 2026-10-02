import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./section.module.css";

const pages: Record<string, { active: string; title: string; subtitle: string; rows: string[][] }> = {
  status: {
    active: "Order status",
    title: "ORD0096653 - Dry (ambient)",
    subtitle: "Delivery Tue 24 Mar 2026 - window 05:00-07:30",
    rows: [["Submitted", "Mon 23 Mar"], ["Confirmed", "Accepted into the dispatcher's planning queue"], ["Allocated", "Vehicle VEH022 - Route R026429"], ["Loaded", "Loader flagged 2 units short before departure"], ["Out for delivery", "Tue 24 Mar"], ["Delivered", "Waiting for your receipt confirmation"]]
  },
  history: {
    active: "History & issues",
    title: "Orders and issue cases for OUT010",
    subtitle: "Shared order history and issue resolution",
    rows: [["ISS-0417", "2 cartons of Cream crackers short - Reported"], ["ORD0096653", "Dry order - Delivered"], ["ORD0096654", "Chilled order - Deferred to Wed 25 Mar"]]
  },
  notifications: {
    active: "Notifications",
    title: "4 unread",
    subtitle: "Notifications for OUT010",
    rows: [["ORD0096654 moved to Wed 25 Mar", "Second deferral in a row"], ["ORD0096653 delivered", "Confirm receipt"], ["Payday reminder", "Consider increased demand"]]
  },
  settings: {
    active: "Settings",
    title: "Notifications and outlet details",
    subtitle: "Colombo - Peliyagoda depot",
    rows: [["Outlet", "OUT010 - Fresh"], ["Delivery window", "05:00-07:30"], ["Planned closure", "Notify the dispatcher in advance if the outlet will be closed"]]
  }
};

export default async function StoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();

  return (
    <WorkspaceShell role="store_manager" active={page.active}>
      <section className={styles.page}>
        <header><h1>{page.title}</h1><p>{page.subtitle}</p></header>
        <section className={styles.card}>
          {page.rows.map(([title, detail]) => <article key={title}><strong>{title}</strong><span>{detail}</span></article>)}
        </section>
      </section>
    </WorkspaceShell>
  );
}
