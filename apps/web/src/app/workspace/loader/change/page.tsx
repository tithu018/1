import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./change.module.css";

const before = [
  ["Vehicle", "VEH025 - ambient truck"],
  ["Capacity", "3,800 kg - 22 m3"],
  ["Stops", "7 - Kalutara"],
  ["Departs", "03:53"],
  ["Status", "Out of service"]
] as const;

const now = [
  ["Vehicle", "VEH009 - ambient truck"],
  ["Capacity", "5,800 kg - 30 m3"],
  ["Stops", "7 - Kalutara - same order"],
  ["Departs", "03:53"],
  ["Status", "Ready at the dock"]
] as const;

const actions = [
  ["1st", "7", "OUT045", "ORD0096832", "33", "Loaded on VEH025 -> move"],
  ["2nd", "6", "OUT044", "ORD0096831", "45", "Loaded on VEH025 -> move"],
  ["3rd", "5", "OUT042", "ORD0096828", "115", "Loaded on VEH025 -> move"],
  ["4th", "4", "OUT040", "ORD0096824", "103", "Not loaded -> load on VEH009"],
  ["5th", "3", "OUT046", "ORD0096833", "35", "Not loaded -> load on VEH009"],
  ["6th", "2", "OUT043", "ORD0096830", "34", "Not loaded -> load on VEH009"],
  ["7th", "1", "OUT041", "ORD0096826", "52", "Not loaded -> load on VEH009"]
] as const;

export default function LoaderChangePage() {
  return (
    <WorkspaceShell role="loader" active="Trip queue">
      <section className={styles.changePage}>
        <Link className={styles.back} href="/workspace/loader">
          ← Trip queue
        </Link>
        <header className={styles.heading}>
          <h1>Plan changed - Kalutara trip</h1>
          <p>Plan v2 published by the Dispatcher at 03:08</p>
        </header>

        <section className={styles.alert}>
          <b>⊗ VEH025 is out of service - this trip moves to VEH009</b>
          <span>Move the stops you have already loaded, then load the rest straight onto VEH009. Departure stays at 03:53.</span>
        </section>

        <div className={styles.compare}>
          <article className={styles.before}>
            <h2>Before - plan v1</h2>
            <dl>
              {before.map(([term, detail]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{detail}</dd>
                </div>
              ))}
            </dl>
          </article>
          <article className={styles.now}>
            <h2>Now - plan v2</h2>
            <dl>
              {now.map(([term, detail]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{detail}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>

        <section className={styles.whatToDo}>
          <h2>What to do</h2>
          <table>
            <thead>
              <tr>
                <th>Load order</th>
                <th>Stop</th>
                <th>Outlet</th>
                <th>Order</th>
                <th>Units</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((row, index) => (
                <tr className={index < 3 ? styles.moveRow : ""} key={row[2]}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td>{row[4]}</td>
                  <td>
                    <span className={index < 3 ? styles.moveBadge : styles.loadBadge}>{index < 3 ? "⚠" : "◷"} {row[5]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className={styles.actions}>
          <Link href="/workspace/loader/load">Acknowledge and re-verify</Link>
          <span>Your acknowledgement is recorded in the audit trail.</span>
        </footer>
      </section>
    </WorkspaceShell>
  );
}
