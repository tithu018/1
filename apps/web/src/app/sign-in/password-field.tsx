"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./sign-in.module.css";

export function PasswordField() {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? "Hide password" : "Show password";

  return (
    <div className={styles.inputWrap}>
      <span className={styles.lockIcon} aria-hidden="true" />
      <input
        className={styles.passwordInput}
        id="password"
        name="password"
        type={isVisible ? "text" : "password"}
        autoComplete="current-password"
        placeholder="Enter your password"
        required
      />
      <button
        className={styles.passwordToggle}
        type="button"
        aria-label={label}
        aria-pressed={isVisible}
        title={label}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
