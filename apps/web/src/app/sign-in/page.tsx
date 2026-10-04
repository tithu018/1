import { APP_NAME, roleLabels, type UserRole, userRoles } from "@waypoint/domain";
import { ArrowLeft, ArrowRight, Grid2X2, Info, Package, Store, Truck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "./actions";
import { PasswordField } from "./password-field";
import styles from "./sign-in.module.css";

const validRoles = new Set<string>(userRoles);

const roleIcons: Record<UserRole, LucideIcon> = {
  store_manager: Store,
  dispatcher: Grid2X2,
  loader: Package,
  driver: Truck
};

const roleCopy: Record<UserRole, { detail: string; device: string; image: string; imageWidth: number; imageHeight: number }> = {
  store_manager: {
    detail: "Place and track outlet orders, see planned arrivals and confirm receipt.",
    device: "Desktop · Phone",
    image: "/Image/store-manager.png",
    imageWidth: 994,
    imageHeight: 1086
  },
  dispatcher: {
    detail: "Build feasible delivery plans, explain deferrals and monitor live execution.",
    device: "Desktop",
    image: "/Image/dispatcher.png",
    imageWidth: 1086,
    imageHeight: 1448
  },
  loader: {
    detail: "Load trips against the published plan and flag shortfalls before departure.",
    device: "Tablet · Shared terminal",
    image: "/Image/loader.png",
    imageWidth: 941,
    imageHeight: 1672
  },
  driver: {
    detail: "Run your assigned route safely, capture proof of delivery and keep working offline.",
    device: "Phone",
    image: "/Image/driver.png",
    imageWidth: 1448,
    imageHeight: 1086
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
          <span>{APP_NAME}</span>
        </Link>
        <Link href="/" className={styles.backHome}><ArrowLeft aria-hidden="true" /> Back to home</Link>
      </header>
      <section className={styles.chooserIntro}>
        <p>SIGN IN</p>
        <h1>How are you signing in today?</h1>
        <span>Choose your role. Each role signs in to its own workspace.</span>
      </section>
      <div className={styles.grid}>
        {userRoles.map((item) => {
          const Icon = roleIcons[item];
          return (
            <Link key={item} href={`/sign-in?role=${item}`} className={styles.role}>
              <span className={styles.roleIcon}><Icon aria-hidden="true" /></span>
              <h2>{roleLabels[item]}</h2>
              <p>{roleCopy[item].detail}</p>
              <b>{roleCopy[item].device}</b>
              <ArrowRight className={styles.roleArrow} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      <aside className={styles.roleHelp}>
        <Info aria-hidden="true" />
        <p><strong>Not sure which role to choose?</strong><span>Your role is assigned by your Waypoint administrator. If you pick the wrong one, you’ll see a message explaining your access.</span></p>
      </aside>
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
        <Image
          className={styles.roleArt}
          src={roleCopy[role].image}
          alt=""
          width={roleCopy[role].imageWidth}
          height={roleCopy[role].imageHeight}
          sizes="(max-width: 850px) 270px, (max-width: 1180px) 376px, 496px"
          priority
        />
        <div className={styles.artContent}>
          <p>SIGNING IN AS</p>
          <h1>{roleLabels[role]}</h1>
          <span>{roleCopy[role].detail}</span>
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
        <span className={styles.driverPill}>Signing in as Driver</span>
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
      {error && <p className={styles.error}><span>Check your email, password and selected role.</span></p>}
      <input type="hidden" name="role" value={role} />
      <label htmlFor="identifier">Email</label>
      <div className={styles.inputWrap}>
        <span className={styles.personIcon} aria-hidden="true" />
        <input id="identifier" type="email" name="identifier" autoComplete="username" placeholder="Enter your email" required />
      </div>

      <label htmlFor="password">Password</label>
      <PasswordField />

      <div className={styles.options}><Link href="/sign-in/reset">Forgot password?</Link></div>
      <button type="submit">Sign in</button>
      <hr />
      <Link href={compact ? "/" : "/sign-in"} className={styles.choose}>← {compact ? "Back to start" : "Choose a different role"}</Link>
    </form>
  );
}
