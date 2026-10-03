import styles from "./trip.module.css";

export function StopMap({ latitude, longitude, address, outletId }: { latitude: number | null; longitude: number | null; address: string | null; outletId: string }) {
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return <p>No location registered for this stop.</p>;
  const bounds = [Math.max(-180, longitude - .012), Math.max(-90, latitude - .008), Math.min(180, longitude + .012), Math.min(90, latitude + .008)];
  const embed = new URL("https://www.openstreetmap.org/export/embed.html");
  embed.searchParams.set("bbox", bounds.join(",")); embed.searchParams.set("layer", "mapnik"); embed.searchParams.set("marker", `${latitude},${longitude}`);
  const fullMap = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  return <section className={styles.stopMap} aria-label={`Map for ${outletId}`}>
    <p>{address ?? outletId}</p>
    <iframe title={`OpenStreetMap · ${outletId}`} src={embed.toString()} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
    <div><a href={fullMap} target="_blank" rel="noopener noreferrer">Open larger map</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></div>
  </section>;
}
