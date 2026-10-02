import Image from "next/image";
import Link from "next/link";
import { APP_NAME, roleLabels, type UserRole, userRoles } from "@waypoint/domain";
import { signIn } from "./actions";
import styles from "./sign-in.module.css";

const validRoles = new Set<string>(userRoles);

const roleCopy: Record<UserRole, { detail: string; device: string; image: string }> = {
  store_manager: {
    detail: "Place and track outlet orders, see planned arrivals and confirm receipt.",
    device: "Desktop - Phone",
    image: "/Image/store-manager.webp"
  },
  dispatcher: {
    detail: "Build feasible delivery plans, explain deferrals and monitor live execution.",
    device: "Desktop",
    image: "/Image/dispatcher.webp"
  },
  loader: {
    detail: "Load trips against the published plan and flag shortfalls before departure.",
    device: "Tablet - Shared terminal",
    image: "/Image/loader.webp"
  },
  driver: {
    detail: "Run your assigned route safely, capture proof of delivery and keep working offline.",
    device: "Phone",
    image: "/Image/driver.webp"
  }
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ role?: string; error?: string }> }) {
  const { role: requestedRole, error } = await searchParams;
  const role = validRoles.has(requestedRole ?? "") ? (requestedRole as UserRole) : undefined;

  if (!role) return <RoleChooser />;
  if (role === "driver") return <DriverSignIn error={error} />;
  return <DesktopSignIn role={role} error={error} />;
}

function RoleChooser() {
  return (
    <main className={styles.chooser}>
      <header className={styles.chooserTop}>
        <Link href="/" className={styles.wordmark}>
          <Image src="/Image/logo-green.png" alt="" width={47} height={32} priority />
          <span>{APP_NAME}</span>
        </Link>
        <Link href="/" className={styles.back}>← Back to home</Link>
      </header>
      <section className={styles.chooserIntro}>
        <p>SIGN IN</p>
        <h1>How are you signing in today?</h1>
        <span>Choose your role. Each role signs in to its own workspace.</span>
      </section>
      <div className={styles.grid}>
        {userRoles.map((item) => (
          <Link key={item} href={`/sign-in?role=${item}`} className={styles.role}>
            <span className={`${styles.roleIcon} ${styles[item]}`} aria-hidden="true" />
            <h2>{roleLabels[item]}</h2>
            <p>{roleCopy[item].detail}</p>
            <b>{roleCopy[item].device}</b>
            <i aria-hidden="true">→</i>
          </Link>
        ))}
      </div>
      <aside className={styles.notice}>
        <strong>ⓘ Not sure which role to choose?</strong>
        <span>Your role is assigned by your Waypoint administrator. If you pick the wrong one, you will see a message explaining your access.</span>
      </aside>
    </main>
  );
}

function DesktopSignIn({ role, error }: Readonly<{ role: UserRole; error?: string }>) {
  return (
    <main className={styles.split}>
      <section className={styles.art}>
        <Link href="/" className={styles.lightLogo}>
          <Image src="/Image/logo-white.png" alt="" width={47} height={32} priority />
          <span>{APP_NAME}</span>
        </Link>
        <Image className={styles.roleArt} src={roleCopy[role].image} alt="" width={420} height={420} priority />
        <div className={styles.artContent}>
          <p>SIGNING IN AS</p>
          <h1>{roleLabels[role]}</h1>
          <span>{roleCopy[role].detail}</span>
        </div>
      </section>
      <section className={styles.formArea}>
        <SignInForm role={role} error={error} />
        {role === "store_manager" && (
          <aside className={styles.demoOutlets}>
            <strong>PROTOTYPE - DEMO OUTLETS</strong>
            <div>
              <button type="button">Fresh - OUT010</button>
              <button type="button">Style - OUT017</button>
              <button type="button">Tech - OUT022</button>
            </div>
            <span>In the live system the registered outlet decides the workspace.</span>
          </aside>
        )}
      </section>
    </main>
  );
}

function DriverSignIn({ error }: Readonly<{ error?: string }>) {
  return (
    <main className={styles.driverSignIn}>
      <header>
        <Image src="/Image/logo-green.png" alt={APP_NAME} width={47} height={32} priority />
        <Link href="/sign-in">← Back</Link>
      </header>
      <section className={styles.driverForm}>
        <span className={styles.driverPill}>▣ Signing in as Driver</span>
        <SignInForm role="driver" error={error} compact />
      </section>
    </main>
  );
}

function SignInForm({ role, error, compact }: Readonly<{ role: UserRole; error?: string; compact?: boolean }>) {
  return (
    <form className={`${styles.form} ${compact ? styles.compactForm : ""}`} action={signIn}>
      <h2>Sign in</h2>
      <p>to the {roleLabels[role]} workspace</p>
      {error && (
        <p className={styles.error}>
          <strong>{error === "access" ? "Check the highlighted field" : "Could not reach Waypoint"}</strong>
          <span>{error === "access" ? "Your password was kept. Add your email or staff ID to continue." : "Check your email or staff ID, password, and selected role."}</span>
        </p>
      )}
      <input type="hidden" name="role" value={role} />
      <label htmlFor="identifier">Email or staff ID</label>
      <input id="identifier" name="identifier" autoComplete="username" placeholder="Enter your email or staff ID" required />
      <small>ⓘ Use the email or staff ID from your administrator.</small>
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
      <small>ⓘ Passwords are case-sensitive.</small>
      <div className={styles.options}>
        <label>
          <input type="checkbox" /> Label
        </label>
        <Link href="/sign-in/reset">Forgot password?</Link>
      </div>
      <button type="submit">Sign in</button>
      <hr />
      <Link href={compact ? "/" : "/sign-in"} className={styles.choose}>← {compact ? "Back to start" : "Choose a different role"}</Link>
      {!compact && <p className={styles.language}>◎ English⌄</p>}
    </form>
  );
}
