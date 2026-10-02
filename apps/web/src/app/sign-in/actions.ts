"use server";

import { authenticate, createSession, destroySession } from "@/lib/auth";
import { userRoles, type UserRole } from "@waypoint/domain";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const role = String(formData.get("role") ?? "");
  if (!userRoles.includes(role as UserRole)) redirect("/#roles");
  const session = await authenticate(String(formData.get("identifier") ?? ""), String(formData.get("password") ?? ""), role as UserRole);
  if (!session) redirect(`/sign-in?role=${role}&error=credentials`);
  await createSession(session);
  redirect(`/workspace/${session.role}`);
}

export async function signOut() {
  await destroySession();
  redirect("/#roles");
}
