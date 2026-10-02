import Link from "next/link";
import { WorkspaceShell } from "@/components/workspace-shell";
import styles from "./queue.module.css";

const metrics = [
  ["22", "Trips today", "Peliyagoda"],
  ["5", "Loaded", "Handed to drivers"],
  ["1", "Loading", "VEH001"],
  ["1", "Plan changed", "Needs re-verification"],
  ["15", "Not started", "Next: VEH012 at 04:08"]
] as const;

const trips = [
  ["02:00", "VEH007", "Trip 1 - Puttalam", "1", "Chilled", "Loaded"],
  ["02:00", "VEH008", "Trip 1 - Puttalam", "3", "Ambient", "Loaded"],
  ["02:39", "VEH016", "Trip 1 - Kurunegala", "4", "Ambient", "Loaded"],
  ["02:57", "VEH015", "Trip 1 - Matara", "4", "Ambient", "Loaded"],
  ["03:09", "VEH018", "Trip 1 - Galle", "6", "Ambient", "Loaded"],
  ["03:22", "VEH001", "Trip 1 - Galle", "6", "Chilled", "Loading"],
  ["03:53", "VEH009", "Trip 1 - Kalutara (was VEH025)", "7", "Ambient", "Plan changed"],
  ["04:08", "VEH012", "Trip 1 - Colombo", "5", "Ambient", "Not started"],
  ["04:14", "VEH005", "Trip 1 - Colombo", "7", "Chilled - reefer check", "Not started"],
  ["04:15", "VEH003", "Trip 1 - Kalutara", "3", "Chilled - reefer check", "Not started"]
] as const;

function statusClass(status: string) {
  if (status === "Loading") return styles.loading;
  if (status === "Plan changed") return styles.planChanged;
  if (status === "Not started") return styles.notStarted;
  return styles.loaded;
}

function statusIcon(status: string) {
  if (status === "Loaded") return "✓";
  if (status === "Loading") return "↻";
  if (status === "Plan changed") return "⊗";
  return "◷";
}

export default function LoaderQueuePage() {
  return (
    <WorkspaceShell role="loader" active="Trip queue">
      <section className={styles.queue}>
        <header className={styles.heading}>
          <h1>Trip queue</h1>
          <p>Wed 25 Mar 2026 - plan v2 - earliest departures first</p>
        </header>

        <section className={styles.change}>
          <div className={styles.changeCopy}>
            <b>
              <span aria-hidden="true">⊗</span>
              Plan changed at 03:08 - Kalutara trip
            </b>
            <span>VEH025 is out of service. The trip moves to VEH009 - check what you have already loaded.</span>
          </div>
          <Link href="/workspace/loader/change">View change</Link>
        </section>

        <div className={styles.metrics}>
          {metrics.map(([value, label, detail]) => (
            <article className={label === "Plan changed" ? styles.warningMetric : ""} key={label}>
              <strong>{value}</strong>
              <b>{label}</b>
              <span>{detail}</span>
            </article>
          ))}
        </div>

        <section className={styles.tableCard}>
          <table>
            <thead>
              <tr>
                <th>Departs</th>
                <th>Vehicle</th>
                <th>Trip</th>
                <th>Stops</th>
                <th>Temperature</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr className={trip[5] === "Plan changed" ? styles.changed : ""} key={`${trip[0]}-${trip[1]}`}>
                  <td>{trip[0]}</td>
                  <td>{trip[1]}</td>
                  <td>{trip[2]}</td>
                  <td>{trip[3]}</td>
                  <td>{trip[4]}</td>
                  <td>
                    <span className={`${styles.badge} ${statusClass(trip[5])}`}>
                      {statusIcon(trip[5])} {trip[5]}
                    </span>
                  </td>
                  <td>{trip[5] !== "Loaded" && <Link href={trip[1] === "VEH009" ? "/workspace/loader/change" : "/workspace/loader/load"}>Open</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Showing 10 of 22 trips - 12 more depart between 04:30 and 09:54</p>
        </section>
      </section>
    </WorkspaceShell>
  );
}
