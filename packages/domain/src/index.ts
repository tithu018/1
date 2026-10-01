export const APP_NAME = "Waypoint";

export const supportedLocales = ["en", "si", "ta"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const userRoles = ["store_manager", "dispatcher", "loader", "driver"] as const;
export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  store_manager: "Store Manager",
  dispatcher: "Dispatcher",
  loader: "Loader",
  driver: "Driver"
};

export const orderStatuses = [
  "submitted",
  "confirmed",
  "allocated",
  "loaded",
  "out_for_delivery",
  "delivered",
  "deferred"
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  submitted: "Submitted",
  confirmed: "Confirmed",
  allocated: "Allocated",
  loaded: "Loaded",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  deferred: "Deferred"
};
