export type RegistrationInput = {
  displayName: string; email: string; password: string; outletId: string;
  brand: "FRESH" | "STYLE" | "TECH"; district: string;
  dockType: string; parkingConstraint: string; windowOpenTime: string; windowCloseTime: string; mallWindow: string | null;
  address: string | null; latitude: number | null; longitude: number | null;
};

const clockTime = "(?:[01]\\d|2[0-3]):[0-5]\\d";

// Registration may target either depot; a missing field keeps the dispatcher's own depot.
export function parseDepot(form: FormData, fallback: string) {
  const depotId = String(form.get("depotId") ?? "").trim() || fallback;
  if (!depotId || depotId.length > 40) throw new Error("Choose the depot for this registration.");
  return depotId;
}

export function parseAccount(form: FormData) {
  const displayName = String(form.get("displayName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!displayName || displayName.length > 100) throw new Error("Enter a name of up to 100 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email address.");
  if (password.length < 12 || new TextEncoder().encode(password).length > 72) throw new Error("Use a password of at least 12 characters and at most 72 bytes.");
  return { displayName, email, password };
}

export function parseRegistration(form: FormData): RegistrationInput {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const { displayName, email, password } = parseAccount(form);
  const outletId = value("outletId").toUpperCase(), brand = value("brand");
  const district = value("district"), dockType = value("dockType"), parkingConstraint = value("parkingConstraint");
  const windowOpenTime = value("windowOpenTime"), windowCloseTime = value("windowCloseTime");
  if (!displayName || displayName.length > 100) throw new Error("Enter a manager name of up to 100 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid email address.");
  if (password.length < 12 || new TextEncoder().encode(password).length > 72) throw new Error("Use a password of at least 12 characters and at most 72 bytes.");
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(outletId)) throw new Error("Enter an outlet ID using 2–40 letters, numbers, hyphens or underscores.");
  if (!["FRESH", "STYLE", "TECH"].includes(brand)) throw new Error("Choose Fresh, Style or Tech.");
  if (!district || district.length > 100) throw new Error("Enter the outlet district.");
  if (!["rear_dock", "street", "mall_dock"].includes(dockType) || !["normal", "van_only", "mall_dock"].includes(parkingConstraint)) throw new Error("Choose valid dock and access rules.");
  const time = new RegExp(`^${clockTime}$`);
  if (!time.test(windowOpenTime) || !time.test(windowCloseTime) || windowOpenTime >= windowCloseTime) throw new Error("The delivery window must end after it starts.");
  if (brand === "FRESH" && windowCloseTime > "08:00") throw new Error("Fresh deliveries must arrive by 08:00.");
  const mallWindow = value("mallWindow") || null;
  if ((dockType === "mall_dock" || parkingConstraint === "mall_dock") && !mallWindow) throw new Error("Enter the mall access window or booking instructions.");
  if (mallWindow && mallWindow.length > 300) throw new Error("Keep mall instructions under 300 characters.");
  if (parkingConstraint === "mall_dock") {
    const access = new RegExp(`^(${clockTime})\\s*-\\s*(${clockTime})`).exec(mallWindow ?? "");
    if (!access || access[1] >= access[2]) throw new Error("Start the mall access window with HH:MM-HH:MM, for example 06:00-08:00 service entrance.");
    if (windowOpenTime < access[1] || windowCloseTime > access[2]) throw new Error(`The delivery window must fall within the mall access window ${access[1]}-${access[2]}.`);
  }
  const address = value("address") || null;
  if (address && address.length > 200) throw new Error("Keep the outlet address under 200 characters.");
  const latitudeText = value("latitude"), longitudeText = value("longitude");
  if (Boolean(latitudeText) !== Boolean(longitudeText)) throw new Error("Enter both latitude and longitude, or leave both blank.");
  const latitude = latitudeText ? Number(latitudeText) : null, longitude = longitudeText ? Number(longitudeText) : null;
  if (latitude !== null && longitude !== null && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 5.8 || latitude > 10 || longitude < 79.4 || longitude > 82)) throw new Error("Outlet coordinates must be within Sri Lanka.");
  return { displayName, email, password, outletId, brand: brand as RegistrationInput["brand"], district, dockType, parkingConstraint, windowOpenTime, windowCloseTime, mallWindow, address, latitude, longitude };
}
