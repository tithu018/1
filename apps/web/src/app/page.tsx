import Link from "next/link";
import { APP_NAME, roleLabels, userRoles } from "@waypoint/domain";
import styles from "./page.module.css";

const roleDescriptions = {
  store_manager: "Place and track outlet orders, see planned arrivals and confirm receipt.",
  dispatcher: "Build feasible delivery plans, explain deferrals and monitor live execution.",
  loader: "Load trips against the published plan and flag shortfalls before departure.",
  driver: "Run your assigned route safely, capture proof of delivery and keep working offline."
} as const;

export default function HomePage() {
  return (
    <main>
      <section className={styles.hero}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <span className={styles.logo}>W</span>
          <span className={styles.brand}>{APP_NAME}</span>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">Roles</a>
            <Link className={styles.signIn} href="/sign-in">Sign in</Link>
          </div>
        </nav>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>DELIVERY OPERATIONS PLATFORM</p>
          <h1>One shared workflow from outlet order to confirmed delivery.</h1>
          <p className={styles.lede}>Plan, load, deliver and confirm every outlet order in one connected workspace with clear status for everyone involved.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/sign-in">Sign in</Link>
            <a className={styles.secondary} href="#how-it-works">See how it works</a>
          </div>
        </div>
      </section>

      <section id="roles" className={styles.section}>
        <p className={styles.eyebrow}>ROLES</p>
        <h2>Four roles. One shared system.</h2>
        <p className={styles.sectionLead}>Each role signs in to its own workspace, with the same status vocabulary, data and audit trail.</p>
        <div className={styles.roleGrid}>
          {userRoles.map((role) => (
            <Link className={styles.roleCard} href={`/sign-in?role=${role}`} key={role}>
              <span className={styles.roleIcon} aria-hidden="true">{role === "driver" ? "↗" : "◌"}</span>
              <h3>{roleLabels[role]}</h3>
              <p>{roleDescriptions[role]}</p>
              <span className={styles.device}>{role === "dispatcher" ? "Desktop" : role === "loader" ? "Tablet · Shared terminal" : role === "driver" ? "Phone" : "Desktop · Phone"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <p className={styles.eyebrow}>HOW IT WORKS</p>
        <h2>One loop from order to resolution</h2>
        <ol className={styles.steps}>
          {[
            ["Store order", "Outlet places and confirms an order before cutoff."],
            ["Dispatcher plan", "Suggested plan is checked against vehicle and delivery rules, then published."],
            ["Loader hand-off", "Trip loaded in sequence; shortfalls flagged early."],
            ["Driver execution", "Guided stops with proof of delivery, online or offline."],
            ["Store receipt", "Receipt confirmed in full, short or damaged."],
            ["Issue resolution", "Evidence compared before any attribution."]
          ].map(([title, body], index) => (
            <li key={title}><span>{index + 1}</span><h3>{title}</h3><p>{body}</p></li>
          ))}
        </ol>
      </section>
    </main>
  );
}
