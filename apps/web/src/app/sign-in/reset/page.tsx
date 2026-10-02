import Image from "next/image";
import Link from "next/link";
import styles from "./reset.module.css";

export default function ResetPasswordPage() {
  return (
    <main className={styles.reset}>
      <header>
        <Link href="/">
          <Image src="/Image/logo-green.png" alt="Waypoint" width={47} height={32} priority />
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
