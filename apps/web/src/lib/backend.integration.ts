import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient, type Account } from "@waypoint/database";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { authenticate, createSession, destroySession, getSession, requireRole } from "./auth";
import { nextServiceDate } from "./operating-date";
import { freshCatalog } from "@waypoint/domain";
import { registerStoreManager, registerStaff, registerVehicle, setAccountActive, resetStaffPassword, setVehicleWorkshop } from "@/app/workspace/dispatcher/registration/actions";
import { submitFreshOrder, submitRetailOrder, updateStoreOrder, cancelStoreOrder, acknowledgeDeferral } from "@/app/workspace/store_manager/orders/actions";
import { publishAssistedPlan, assignTripDriver } from "@/app/workspace/dispatcher/plan/actions";
import { confirmTripLoaded } from "@/app/workspace/loader/load/actions";
import { recordReceipt } from "@/app/workspace/store_manager/receive/actions";
import { startDriverTrip, recordDriverOutcome, resolveDriverSyncConflict, createLoaderIssue, transitionIssue, acknowledgeNotification } from "./workflow-actions";

// Only the framework boundary is mocked. Actions, JWTs, bcrypt and PostgreSQL are real.
const runtime = vi.hoisted(() => ({ db: null as unknown as PrismaClient, cookies: new Map<string, string>() }));
vi.mock("@waypoint/database", async (importOriginal) => ({ ...await importOriginal<typeof import("@waypoint/database")>(), get prisma() { return runtime.db; } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => runtime.cookies.has(name) ? { value: runtime.cookies.get(name) } : undefined, set: (name: string, value: string) => runtime.cookies.set(name, value), delete: (name: string) => runtime.cookies.delete(name) }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT ${path}`); } }));

const databaseName = `waypoint_backend_test_${randomUUID().replaceAll("-", "")}`;
let admin: PrismaClient, db: PrismaClient, passwordHash: string;
const roles = { DISPATCHER: "dispatcher", LOADER: "loader", DRIVER: "driver", STORE_MANAGER: "store_manager" } as const;
async function login(id: string) {
  const account = await db.account.findUniqueOrThrow({ where: { id } });
  await createSession({ accountId: account.id, displayName: account.displayName, role: roles[account.role], depotId: account.depotId ?? undefined, outletId: account.outletId ?? undefined, sessionVersion: account.sessionVersion });
}
function form(fields: Record<string, string>) { const data = new FormData(); Object.entries(fields).forEach(([key, value]) => data.set(key, value)); return data; }
function storeForm(brand = "FRESH", overrides: Record<string, string> = {}) { return form({ displayName: "New Manager", email: "new@example.test", password: "LongPassword123!", outletId: "NEW-OUTLET", brand, district: "Colombo", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: "05:00", windowCloseTime: "08:00", ...overrides }); }
function staffForm(role = "DRIVER", overrides: Record<string, string> = {}) { return form({ displayName: "New Staff", email: "staff@example.test", password: "LongPassword123!", role, ...overrides }); }
function vehicleForm(overrides: Record<string, string> = {}) { return form({ vehicleId: "NEW-VEH", type: "VAN", temperature: "REEFER", weight: "1000", volume: "10", efficiency: "6", quota: "100", ...overrides }); }
async function order(id = "ORDER", outletId = "FRESH", overrides = {}) {
  return db.order.create({ data: { id, outletId, requestedDate: nextServiceDate(), units: 10, weightKg: 100, volumeM3: 1, temperatureRequired: "REEFER", deliveryWindowOpen: "05:00", deliveryWindowClose: "08:00", lines: { create: { productCode: "ITEM", description: "Item", quantity: 10, weightKg: 100, volumeM3: 1 } }, ...overrides } });
}
function trip(orderIds = ["ORDER"], overrides = {}) { return { vehicleId: "VAN", driverId: "driver", orderIds, brand: "FRESH" as const, district: "Colombo", ...overrides }; }
async function publish(orderIds = ["ORDER"]) { await login("dispatcher"); await publishAssistedPlan([trip(orderIds)], [], { expectedVersion: null }); return db.trip.findFirstOrThrow(); }
async function depart() { await order(); const assigned = await publish(); await login("loader"); await confirmTripLoaded(assigned.id, ["ORDER"]); await login("driver"); const versions = await startDriverTrip(assigned.id); return { assigned, version: versions[0].updatedAt }; }

beforeAll(async () => {
  config({ path: resolve("../../.env"), quiet: true } as Parameters<typeof config>[0]);
  process.env.SESSION_SECRET = "backend-test-secret-only-not-a-production-secret";
  const base = process.env.DATABASE_URL?.replace("@localhost:5432", "@127.0.0.1:5433");
  if (!base) throw new Error("DATABASE_URL is required for isolated backend tests.");
  admin = new PrismaClient({ datasources: { db: { url: base } } });
  if (!/^waypoint_backend_test_[a-f0-9]{32}$/.test(databaseName)) throw new Error("Unsafe test database name.");
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  const testUrl = new URL(base); testUrl.pathname = `/${databaseName}`;
  db = new PrismaClient({ datasources: { db: { url: testUrl.toString() } } }); runtime.db = db;
  const migrations = resolve("../../packages/database/prisma/migrations");
  for (const directory of readdirSync(migrations).filter((name) => /^\d/.test(name)).sort()) {
    const sql = readFileSync(resolve(migrations, directory, "migration.sql"), "utf8");
    for (const statement of sql.split(";").filter((part) => part.trim())) await db.$executeRawUnsafe(statement);
  }
  passwordHash = await hash("FixturePassword123!", 4);
}, 60000);
beforeEach(async () => {
  runtime.cookies.clear(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-02T05:00:00Z"));
  // db exclusively targets the uniquely named test database created above.
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map(({ tablename }) => `"${tablename}"`).join(",")} RESTART IDENTITY CASCADE`);
  await db.depot.createMany({ data: [{ id: "DEPOT", name: "Test depot" }, { id: "OTHER", name: "Other depot" }] });
  for (const [id, brand, depotId] of [["FRESH", "FRESH", "DEPOT"], ["STYLE", "STYLE", "DEPOT"], ["TECH", "TECH", "DEPOT"], ["FOREIGN", "FRESH", "OTHER"]] as const) await db.outlet.create({ data: { id, brand, depotId, district: "Colombo", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: "05:00", windowCloseTime: "08:00" } });
  const accounts: Array<Pick<Account, "id" | "role" | "depotId" | "outletId">> = [
    { id: "dispatcher", role: "DISPATCHER", depotId: "DEPOT", outletId: null }, { id: "colleague", role: "DISPATCHER", depotId: "DEPOT", outletId: null },
    { id: "loader", role: "LOADER", depotId: "DEPOT", outletId: null }, { id: "driver", role: "DRIVER", depotId: "DEPOT", outletId: null }, { id: "spare", role: "DRIVER", depotId: "DEPOT", outletId: null },
    { id: "outsider", role: "DRIVER", depotId: "OTHER", outletId: null }, { id: "store", role: "STORE_MANAGER", depotId: "DEPOT", outletId: "FRESH" }, { id: "style", role: "STORE_MANAGER", depotId: "DEPOT", outletId: "STYLE" }, { id: "tech", role: "STORE_MANAGER", depotId: "DEPOT", outletId: "TECH" }, { id: "foreign-store", role: "STORE_MANAGER", depotId: "OTHER", outletId: "FOREIGN" }
  ];
  await db.account.createMany({ data: accounts.map((account) => ({ ...account, email: `${account.id}@example.test`, displayName: account.id, passwordHash })) });
  await db.vehicle.createMany({ data: [{ id: "VAN", depotId: "DEPOT", type: "VAN", temperature: "REEFER", weightCapacityKg: 1000, volumeCapacityM3: 10, kilometersPerLitre: 6, weeklyFuelQuotaL: 100 }, { id: "TRUCK", depotId: "DEPOT", type: "TRUCK", temperature: "AMBIENT", weightCapacityKg: 1000, volumeCapacityM3: 10, kilometersPerLitre: 6, weeklyFuelQuotaL: 100 }] });
});
afterAll(async () => {
  vi.useRealTimers(); await db?.$disconnect();
  if (admin && /^waypoint_backend_test_[a-f0-9]{32}$/.test(databaseName)) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await admin?.$disconnect();
});

describe("authentication and one dispatcher permission level", () => {
  it("stores optional map locations and rejects incomplete or out-of-range coordinates", async () => {
    expect(await db.outlet.findUnique({ where: { id: "FRESH" } })).toMatchObject({ latitude: null, longitude: null });
    await expect(db.outlet.update({ where: { id: "FRESH" }, data: { latitude: 6.9344 } })).rejects.toThrow();
    await expect(db.outlet.update({ where: { id: "FRESH" }, data: { latitude: 91, longitude: 79.8428 } })).rejects.toThrow();
    expect(await db.outlet.update({ where: { id: "FRESH" }, data: { address: "Demo stop", latitude: 6.9344, longitude: 79.8428 } })).toMatchObject({ latitude: 6.9344, longitude: 79.8428 });
  });
  it("checks credentials, role and authoritative account scope", async () => {
    expect(await authenticate("DISPATCHER@example.test", "FixturePassword123!", "dispatcher")).toMatchObject({ accountId: "dispatcher" });
    expect(await authenticate("dispatcher@example.test", "wrong", "dispatcher")).toBeNull();
    expect(await authenticate("dispatcher@example.test", "FixturePassword123!", "driver")).toBeNull();
    await login("dispatcher"); expect(await getSession()).toMatchObject({ depotId: "DEPOT" }); await expect(requireRole("driver")).rejects.toThrow("REDIRECT");
    await destroySession(); expect(await getSession()).toBeNull();
  });
  it("rejects tampered and expired JWTs", async () => {
    runtime.cookies.set("waypoint_session", "tampered"); expect(await getSession()).toBeNull();
    const token = await new SignJWT({ accountId: "driver", role: "driver", displayName: "driver" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(new Date("2026-10-01T00:00:00Z")).sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    runtime.cookies.set("waypoint_session", token); expect(await getSession()).toBeNull();
  });
  it("revokes sessions on deactivation, reactivation and password reset", async () => {
    await login("driver"); const oldToken = runtime.cookies.get("waypoint_session")!;
    await login("colleague"); expect((await setAccountActive({}, form({ accountId: "driver", isActive: "false" }))).success).toBeTruthy();
    runtime.cookies.set("waypoint_session", oldToken); expect(await getSession()).toBeNull();
    await login("dispatcher"); await setAccountActive({}, form({ accountId: "driver", isActive: "true" }));
    runtime.cookies.set("waypoint_session", oldToken); expect(await getSession()).toBeNull();
    await login("dispatcher"); expect((await resetStaffPassword({}, form({ accountId: "driver", password: "ReplacementPassword123!" }))).success).toBeTruthy();
    expect(await authenticate("driver@example.test", "FixturePassword123!", "driver")).toBeNull(); expect(await authenticate("driver@example.test", "ReplacementPassword123!", "driver")).not.toBeNull();
    expect((await setAccountActive({}, form({ accountId: "dispatcher", isActive: "false" }))).error).toContain("own");
    expect((await resetStaffPassword({}, form({ accountId: "outsider", password: "ReplacementPassword123!" }))).error).toContain("depot");
  });
});
describe("registration and vehicle administration", () => {
  it.each(["FRESH", "STYLE", "TECH"])("creates a real %s manager and rejects duplicate registration", async (brand) => {
    await login("dispatcher"); expect((await registerStoreManager({}, storeForm(brand))).success).toBeTruthy();
    const manager = await authenticate("new@example.test", "LongPassword123!", "store_manager"); expect(manager).toMatchObject({ outletId: "NEW-OUTLET", depotId: "DEPOT" });
    expect((await registerStoreManager({}, storeForm(brand))).error).toBeTruthy(); expect(await db.account.count({ where: { email: "new@example.test" } })).toBe(1);
  });
  it.each(["DRIVER", "LOADER", "DISPATCHER"])("registers %s staff with no supervisor role", async (role) => {
    await login("dispatcher"); expect((await registerStaff({}, staffForm(role))).success).toBeTruthy();
    expect(await db.account.findUnique({ where: { email: "staff@example.test" } })).toMatchObject({ role, depotId: "DEPOT", isActive: true });
    expect((await registerStaff({}, staffForm(role))).error).toContain("Email");
  });
  it("rejects forbidden roles, short passwords, foreign outlets and role misuse", async () => {
    await login("dispatcher"); expect((await registerStaff({}, staffForm("SUPERVISOR"))).error).toBeTruthy();
    expect((await registerStaff({}, staffForm("DRIVER", { password: "short" }))).error).toBeTruthy();
    expect((await registerStoreManager({}, storeForm("FRESH", { outletId: "FOREIGN" }))).error).toBeTruthy();
    await login("loader"); await expect(registerStaff({}, staffForm())).rejects.toThrow("REDIRECT");
  });
  it("registers vehicles, validates capacities and controls workshop status", async () => {
    await login("dispatcher"); expect((await registerVehicle({}, vehicleForm())).success).toBeTruthy();
    expect((await registerVehicle({}, vehicleForm())).error).toContain("already"); expect((await registerVehicle({}, vehicleForm({ vehicleId: "BAD", weight: "NaN" }))).error).toBeTruthy();
    expect((await setVehicleWorkshop({}, form({ vehicleId: "NEW-VEH", isInWorkshop: "true" }))).success).toBeTruthy(); expect((await db.vehicle.findUniqueOrThrow({ where: { id: "NEW-VEH" } })).isInWorkshop).toBe(true);
    expect((await setVehicleWorkshop({}, form({ vehicleId: "unknown", isInWorkshop: "true" }))).error).toBeTruthy();
  });
});
describe("store orders", () => {
  it("calculates Fresh totals and actually removes zero quantity lines", async () => {
    await login("store"); const selected = freshCatalog.slice(0, 2); const created = await submitFreshOrder(selected.map((item) => ({ code: item.code, quantity: 2 })), "");
    const saved = await db.order.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } }); expect(saved.units).toBe(4); expect(Number(saved.weightKg)).toBeCloseTo(selected.reduce((sum, item) => sum + item.unitWeightKg * 2, 0), 2);
    await updateStoreOrder(saved.id, saved.lines.map((line, index) => ({ lineId: line.id, quantity: index === 0 ? 0 : 3 })));
    expect(await db.orderLine.count({ where: { orderId: saved.id } })).toBe(1); expect((await db.order.findUniqueOrThrow({ where: { id: saved.id } })).units).toBe(3);
    await cancelStoreOrder(saved.id); expect((await db.order.findUniqueOrThrow({ where: { id: saved.id } })).status).toBe("CANCELLED");
  });
  it.each(["style", "tech"])("submits %s orders after cutoff to the following run", async (account) => {
    vi.setSystemTime(new Date("2026-10-02T10:30:00Z")); await login(account);
    const created = await submitRetailOrder({ code: "PRODUCT", description: "Product", quantity: 3, unitWeightKg: 5, unitVolumeM3: .2, note: "" });
    expect(created.requestedDate).toBe("2026-10-04T00:00:00.000Z"); expect((await db.order.findUniqueOrThrow({ where: { id: created.id } })).units).toBe(3);
  });
  it("rejects invalid catalog entries, duplicate lines and another store's order", async () => {
    await login("store"); await expect(submitFreshOrder([{ code: "unknown", quantity: 1 }], "")).rejects.toThrow();
    const code = freshCatalog[0].code; await expect(submitFreshOrder([{ code, quantity: 1 }, { code, quantity: 1 }], "")).rejects.toThrow(); await expect(submitFreshOrder([{ code, quantity: -1 }], "")).rejects.toThrow();
    const saved = await order(); await login("style"); await expect(cancelStoreOrder(saved.id)).rejects.toThrow(); await expect(updateStoreOrder(saved.id, [{ lineId: "unknown", quantity: 1 }])).rejects.toThrow();
    await expect(acknowledgeDeferral(saved.id)).rejects.toThrow();
  });
});
describe("publication, loading and departure", () => {
  it("publishes, loads, departs, delivers, confirms receipt and resolves an issue", async () => {
    const { assigned, version } = await depart();
    const input = { operationId: "delivery", orderId: "ORDER", outcome: "DELIVERED" as const, receiverName: "Receiver", clientUpdatedAt: version, photoKey: "test/photo" };
    expect((await recordDriverOutcome(input)).status).toBe("ACKNOWLEDGED"); expect((await recordDriverOutcome(input)).status).toBe("ACKNOWLEDGED");
    expect(await db.deliveryOutcomeRecord.count()).toBe(1); expect(await db.proofAsset.count()).toBe(1); expect((await db.trip.findUniqueOrThrow({ where: { id: assigned.id } })).status).toBe("DELIVERED");
    await login("store"); const receipt = await recordReceipt("ORDER", 8, 10, "short", "Missing two"); expect(receipt.issueId).toBeTruthy(); expect(await recordReceipt("ORDER", 8, 10, "short", "Missing two")).toEqual(receipt);
    await expect(recordReceipt("ORDER", 10, 10, "full", "")).rejects.toThrow("already");
    await login("dispatcher"); for (const status of ["ACKNOWLEDGED", "UNDER_REVIEW", "RESOLVED"] as const) await transitionIssue(receipt.issueId!, status, "Reviewed");
    await login("store"); await transitionIssue(receipt.issueId!, "REOPENED", "Still missing"); expect((await db.issueCase.findUniqueOrThrow({ where: { id: receipt.issueId! } })).status).toBe("REOPENED");
    expect(await db.notification.count({ where: { recipientId: { in: ["style", "tech", "foreign-store", "outsider", "spare"] } } })).toBe(0);
    const notice = await db.notification.findFirstOrThrow({ where: { recipientId: "dispatcher" } }); await acknowledgeNotification(notice.id); expect((await db.notification.findUniqueOrThrow({ where: { id: notice.id } })).readAt).toBeNull();
    await login("dispatcher"); await acknowledgeNotification(notice.id); expect((await db.notification.findUniqueOrThrow({ where: { id: notice.id } })).readAt).not.toBeNull();
  });
  it("requires the complete queue and an active own-depot driver", async () => {
    await order(); await order("SECOND"); await login("dispatcher"); await expect(publishAssistedPlan([trip()])).rejects.toThrow("Queue changed");
    await expect(publishAssistedPlan([trip(["ORDER", "SECOND"], { driverId: "outsider" })])).rejects.toThrow("active driver");
    await expect(publishAssistedPlan([trip(["ORDER", "ORDER"])])).rejects.toThrow("once"); expect(await db.plan.count()).toBe(0);
  });
  it.each([{ weightKg: 1001 }, { volumeM3: 11 }])("rejects overloaded whole orders %j", async (capacity) => { await order("ORDER", "FRESH", capacity); await login("dispatcher"); await expect(publishAssistedPlan([trip()])).rejects.toThrow(); expect(await db.plan.count()).toBe(0); });
  it("checks temperature, van-only access, workshop and depot", async () => {
    await order(); await login("dispatcher"); await expect(publishAssistedPlan([trip(["ORDER"], { vehicleId: "TRUCK" })])).rejects.toThrow();
    await db.order.update({ where: { id: "ORDER" }, data: { temperatureRequired: "AMBIENT" } }); await db.outlet.update({ where: { id: "FRESH" }, data: { parkingConstraint: "van_only" } });
    await expect(publishAssistedPlan([trip(["ORDER"], { vehicleId: "TRUCK" })])).rejects.toThrow();
    await setVehicleWorkshop({}, form({ vehicleId: "VAN", isInWorkshop: "true" })); await expect(publishAssistedPlan([trip()])).rejects.toThrow();
    await order("FOREIGN-ORDER", "FOREIGN"); await expect(publishAssistedPlan([trip(["FOREIGN-ORDER"])])).rejects.toThrow();
  });
  it("persists reasoned deferrals and allows a run with all orders deferred", async () => {
    await order(); await login("dispatcher"); await expect(publishAssistedPlan([], [{ orderId: "ORDER", reason: "", nextDate: "2026-10-04" }])).rejects.toThrow("reason");
    await expect(publishAssistedPlan([], [{ orderId: "ORDER", reason: "Capacity full", nextDate: "2026-10-03" }])).rejects.toThrow("later");
    expect(await publishAssistedPlan([], [{ orderId: "ORDER", reason: "Capacity full", nextDate: "2026-10-04" }])).toBe(1);
    expect(await db.order.findUnique({ where: { id: "ORDER" } })).toMatchObject({ status: "DEFERRED", requestedDate: new Date("2026-10-04") });
    await login("store"); await acknowledgeDeferral("ORDER"); expect(await db.auditEvent.count({ where: { action: "deferral_acknowledged" } })).toBe(1);
  });
  it("invalidates loading after replan and rejects stale publication", async () => {
    await order(); const old = await publish(); await login("loader"); await confirmTripLoaded(old.id, ["ORDER"]);
    await login("dispatcher"); await expect(publishAssistedPlan([trip()], [], { expectedVersion: null })).rejects.toThrow("Plan changed");
    expect(await publishAssistedPlan([trip()], [], { expectedVersion: 1 })).toBe(2);
    await login("loader"); await expect(confirmTripLoaded(old.id, ["ORDER"])).rejects.toThrow("no longer");
    const replacement = await db.trip.findFirstOrThrow({ where: { plan: { status: "PUBLISHED" } } }); await login("driver"); await expect(startDriverTrip(replacement.id)).rejects.toThrow("loaded");
  });
  it("rejects incomplete checklists and unassigned drivers, permits reassignment", async () => {
    await order(); const assigned = await publish(); await login("loader"); await expect(confirmTripLoaded(assigned.id, ["ORDER", "ORDER"])).rejects.toThrow(); await expect(confirmTripLoaded(assigned.id, ["foreign"])).rejects.toThrow();
    await confirmTripLoaded(assigned.id, ["ORDER"]); await confirmTripLoaded(assigned.id, ["ORDER"]); expect(await db.auditEvent.count({ where: { action: "load_confirmed" } })).toBe(1);
    await login("spare"); await expect(startDriverTrip(assigned.id)).rejects.toThrow(); await login("dispatcher"); await assignTripDriver(assigned.id, "spare");
    expect((await setAccountActive({}, form({ accountId: "spare", isActive: "false" }))).error).toContain("Reassign");
    await login("driver"); await expect(startDriverTrip(assigned.id)).rejects.toThrow(); await login("spare"); await startDriverTrip(assigned.id); await startDriverTrip(assigned.id);
    await login("dispatcher"); await expect(publishAssistedPlan([trip()])).rejects.toThrow("departed"); expect((await setVehicleWorkshop({}, form({ vehicleId: "VAN", isInWorkshop: "true" }))).error).toBeTruthy();
  });
  it("records scoped loader issues and enforces lifecycle permissions", async () => {
    await order(); const assigned = await publish(); await login("loader"); await expect(createLoaderIssue(assigned.id, "ORDER", "Shortfall", 11, "")).rejects.toThrow("exceeds");
    const issue = await createLoaderIssue(assigned.id, "ORDER", "Shortfall", 2, "Missing cartons"); await transitionIssue(issue, "ACKNOWLEDGED", "Notified office"); await expect(transitionIssue(issue, "UNDER_REVIEW", "Review")).rejects.toThrow();
    await login("style"); await expect(transitionIssue(issue, "REOPENED", "Review")).rejects.toThrow("scope"); await login("store"); await expect(transitionIssue(issue, "UNDER_REVIEW", "Review")).rejects.toThrow();
    await login("dispatcher"); await transitionIssue(issue, "UNDER_REVIEW", "Investigating"); await expect(transitionIssue(issue, "REOPENED", "Review")).rejects.toThrow("Cannot move");
  });
  it("publishes only one version during competing office updates", async () => {
    await order(); await login("dispatcher"); const results = await Promise.allSettled([publishAssistedPlan([trip()], [], { expectedVersion: null }), publishAssistedPlan([trip()], [], { expectedVersion: null })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1); expect(await db.plan.count({ where: { status: "PUBLISHED" } })).toBe(1);
  });
});
describe("delivery synchronization and receipt gates", () => {
  it("retains conflicts without overwriting the server and resolves local choice atomically", async () => {
    await depart(); const input = { operationId: "conflict", orderId: "ORDER", outcome: "DELIVERED" as const, receiverName: "Receiver", clientUpdatedAt: "2020-01-01T00:00:00Z" };
    expect((await recordDriverOutcome(input)).status).toBe("CONFLICT"); expect(await db.deliveryOutcomeRecord.count()).toBe(0);
    await login("spare"); await expect(resolveDriverSyncConflict("conflict", "KEEP_LOCAL")).rejects.toThrow();
    await login("driver"); await resolveDriverSyncConflict("conflict", "KEEP_LOCAL"); expect((await db.order.findUniqueOrThrow({ where: { id: "ORDER" } })).status).toBe("DELIVERED");
    expect((await db.syncConflict.findUniqueOrThrow({ where: { operationId: "conflict" } })).resolution).toBe("KEEP_LOCAL"); await expect(resolveDriverSyncConflict("conflict", "KEEP_LOCAL")).rejects.toThrow();
  });
  it("keeps the server choice and does not mark a failed resolution complete", async () => {
    await depart(); await recordDriverOutcome({ operationId: "conflict", orderId: "ORDER", outcome: "DELIVERED", receiverName: "Receiver", clientUpdatedAt: "2020-01-01T00:00:00Z" });
    await db.plan.updateMany({ data: { status: "SUPERSEDED" } }); await expect(resolveDriverSyncConflict("conflict", "KEEP_LOCAL")).rejects.toThrow(); expect((await db.syncConflict.findUniqueOrThrow({ where: { operationId: "conflict" } })).resolvedAt).toBeNull();
    await resolveDriverSyncConflict("conflict", "KEEP_SERVER"); expect(await db.deliveryOutcomeRecord.count()).toBe(0);
  });
  it("handles concurrent identical offline retries once and rejects changed payloads", async () => {
    const { version } = await depart(); const input = { operationId: "retry", orderId: "ORDER", outcome: "DELIVERED" as const, receiverName: "Receiver", clientUpdatedAt: version };
    const results = await Promise.all([recordDriverOutcome(input), recordDriverOutcome(input)]); expect(results.every((result) => result.status === "ACKNOWLEDGED")).toBe(true); expect(await db.deliveryOutcomeRecord.count()).toBe(1);
    await expect(recordDriverOutcome({ ...input, receiverName: "Changed" })).rejects.toThrow("different data");
  });
  it("requires evidence, tracks failed deliveries and limits receipts to delivered own orders", async () => {
    await depart(); await expect(recordDriverOutcome({ operationId: "empty", orderId: "ORDER", outcome: "DELIVERED" })).rejects.toThrow("receiver");
    await expect(recordDriverOutcome({ operationId: "empty", orderId: "ORDER", outcome: "CANNOT_DELIVER" })).rejects.toThrow("problem");
    await recordDriverOutcome({ operationId: "problem", orderId: "ORDER", outcome: "CANNOT_DELIVER", note: "Store closed" }); expect(await db.issueCase.count()).toBe(1);
    await login("store"); await expect(recordReceipt("ORDER", 10, 10, "full", "")).rejects.toThrow("after delivery");
    await login("driver"); await recordDriverOutcome({ operationId: "delivered", orderId: "ORDER", outcome: "DELIVERED", receiverName: "Receiver" });
    await login("style"); await expect(recordReceipt("ORDER", 10, 10, "full", "")).rejects.toThrow();
    await login("store"); await expect(recordReceipt("ORDER", 9, 10, "full", "")).rejects.toThrow(); await expect(recordReceipt("ORDER", 10, 10, "reservation", "")).rejects.toThrow("Tech");
    expect(await recordReceipt("ORDER", 10, 10, "full", "")).toEqual({ issueId: null });
  });
});
