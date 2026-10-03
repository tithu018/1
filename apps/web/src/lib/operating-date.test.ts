import { describe, expect, it } from "vitest";
import { localDate, nextServiceDate, parseServiceDate } from "./operating-date";
describe("Colombo service dates", () => {
  it("uses the 16:00 cutoff including month rollover", () => {
    expect(nextServiceDate(new Date("2026-10-31T10:29:59Z")).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(nextServiceDate(new Date("2026-10-31T10:30:00Z")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(localDate(new Date("2026-10-31T19:00:00Z"))).toBe("2026-11-01");
  });
  it("rejects impossible dates", () => { expect(() => parseServiceDate("2026-02-30")).toThrow(); expect(() => parseServiceDate("tomorrow")).toThrow(); });
});
