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
    image: "/Image/store-manager.png"
  },
  dispatcher: {
    detail: "Build feasible delivery plans, explain deferrals and monitor live execution.",
    device: "Desktop",
    image: "/Image/dispatcher.png"
  },
  loader: {
    detail: "Load trips against the published plan and flag shortfalls before departure.",
    device: "Tablet - Shared terminal",
    image: "/Image/loader.png"
  },
  driver: {
    detail: "Run your assigned route safely, capture proof of delivery and keep working offline.",
    device: "Phone",
    image: "/Image/driver.png"
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
          <Image src="/Image/logo-green-hq.png" alt="" width={66} height={36} priority />
          <span>{APP_NAME}</span>
        </Link>

      </header>
      <section className={styles.chooserIntro}>
        <p>SIGN IN</p>
        <h1>Choose your role</h1>

      </section>
      <div className={styles.grid}>
        {userRoles.map((item) => (
          <Link key={item} href={`/sign-in?role=${item}`} className={styles.role}>
            <span className={`${styles.roleIcon} ${styles[item]}`} aria-hidden="true" />
            <h2>{roleLabels[item]}</h2>


            <i aria-hidden="true">→</i>
          </Link>
        ))}
      </div>

    </main>
  );
}

function DesktopSignIn({ role, error }: Readonly<{ role: UserRole; error?: string }>) {
  return (
    <main className={styles.split}>
      <section className={styles.art}>
        <Link href="/" className={styles.lightLogo}>
          <Image src="/Image/logo-white-hq.png" alt="" width={66} height={36} priority />
          <span>{APP_NAME}</span>
        </Link>
        <Image className={`${styles.roleArt} ${styles[`${role}Art`]}`} src={roleCopy[role].image} alt="" width={490} height={557} priority />
        <div className={styles.artContent}>
          <p>SIGNING IN AS</p>
          <h1>{roleLabels[role]}</h1>

        </div>
      </section>
      <section className={styles.formArea}>
        <div className={styles.formStack}>
          <SignInForm role={role} error={error} />

        </div>
      </section>
    </main>
  );
}

function DriverSignIn({ error }: Readonly<{ error?: string }>) {
  return (
    <main className={styles.driverSignIn}>
      <header>
        <Image src="/Image/logo-green-hq.png" alt={APP_NAME} width={66} height={36} priority />
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
          <span>Check your email, password and selected role.</span>
        </p>
      )}
      <input type="hidden" name="role" value={role} />
      <label htmlFor="identifier">Email</label>
      <div className={styles.inputWrap}>
        <span className={styles.personIcon} aria-hidden="true" />
        <input id="identifier" type="email" name="identifier" autoComplete="username" placeholder="Enter your email" required />
      </div>

      <label htmlFor="password">Password</label>
      <div className={styles.inputWrap}>
        <span className={styles.lockIcon} aria-hidden="true" />
        <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
      </div>

      <div className={styles.options}>

        <Link href="/sign-in/reset">Forgot password?</Link>
      </div>
      <button type="submit">Sign in</button>
      <hr />
      <Link href={compact ? "/" : "/sign-in"} className={styles.choose}>← {compact ? "Back to start" : "Choose a different role"}</Link>
    </form>
  );
}
