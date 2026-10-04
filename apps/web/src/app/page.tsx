import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Grid2X2,
  Info,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  Store,
  Truck,
  WifiOff
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

type RoleCard = {
  title: string;
  description: string;
  device: string;
  role: string;
  icon: LucideIcon;
};

const roles: RoleCard[] = [
  { title: "Store Manager", description: "Place and track outlet orders, see planned arrivals and confirm receipt.", device: "Desktop · Phone", role: "store_manager", icon: Store },
  { title: "Dispatcher", description: "Build feasible delivery plans, explain deferrals and monitor live execution.", device: "Desktop", role: "dispatcher", icon: Grid2X2 },
  { title: "Loader", description: "Load trips against the published plan and flag shortfalls before departure.", device: "Tablet · Shared terminal", role: "loader", icon: Package },
  { title: "Driver", description: "Run your assigned route safely, capture proof of delivery and keep working offline.", device: "Phone", role: "driver", icon: Truck }
];

const platformFeatures = [
  { title: "One record, end to end", description: "Orders, plans, loading, delivery and receipt share a single history.", icon: ClipboardCheck },
  { title: "Role-based access", description: "Everyone sees only their outlet, depot or assigned trip.", icon: ShieldCheck },
  { title: "Keeps working offline", description: "Drivers can deliver without signal; records sync automatically.", icon: WifiOff },
  { title: "Live status updates", description: "Plan changes and delivery events reach the right people as they happen.", icon: RefreshCw }
];

const workflow = [
  ["Store order", "Outlet places and confirms an order before cutoff."],
  ["Dispatcher plan", "Suggested plan checked against vehicle and delivery rules, then published."],
  ["Loader hand-off", "Trip loaded in sequence; shortfalls flagged early."],
  ["Driver execution", "Guided stops with proof of delivery, online or offline."],
  ["Store receipt", "Receipt confirmed in full, short or damaged."],
  ["Issue resolution", "Evidence compared before any attribution."]
] as const;

const benefits = [
  { title: "Plans you can explain", description: "Every suggested plan shows its reasons, and a dispatcher approves it before it’s published.", icon: Route },
  { title: "Nothing slips through", description: "Each order, load and delivery ends with a confirmation — or a clear way to retry.", icon: CheckCircle2 },
  { title: "Safer on the road", description: "Drivers see detailed actions only once they’ve safely stopped.", icon: ShieldCheck },
  { title: "Fair issue resolution", description: "Loader counts, delivery proof and store receipts are compared before any decision.", icon: Info }
];

function Wordmark({ dark = false }: Readonly<{ dark?: boolean }>) {
  return (
    <Link className={styles.wordmark} href="/" aria-label="Waypoint home">
      <Image src={dark ? "/Image/logo-green-hq.png" : "/Image/logo-white-hq.png"} width={66} height={36} alt="" priority />
      <strong>Waypoint</strong>
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image className={styles.heroImage} src="/Image/landing-hero.webp" fill priority sizes="100vw" alt="Waypoint delivery network connecting stores, a distribution centre and vehicles" />
        <nav className={styles.nav} aria-label="Primary navigation">
          <Wordmark />
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#roles">Roles</a>
            <Link className={styles.navSignIn} href="/sign-in">Sign in</Link>
          </div>
        </nav>

        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>DELIVERY OPERATIONS PLATFORM</p>
          <h1>One shared workflow from outlet order to confirmed delivery.</h1>
          <p className={styles.heroLead}>Plan, load, deliver and confirm every outlet order in one connected workspace — with clear status for everyone involved.</p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/sign-in">Sign in</Link>
            <a className={styles.secondaryAction} href="#how-it-works">See how it works</a>
          </div>
          <div className={styles.statuses} aria-label="Shared status vocabulary">
            <span><Check aria-hidden="true" /> Delivered</span>
            <span className={styles.deferred}><Clock3 aria-hidden="true" /> Deferred</span>
            <span className={styles.pending}><RefreshCw aria-hidden="true" /> Sync pending</span>
            <small>Clear, shared status at every step</small>
          </div>
        </div>
      </section>

      <section className={styles.featureBand} aria-label="Platform benefits">
        <div className={styles.featureGrid}>
          {platformFeatures.map(({ title, description, icon: Icon }) => (
            <article key={title}>
              <span className={styles.featureIcon}><Icon aria-hidden="true" /></span>
              <div><h2>{title}</h2><p>{description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.rolesSection}`} id="roles">
        <p className={styles.eyebrow}>ROLES</p>
        <h2>Four roles. One shared system.</h2>
        <p className={styles.sectionLead}>Each role signs in to its own workspace, with the same status vocabulary, data and audit trail.</p>
        <div className={styles.roleGrid}>
          {roles.map(({ title, description, device, role, icon: Icon }) => (
            <Link href={`/sign-in?role=${role}`} key={title} className={styles.roleCard}>
              <span className={styles.circleIcon}><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              <div><b>{device}</b><ArrowRight aria-hidden="true" /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.workflowSection}`} id="how-it-works">
        <p className={styles.eyebrow}>HOW IT WORKS</p>
        <h2>One loop from order to resolution</h2>
        <div className={styles.workflowGrid}>
          {workflow.map(([title, description], index) => (
            <div className={styles.workflowItem} key={title}>
              <article><span>{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
              {index < workflow.length - 1 && <ArrowRight className={styles.stepArrow} aria-hidden="true" />}
            </div>
          ))}
        </div>
        <p className={styles.auditNote}><ShieldCheck aria-hidden="true" /> Every stage writes to one shared audit trail — changes are never silently overwritten.</p>
      </section>

      <section className={`${styles.section} ${styles.whySection}`}>
        <p className={styles.eyebrow}>WHY WAYPOINT</p>
        <h2>Built for everyday delivery operations</h2>
        <div className={styles.benefitGrid}>
          {benefits.map(({ title, description, icon: Icon }) => (
            <article key={title}><span className={styles.circleIcon}><Icon aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to get started?</h2>
        <p>Sign in with the account your administrator set up for you.</p>
        <Link className={styles.primaryAction} href="/sign-in">Sign in</Link>
      </section>

      <footer className={styles.footer}>
        <Wordmark />
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
