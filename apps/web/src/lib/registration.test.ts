import { describe, expect, it } from "vitest";
import { parseRegistration } from "./registration";

function form(overrides: Record<string, string | undefined> = {}) {
  const data = new FormData();
  Object.entries({ displayName: "Manager", email: "MANAGER@example.com", password: "LongPassword123!", outletId: "out100", brand: "FRESH", district: "Colombo", dockType: "rear_dock", parkingConstraint: "normal", windowOpenTime: "05:00", windowCloseTime: "08:00", ...overrides }).forEach(([key, value]) => { if (value !== undefined) data.set(key, value); });
  return data;
}
describe("store-manager registration", () => {
  it.each(["FRESH", "STYLE", "TECH"])("supports %s and normalizes account identifiers", (brand) => {
    const parsed = parseRegistration(form({ brand }));
    expect(parsed.email).toBe("manager@example.com");
    expect(parsed.outletId).toBe("OUT100");
    expect(parsed.brand).toBe(brand);
  });
  it("rejects a Fresh window after the 08:00 deadline", () => expect(() => parseRegistration(form({ windowCloseTime: "08:01" }))).toThrow("08:00"));
  it("allows a later Style delivery window", () => expect(parseRegistration(form({ brand: "STYLE", windowOpenTime: "10:00", windowCloseTime: "12:00" })).windowCloseTime).toBe("12:00"));
  it("requires booking instructions for mall access", () => expect(() => parseRegistration(form({ brand: "STYLE", parkingConstraint: "mall_dock" }))).toThrow("mall"));
  it.each([{ brand: "OTHER" }, { password: "short" }, { email: "bad" }, { windowOpenTime: "09:00", windowCloseTime: "08:00" }])("rejects invalid registration fields %j", (overrides) => expect(() => parseRegistration(form(overrides))).toThrow());
});
