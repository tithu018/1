import { describe, expect, it } from "vitest";
import {
  orderStatusLabels,
  orderStatuses,
  roleLabels,
  supportedLocales,
  userRoles
} from "@waypoint/domain";

describe("shared Waypoint domain contract", () => {
  it("exposes exactly the four role scopes used by the workspaces", () => {
    expect(userRoles).toEqual(["store_manager", "dispatcher", "loader", "driver"]);
    expect(Object.keys(roleLabels)).toEqual(userRoles);
  });

  it("keeps every shared order status labelled", () => {
    expect(Object.keys(orderStatusLabels)).toEqual(orderStatuses);
  });

  it("supports the three required account locales", () => {
    expect(supportedLocales).toEqual(["en", "si", "ta"]);
  });
});
