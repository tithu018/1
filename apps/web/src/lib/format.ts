export function displayDate(value: Date | string = new Date()) {
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function displayTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" });
}

export function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
