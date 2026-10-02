import Image from "next/image";
import Link from "next/link";
import styles from "./reset.module.css";

export default function ResetPasswordPage() {
  return (
    <main className={styles.reset}>
      <header>
        <Link href="/">
          <Image src="/Image/logo-green-hq.png" alt="Waypoint" width={66} height={36} priority />
          <span>Waypoint</span>
        </Link>
        <Link href="/sign-in">← Back to sign in</Link>
      </header>
      <form className={styles.card}>
        <h1>Reset your password</h1>
        <p>Enter your email or staff ID. If it matches an account, reset instructions go to the contact your administrator registered.</p>
        <label htmlFor="reset-id">Email or staff ID</label>
        <input id="reset-id" placeholder="Value" />
        <small>ⓘ Helper</small>
        <button type="button">Send reset instructions</button>
        <Link href="/sign-in">← Back to sign in</Link>
      </form>
    </main>
  );
}
