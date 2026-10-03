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

export interface CatalogProduct {
  code: string;
  name: string;
  category: "Dry" | "Chilled";
  pack: string;
  unitWeightKg: number;
  unitVolumeM3: number;
}

export const freshCatalog: CatalogProduct[] = [
  { code: "FR-D01", name: "Basmati rice", category: "Dry", pack: "4 × 5 kg bag", unitWeightKg: 20.4, unitVolumeM3: 0.042 },
  { code: "FR-D02", name: "Red lentils (dhal)", category: "Dry", pack: "10 × 1 kg pack", unitWeightKg: 10.3, unitVolumeM3: 0.014 },
  { code: "FR-D03", name: "White sugar", category: "Dry", pack: "10 × 1 kg pack", unitWeightKg: 10.2, unitVolumeM3: 0.013 },
  { code: "FR-D04", name: "Wheat flour", category: "Dry", pack: "10 × 1 kg pack", unitWeightKg: 10.3, unitVolumeM3: 0.017 },
  { code: "FR-D07", name: "Instant noodles", category: "Dry", pack: "12 × 5-pack", unitWeightKg: 4.2, unitVolumeM3: 0.046 },
  { code: "FR-D08", name: "Cream crackers", category: "Dry", pack: "12 × 490 g pack", unitWeightKg: 6.4, unitVolumeM3: 0.048 },
  { code: "FR-C01", name: "Fresh milk", category: "Chilled", pack: "12 × 1 L carton", unitWeightKg: 12.8, unitVolumeM3: 0.018 },
  { code: "FR-C02", name: "Set yoghurt", category: "Chilled", pack: "48 × 80 g cup", unitWeightKg: 4.6, unitVolumeM3: 0.014 }
];
