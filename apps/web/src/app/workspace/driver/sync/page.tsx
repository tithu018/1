import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./sync.module.css";

export default function DriverSyncPage() {
  return (
    <WorkspaceShell role="driver" active="Sync">
      <section className={styles.sync}>
        <header><h1>Sync</h1><span>Up to date</span></header>
        <aside><strong>✓ Up to date</strong><p>All delivery records are on the server. Pending count cleared.</p></aside>
        <section>
          <article><strong>OUT008 - Delivered</strong><span>Stop 1 - 04:36</span><b>Synced</b></article>
          <article><strong>OUT010 - Next</strong><span>Stop 2 - ETA 04:57</span><b>Ready</b></article>
        </section>
      </section>
    </WorkspaceShell>
  );
}
