import Link from "next/link";
import { roleLabels, type UserRole, userRoles } from "@waypoint/domain";
import styles from "./sign-in.module.css";
import { signIn } from "./actions";

const validRoles = new Set<string>(userRoles);

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ role?: string; error?: string }> }) {
  const { role: requestedRole, error } = await searchParams;
  const role = validRoles.has(requestedRole ?? "") ? (requestedRole as UserRole) : undefined;

  if (!role) {
    return (
      <main className={styles.chooser}>
        <Link href="/" className={styles.back}>← Back to home</Link>
        <p className={styles.eyebrow}>SIGN IN</p>
        <h1>How are you signing in today?</h1>
        <p>Choose your role. Each role signs in to its own workspace.</p>
        <div className={styles.grid}>
          {userRoles.map((item) => (
            <Link key={item} href={`/sign-in?role=${item}`} className={styles.role}>
              <h2>{roleLabels[item]}</h2>
              <p>{item === "store_manager" ? "Place and track outlet orders, see planned arrivals and confirm receipt." : item === "dispatcher" ? "Build feasible delivery plans, explain deferrals and monitor live execution." : item === "loader" ? "Load trips against the published plan and flag shortfalls before departure." : "Run your assigned route safely, capture proof of delivery and keep working offline."}</p>
              <span>Continue →</span>
            </Link>
          ))}
        </div>
        <aside className={styles.notice}>Your role is assigned by your Waypoint administrator. If you pick the wrong one, access will be denied.</aside>
      </main>
    );
  }

  return (
    <main className={styles.split}>
      <section className={styles.art}>
        <Link href="/" className={styles.lightBack}>← Back to home</Link>
        <div className={styles.artContent}>
          <span className={styles.artIcon}>W</span>
          <p className={styles.eyebrow}>SIGNING IN AS</p>
          <h1>{roleLabels[role]}</h1>
          <p>{role === "store_manager" ? "Place and track outlet orders, see planned arrivals and confirm receipt." : role === "dispatcher" ? "Build feasible delivery plans, explain deferrals and monitor live execution." : role === "loader" ? "Load trips against the published plan and flag shortfalls before departure." : "Your assigned trip, a safe Drive Mode and delivery records that work without signal."}</p>
        </div>
      </section>
      <section className={styles.formArea}>
        <form className={styles.form} action={signIn}>
          <Link href="/sign-in" className={styles.back}>← Choose a different role</Link>
          <h2>Sign in</h2>
          <p>to the {roleLabels[role]} workspace</p>
          {error && <p className={styles.error}>{error === "access" ? "This account does not have access to this workspace." : "Check your email or staff ID, password, and selected role."}</p>}
          <input type="hidden" name="role" value={role} />
          <label htmlFor="identifier">Email or staff ID</label>
          <input id="identifier" name="identifier" autoComplete="username" placeholder="Enter your email or staff ID" required />
          <small>Use the email or staff ID from your administrator.</small>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
          <small>Passwords are case-sensitive.</small>
          <div className={styles.options}><label><input type="checkbox" /> Remember me</label><a href="#reset">Forgot password?</a></div>
          <button type="submit">Sign in</button>
          <p className={styles.language}>English</p>
        </form>
      </section>
    </main>
  );
}
