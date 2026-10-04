"use server";

import { hash } from "bcryptjs";
import { prisma, type Prisma } from "@waypoint/database";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { parseAccount, parseDepot, parseRegistration } from "@/lib/registration";

// Dispatchers register users and vehicles for both depots, so the target depot comes from the form.
async function targetDepot(tx: Prisma.TransactionClient, depotId: string) {
  const depot = await tx.depot.findUnique({ where: { id: depotId } });
  if (!depot) throw new Error("Choose Peliyagoda or Kandy as the depot.");
  return depot.id;
}

export async function registerStoreManager(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "Your dispatcher account must be linked to a depot." };
  try {
    const requestedDepot = parseDepot(form, session.depotId);
    const { password, displayName, email, ...outletData } = parseRegistration(form);
    const passwordHash = await hash(password, 12);
    const depotId = await prisma.$transaction(async (tx) => {
      const depotId = await targetDepot(tx, requestedDepot);
      if (await tx.account.findUnique({ where: { email } })) throw new Error("An account already uses this email address.");
      const existing = await tx.outlet.findUnique({ where: { id: outletData.outletId }, include: { accounts: { where: { role: "STORE_MANAGER" } } } });
      if (existing && (existing.depotId !== depotId || existing.brand !== outletData.brand || existing.accounts.length)) throw new Error("This outlet is already managed or belongs to a different depot or brand.");
      const { outletId, ...details } = outletData;
      // Existing outlet constraints are preserved; registration never overwrites master data.
      const outlet = existing ?? await tx.outlet.create({ data: { id: outletId, depotId, ...details } });
      const account = await tx.account.create({ data: { displayName, email, passwordHash, role: "STORE_MANAGER", outletId: outlet.id, depotId: outlet.depotId } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Account", entityId: account.id, action: "store_manager_registered", payload: { outletId: outlet.id, brand: outlet.brand, depotId: outlet.depotId, registeredFrom: session.depotId } } });
      await tx.notification.create({ data: { recipientId: account.id, type: "SYSTEM", title: "Welcome to Waypoint", body: `Your account is linked to ${outlet.id} (${outlet.depotId} depot). You can now place orders and track deliveries.` } });
      return outlet.depotId;
    }, { isolationLevel: "Serializable" });
    revalidatePath("/workspace", "layout");
    return { success: `${displayName} registered for ${outletData.outletId} · ${depotId} depot.` };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2034") return { error: "This outlet was changed by another dispatcher. Refresh and try again." };
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "That email address or outlet ID was just registered. Refresh and try again." };
    return { error: error instanceof Error ? error.message : "Registration failed. Please try again." };
  }
}

export async function registerStaff(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "No depot assigned." };
  try {
    const { password, ...account } = parseAccount(form);
    const role = String(form.get("role"));
    if (!["DRIVER", "LOADER", "DISPATCHER"].includes(role)) throw new Error("Choose Driver, Loader or Dispatcher.");
    const requestedDepot = parseDepot(form, session.depotId);
    const passwordHash = await hash(password, 12);
    const depotId = await prisma.$transaction(async (tx) => {
      const depotId = await targetDepot(tx, requestedDepot);
      if (await tx.account.findUnique({ where: { email: account.email } })) throw new Error("Email already registered.");
      const created = await tx.account.create({ data: { ...account, passwordHash, role: role as "DRIVER" | "LOADER" | "DISPATCHER", depotId } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Account", entityId: created.id, action: "staff_registered", payload: { role, depotId, registeredFrom: session.depotId } } });
      await tx.notification.create({ data: { recipientId: created.id, type: "SYSTEM", title: "Account created", body: `${role[0]}${role.slice(1).toLowerCase()} · ${depotId}` } });
      return depotId;
    }, { isolationLevel: "Serializable" });
    revalidatePath("/workspace", "layout");
    return { success: `${account.displayName} registered as ${role.toLowerCase()} · ${depotId} depot.` };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "Email already registered." };
    return { error: error instanceof Error ? error.message : "Registration failed." };
  }
}

export async function setAccountActive(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "No depot assigned." };
  const accountId = String(form.get("accountId"));
  const isActive = form.get("isActive") === "true";
  try {
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account) throw new Error("Account not found.");
      if (account.depotId !== session.depotId) throw new Error("You can only update accounts in your depot.");
      if (account.id === session.accountId && !isActive) throw new Error("You cannot deactivate your own account.");
      if (!isActive && await tx.trip.count({ where: { driverId: account.id, plan: { status: "PUBLISHED" }, status: { in: ["ALLOCATED", "LOADED", "OUT_FOR_DELIVERY"] } } })) throw new Error("Reassign this driver's active trips first.");
      await tx.account.update({ where: { id: account.id }, data: { isActive, sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Account", entityId: account.id, action: isActive ? "activated" : "deactivated" } });
    }, { isolationLevel: "Serializable" });
    revalidatePath("/workspace", "layout"); return { success: "Account updated." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Update failed." }; }
}

export async function resetStaffPassword(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "No depot assigned." };
  try {
    const password = String(form.get("password") ?? "");
    if (password.length < 12 || new TextEncoder().encode(password).length > 72) throw new Error("Use 12 or more characters, up to 72 bytes.");
    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { id: String(form.get("accountId")) } });
      if (!account) throw new Error("Account not found.");
      if (account.depotId !== session.depotId) throw new Error("You can only reset passwords for accounts in your depot.");
      if (account.id === session.accountId) throw new Error("Ask another dispatcher to reset your password.");
      await tx.account.update({ where: { id: account.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Account", entityId: account.id, action: "password_reset" } });
    });
    return { success: "Password reset. Previous sessions revoked." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Reset failed." }; }
}

export async function registerVehicle(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "No depot assigned." };
  try {
    const id = String(form.get("vehicleId") ?? "").trim().toUpperCase();
    const type = String(form.get("type")), temperature = String(form.get("temperature"));
    const weightCapacityKg = Number(form.get("weight")), volumeCapacityM3 = Number(form.get("volume"));
    const kilometersPerLitre = Number(form.get("efficiency")), weeklyFuelQuotaL = Number(form.get("quota"));
    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(id) || !["TRUCK", "VAN"].includes(type) || !["AMBIENT", "REEFER"].includes(temperature)) throw new Error("Enter a vehicle ID, type and temperature class.");
    if ([weightCapacityKg, volumeCapacityM3, kilometersPerLitre, weeklyFuelQuotaL].some((value) => !Number.isFinite(value) || value <= 0 || value > 1e6)) throw new Error("Capacities, efficiency and fuel quota must be positive numbers below 1,000,000.");
    const requestedDepot = parseDepot(form, session.depotId);
    const depotId = await prisma.$transaction(async (tx) => {
      const depotId = await targetDepot(tx, requestedDepot);
      await tx.vehicle.create({ data: { id, depotId, type: type as "TRUCK" | "VAN", temperature: temperature as "AMBIENT" | "REEFER", weightCapacityKg, volumeCapacityM3, kilometersPerLitre, weeklyFuelQuotaL } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Vehicle", entityId: id, action: "registered", payload: { depotId, registeredFrom: session.depotId } } });
      return depotId;
    });
    revalidatePath("/workspace", "layout"); return { success: `${id} registered · ${depotId} depot.` };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return { error: "Vehicle ID already registered." };
    return { error: error instanceof Error ? error.message : "Registration failed." };
  }
}

export async function setVehicleWorkshop(_previous: { error?: string; success?: string }, form: FormData): Promise<{ error?: string; success?: string }> {
  const session = await requireRole("dispatcher");
  if (!session.depotId) return { error: "No depot assigned." };
  try {
    const id = String(form.get("vehicleId")), isInWorkshop = form.get("isInWorkshop") === "true";
    await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id } });
      if (!vehicle) throw new Error("Vehicle not found.");
      if (isInWorkshop && await tx.trip.count({ where: { vehicleId: id, plan: { status: "PUBLISHED" }, status: { in: ["LOADED", "OUT_FOR_DELIVERY"] } } })) throw new Error("Replan this vehicle's active trip first.");
      await tx.vehicle.update({ where: { id }, data: { isInWorkshop } });
      await tx.auditEvent.create({ data: { actorId: session.accountId, entityType: "Vehicle", entityId: id, action: "workshop_status_changed", payload: { isInWorkshop } } });
    }, { isolationLevel: "Serializable" });
    revalidatePath("/workspace", "layout"); return { success: "Vehicle updated." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Update failed." }; }
}
