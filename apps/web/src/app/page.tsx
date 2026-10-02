import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const roles = [
  ["Store Manager", "Place and track outlet orders, see planned arrivals and confirm receipt.", "Desktop · Phone", "store_manager", "store"],
  ["Dispatcher", "Build feasible delivery plans, explain deferrals and monitor live execution.", "Desktop", "dispatcher", "dispatch"],
  ["Loader", "Load trips against the published plan and flag shortfalls before departure.", "Tablet · Shared terminal", "loader", "load"],
  ["Driver", "Run your assigned route safely, capture proof of delivery and keep working offline.", "Phone", "driver", "drive"]
] as const;

const highlights = [
  ["record", "One record, end to end", "Orders, plans, loading, delivery and receipt share a single history."],
  ["access", "Role-based access", "Everyone sees only their outlet, depot or assigned trip."],
  ["offline", "Keeps working offline", "Drivers can deliver without signal; records sync automatically."],
  ["live", "Live status updates", "Plan changes and delivery events reach the right people as they happen."]
] as const;

const steps = [
  ["Store order", "Outlet places and confirms an order before cutoff."],
  ["Dispatcher plan", "Suggested plan is checked against vehicle and delivery rules, then published."],
  ["Loader hand-off", "Trip loaded in sequence; shortfalls flagged early."],
  ["Driver execution", "Guided stops with proof of delivery, online or offline."],
  ["Store receipt", "Receipt confirmed in full, short or damaged."],
  ["Issue resolution", "Evidence compared before any attribution."]
] as const;

const benefits = [
  ["plan", "Plans you can explain", "Every suggested plan shows its reasons, and a dispatcher approves it before it’s published."],
  ["check", "Nothing slips through", "Each order, load and delivery ends with a confirmation — or a clear way to retry."],
  ["safe", "Safer on the road", "Drivers see detailed actions only once they’ve safely stopped."],
  ["fair", "Fair issue resolution", "Loader counts, delivery proof and store receipts are compared before any decision."]
] as const;

function Mark({ kind }: Readonly<{ kind: string }>) {
  return <span aria-hidden="true" className={`${styles.mark} ${styles[kind]}`} />;
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.mobileDriverLanding} aria-label="Waypoint Driver">
        <header>
          <Link href="/" aria-label="Waypoint home">
            <Image src="/Image/logo-green-hq.png" width={59} height={32} alt="Waypoint" priority />
          </Link>
          <Link href="/sign-in?role=driver">Sign in</Link>
        </header>
        <div className={styles.mobileDriverContent}>
          <div className={styles.driverHeroArt}>
            <Image src="/Image/driver.png" fill sizes="350px" alt="Waypoint driver reviewing a delivery stop" priority />
          </div>
          <p className={styles.eyebrow}>WAYPOINT DRIVER</p>
          <h1>Your deliveries, stop by stop.</h1>
          <p className={styles.driverLead}>Your assigned trip, a safe Drive Mode and delivery records that keep working without signal.</p>
          <div className={styles.driverBenefits}>
            <article><Mark kind="live" /><div><strong>Drive Mode</strong><p>Next stop, ETA and window — big and glanceable while you drive.</p></div></article>
            <article><Mark kind="offline" /><div><strong>Works offline</strong><p>Deliveries are saved on your phone and sync when the signal returns.</p></div></article>
            <article><Mark kind="check" /><div><strong>One tap at each stop</strong><p>Mark delivered; the store confirms what arrived.</p></div></article>
          </div>
          <Link className={styles.mobileDriverSignIn} href="/sign-in?role=driver">Sign in</Link>
          <p className={styles.mobileAudience}>For Waypoint drivers. Store managers, dispatchers and loaders use the desktop web app.</p>
          <small>© 2026 Waypoint</small>
        </div>
      </section>
      <section className={styles.hero}>
        <Image className={styles.heroImage} src="/Image/f1.png" fill priority sizes="100vw" alt="Delivery vehicles travelling between connected outlet locations" />
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link className={styles.logo} href="/" aria-label="Waypoint home">
            <Image src="/Image/logo-white-hq.png" width={66} height={36} alt="" priority />
            <strong>Waypoint</strong>
          </Link>
          <div>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">Roles</a>
            <Link className={styles.navSignIn} href="/sign-in">Sign in</Link>
          </div>
        </nav>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>DELIVERY OPERATIONS PLATFORM</p>
          <h1>One shared workflow from outlet order to confirmed delivery.</h1>
          <p>Plan, load, deliver and confirm every outlet order in one connected workspace — with clear status for everyone involved.</p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/sign-in">Sign in</Link>
            <a className={styles.secondaryAction} href="#how-it-works">See how it works</a>
          </div>
          <div className={styles.statuses} aria-label="Shared status vocabulary">
            <b className={styles.success}>✓ Delivered</b>
            <b className={styles.warning}>△ Deferred</b>
            <b className={styles.sync}>↻ Sync pending</b>
            <span>Clear, shared status at every step</span>
          </div>
        </div>
      </section>

      <section className={styles.highlights} aria-label="Platform highlights">
        {highlights.map(([kind, title, text]) => (
          <article key={title}>
            <div className={styles.cardTitle}><Mark kind={kind} /><strong>{title}</strong></div>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className={styles.section} id="roles">
        <p className={styles.eyebrow}>ROLES</p>
        <h2>Four roles. One shared system.</h2>
        <p className={styles.lead}>Each role signs in to its own workspace, with the same status vocabulary, data and audit trail.</p>
        <div className={styles.cards}>
          {roles.map(([title, text, device, role, kind]) => (
            <Link href={`/sign-in?role=${role}`} key={title}>
              <Mark kind={kind} />
              <h3>{title}</h3>
              <p>{text}</p>
              <b>{device}<span aria-hidden="true">→</span></b>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.workflow}`} id="how-it-works">
        <p className={styles.eyebrow}>HOW IT WORKS</p>
        <h2>One loop from order to resolution</h2>
        <div className={styles.steps}>
          {steps.map(([title, text], index) => (
            <article key={title}>
              <i>{index + 1}</i>
              <h3>{title}</h3>
              <p>{text}</p>
              {index < steps.length - 1 && <span aria-hidden="true">→</span>}
            </article>
          ))}
        </div>
        <small><Mark kind="audit" /> Every stage writes to one shared audit trail — changes are never silently overwritten.</small>
      </section>

      <section className={styles.section}>
        <p className={styles.eyebrow}>WHY WAYPOINT</p>
        <h2>Built for everyday delivery operations</h2>
        <div className={styles.cards}>
          {benefits.map(([kind, title, text]) => (
            <article key={title}>
              <Mark kind={kind} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to get started?</h2>
        <p>Sign in with the account your administrator set up for you.</p>
        <Link href="/sign-in">Sign in</Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.logo} href="/" aria-label="Waypoint home">
          <Image src="/Image/logo-white-hq.png" width={66} height={36} alt="" />
          <strong>Waypoint</strong>
        </Link>
        <nav aria-label="Footer navigation">
          <a href="mailto:support@waypoint.example">Help centre</a>
          <a href="mailto:support@waypoint.example">Contact support</a>
          <span>Privacy</span>
          <span>Terms of use</span>
        </nav>
        <span>© 2026 Waypoint. All rights reserved.</span>
      </footer>
    </main>
  );
}
