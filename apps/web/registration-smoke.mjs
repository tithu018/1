import { config } from "dotenv";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
config({ path: "../../.env", quiet: true });
const { prisma } = await import("@waypoint/database");
const base = process.env.WAYPOINT_TEST_URL ?? "http://localhost:3000";
const created = [];
function assert(condition, message) { if (!condition) throw new Error(message); }
function htmlValue(value) { return value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'"); }
function formFrom(html, marker) {
  const form = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => match[0]).find((form) => form.includes(marker));
  assert(form, `Form not found: ${marker}`);
  const data = new FormData();
  for (const input of form.matchAll(/<input\b[^>]*>/g)) {
    const name = input[0].match(/\bname="([^"]*)"/)?.[1];
    if (name?.startsWith("$ACTION_")) data.set(htmlValue(name), htmlValue(input[0].match(/\bvalue="([^"]*)"/)?.[1] ?? ""));
  }
  return data;
}
try {
  const dispatcher = await prisma.account.findFirst({ where: { role: "DISPATCHER", depotId: { not: null } } });
  assert(dispatcher, "A dispatcher account is required for this smoke test.");
  const token = await new SignJWT({ accountId: dispatcher.id, role: "dispatcher", displayName: dispatcher.displayName, depotId: dispatcher.depotId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  const headers = { Cookie: `waypoint_session=${token}`, Origin: base };
  const anonymous = await fetch(`${base}/workspace/dispatcher/registration`, { redirect: "manual" });
  assert(anonymous.status === 307, "Registration must redirect unauthenticated visitors.");
  for (const brand of ["FRESH", "STYLE", "TECH"]) {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const email = `smoke-${suffix}@example.invalid`, outletId = `SMOKE-${suffix.toUpperCase()}`;
    created.push({ email, outletId });
    const response = await fetch(`${base}/workspace/dispatcher/registration`, { headers });
    assert(response.ok, "Dispatcher registration page failed.");
    const html = await response.text();
    const form = formFrom(html, 'name="displayName"');
    const values = { displayName: "Registration smoke test", email, password: "SmokePassword123!", outletId, brand, district: "Colombo", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: brand === "FRESH" ? "05:00" : "09:00", windowCloseTime: brand === "FRESH" ? "08:00" : "17:00" };
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    const saved = await fetch(`${base}/workspace/dispatcher/registration`, { method: "POST", headers, body: form });
    const savedHtml = await saved.text();
    assert(saved.ok && savedHtml.includes("registered for"), `${brand} registration failed.`);
    const account = await prisma.account.findUnique({ where: { email }, include: { outlet: true } });
    assert(account?.outlet?.brand === brand && account.outlet.depotId === dispatcher.depotId && account.role === "STORE_MANAGER", "Incorrect account / outlet mapping.");
    assert(account.passwordHash !== values.password, "Password must be hashed.");
    const signIn = await fetch(`${base}/sign-in?role=store_manager`);
    const signInForm = formFrom(await signIn.text(), 'name="identifier"');
    signInForm.set("identifier", email); signInForm.set("password", values.password); signInForm.set("role", "store_manager");
    const login = await fetch(`${base}/sign-in?role=store_manager`, { method: "POST", headers: { Origin: base }, body: signInForm, redirect: "manual" });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert(cookie?.startsWith("waypoint_session="), `${brand} manager sign-in failed.`);
    const storeHeaders = { Cookie: cookie };
    for (const section of ["", "/status", "/history", "/notifications", "/settings", "/orders", "/receive"]) {
      const page = await fetch(`${base}/workspace/store_manager${section}`, { headers: storeHeaders });
      assert(page.ok, `${brand} workspace ${section} failed.`);
      const content = await page.text();
      assert(!content.includes("ORD0096797") && !content.includes("OUT010"), `${brand} workspace has prototype records.`);
    }
    const blocked = await fetch(`${base}/workspace/dispatcher/registration`, { headers: storeHeaders, redirect: "manual" });
    assert(blocked.status === 307, "Store manager must not access registration.");
    const duplicateForm = formFrom(savedHtml, 'name="displayName"');
    for (const [key, value] of Object.entries(values)) duplicateForm.set(key, value);
    const duplicate = await fetch(`${base}/workspace/dispatcher/registration`, { method: "POST", headers, body: duplicateForm });
    assert((await duplicate.text()).includes("already uses this email"), "Duplicate email was not rejected.");
    console.log(`${brand}: registration, password sign-in, seven workspace screens, role boundaries, and duplicate rejection passed.`);
  }
} finally {
  for (const { email, outletId } of created) {
    const account = await prisma.account.findUnique({ where: { email } });
    if (account) { await prisma.auditEvent.deleteMany({ where: { entityType: "Account", entityId: account.id, action: "store_manager_registered" } }); await prisma.account.delete({ where: { id: account.id } }); }
    await prisma.outlet.deleteMany({ where: { id: outletId, accounts: { none: {} }, orders: { none: {} } } });
  }
  await prisma.$disconnect();
}
