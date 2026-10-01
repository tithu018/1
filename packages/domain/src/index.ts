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

export type Brand = "fresh" | "style" | "tech";
export type Depot = "peliyagoda" | "kandy";

export interface OutletContext {
  id: string;
  brand: Brand;
  district: string;
  depot: Depot;
  deliveryWindow: string;
}

export interface DeliveryOrder {
  id: string;
  outletId: string;
  kind: string;
  units: number;
  weightKg: number;
  volumeM3: number;
  status: OrderStatus;
  deliveryWindow: string;
  expectedShortfall?: string;
}

export const demoOutlet: OutletContext = {
  id: "OUT010",
  brand: "fresh",
  district: "Colombo",
  depot: "peliyagoda",
  deliveryWindow: "05:00–07:30"
};

export const demoOrders: DeliveryOrder[] = [
  {
    id: "ORD0096797",
    outletId: "OUT010",
    kind: "Dry",
    units: 45,
    weightKg: 359,
    volumeM3: 1.878,
    status: "submitted",
    deliveryWindow: "05:00–07:30"
  },
  {
    id: "ORD0096654",
    outletId: "OUT010",
    kind: "Chilled",
    units: 40,
    weightKg: 293.5,
    volumeM3: 1.683,
    status: "deferred",
    deliveryWindow: "05:00–07:30"
  },
  {
    id: "ORD0096653",
    outletId: "OUT010",
    kind: "Dry",
    units: 44,
    weightKg: 330.8,
    volumeM3: 1.621,
    status: "delivered",
    deliveryWindow: "05:00–07:30",
    expectedShortfall: "2 units flagged short before departure"
  }
];
