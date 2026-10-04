import { describe, expect, it } from "vitest";
import { parseDepot, parseRegistration } from "./registration";

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
  it("accepts a delivery window inside the mall access window", () => expect(parseRegistration(form({ brand: "STYLE", parkingConstraint: "mall_dock", mallWindow: "06:00-09:00 service entrance", windowOpenTime: "06:30", windowCloseTime: "08:30" })).mallWindow).toBe("06:00-09:00 service entrance"));
  it("rejects a delivery window outside the mall access window", () => expect(() => parseRegistration(form({ brand: "STYLE", parkingConstraint: "mall_dock", mallWindow: "06:00-08:00", windowOpenTime: "07:00", windowCloseTime: "09:00" }))).toThrow("within the mall access window"));
  it("rejects mall access without an HH:MM-HH:MM window", () => expect(() => parseRegistration(form({ brand: "STYLE", parkingConstraint: "mall_dock", mallWindow: "Call security" }))).toThrow("HH:MM-HH:MM"));
  it("stores an optional address and coordinates", () => {
    const parsed = parseRegistration(form({ address: "Peradeniya Road, Kandy", latitude: "7.2906", longitude: "80.6337" }));
    expect(parsed).toMatchObject({ address: "Peradeniya Road, Kandy", latitude: 7.2906, longitude: 80.6337 });
  });
  it.each([{ latitude: "7.29" }, { latitude: "51.5", longitude: "-0.12" }])("rejects incomplete or out-of-country coordinates %j", (overrides) => expect(() => parseRegistration(form(overrides))).toThrow());
});

describe("registration depot", () => {
  it("uses the selected depot", () => { const data = new FormData(); data.set("depotId", "Kandy"); expect(parseDepot(data, "Peliyagoda")).toBe("Kandy"); });
  it("falls back to the dispatcher depot", () => expect(parseDepot(new FormData(), "Peliyagoda")).toBe("Peliyagoda"));
});
