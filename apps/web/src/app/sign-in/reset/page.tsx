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
      <section className={styles.card}>
        <h1>Password reset</h1>
        <p>Contact your dispatcher office to reset your password.</p>
        <Link href="/sign-in">← Back to sign in</Link>
      </section>
    </main>
  );
}
