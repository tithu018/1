export function localDate(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

export function parseServiceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid service date.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Choose a valid service date.");
  return date;
}

export function nextServiceDate(now = new Date()) {
  const date = parseServiceDate(localDate(now));
  const hour = Number(now.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", hourCycle: "h23" }));
  date.setUTCDate(date.getUTCDate() + (hour >= 16 ? 2 : 1));
  return date;
}
