import { prisma } from "@waypoint/database";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import type { UserRole } from "@waypoint/domain";

const cookieName = "waypoint_session";
const roleMap = { STORE_MANAGER: "store_manager", DISPATCHER: "dispatcher", LOADER: "loader", DRIVER: "driver" } as const;
export type Session = { accountId: string; role: UserRole; displayName: string; outletId?: string; depotId?: string };

function secret() { const value = process.env.SESSION_SECRET; if (!value) throw new Error("SESSION_SECRET is required to sign in."); return new TextEncoder().encode(value); }

export async function authenticate(identifier: string, password: string, requestedRole: UserRole): Promise<Session | null> {
  const account = await prisma.account.findUnique({ where: { email: identifier.trim().toLowerCase() } });
  if (!account || roleMap[account.role] !== requestedRole || !(await compare(password, account.passwordHash))) return null;
  return { accountId: account.id, role: roleMap[account.role], displayName: account.displayName, outletId: account.outletId ?? undefined, depotId: account.depotId ?? undefined };
}

export async function createSession(session: Session) {
  const token = await new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
  (await cookies()).set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
}

export async function destroySession() {
  (await cookies()).delete(cookieName);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.accountId !== "string" || typeof payload.role !== "string" || typeof payload.displayName !== "string" || !["store_manager", "dispatcher", "loader", "driver"].includes(payload.role)) return null;
    return { accountId: payload.accountId, role: payload.role as UserRole, displayName: payload.displayName, outletId: typeof payload.outletId === "string" ? payload.outletId : undefined, depotId: typeof payload.depotId === "string" ? payload.depotId : undefined };
  } catch { return null; }
}

export async function requireRole(role: UserRole) { const session = await getSession(); if (!session || session.role !== role) redirect(`/sign-in?role=${role}&error=access`); return session; }
