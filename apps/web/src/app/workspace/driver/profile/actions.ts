"use server";
import { compare, hash } from "bcryptjs";
import { requireRole, createSession } from "@/lib/auth";
import { serializable } from "@/lib/transactions";
import { revalidatePath } from "next/cache";

type Result = { error?: string; success?: string };
export async function updateDriverProfile(_previous: Result, form: FormData): Promise<Result> {
  const session = await requireRole("driver");
  const displayName = String(form.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 100) return { error: "Enter a name of up to 100 characters." };
  try {
    await serializable(async (tx) => {
      await tx.account.update({ where: { id: session.accountId }, data: { displayName } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Account", entityId: session.accountId, action: "driver_profile_updated", payload: { displayName } } });
    });
    revalidatePath("/workspace/driver", "layout");
    return { success: "Profile saved." };
  } catch { return { error: "Profile could not be saved. Try again." }; }
}
export async function changeDriverPassword(_previous: Result, form: FormData): Promise<Result> {
  const session = await requireRole("driver");
  const current = String(form.get("currentPassword") ?? ""), password = String(form.get("password") ?? "");
  if (password.length < 12 || new TextEncoder().encode(password).length > 72) return { error: "Use at least 12 characters, up to 72 bytes." };
  if (password !== form.get("confirmation")) return { error: "The new passwords do not match." };
  if (current === password) return { error: "Choose a different password." };
  try {
    const passwordHash = await hash(password, 12);
    const updated = await serializable(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({ where: { id: session.accountId } });
      if (!account.isActive || account.role !== "DRIVER" || account.sessionVersion !== session.sessionVersion) throw new Error("Your session changed. Sign in again.");
      if (!await compare(current, account.passwordHash)) throw new Error("Current password is incorrect.");
      const saved = await tx.account.update({ where: { id: account.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: account.id, entityType: "Account", entityId: account.id, action: "driver_password_changed" } });
      return saved;
    });
    await createSession({ ...session, sessionVersion: updated.sessionVersion });
    return { success: "Password changed. Other sessions have been signed out." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Password could not be changed." }; }
}
