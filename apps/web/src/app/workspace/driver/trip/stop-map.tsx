"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import type { Circle, CircleMarker, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./trip.module.css";

type Location = { latitude: number; longitude: number; accuracy: number };
export function StopMap({ latitude, longitude, address, outletId }: { latitude: number | null; longitude: number | null; address: string | null; outletId: string }) {
  const container = useRef<HTMLDivElement>(null), map = useRef<LeafletMap | null>(null);
  const positionMarker = useRef<CircleMarker | null>(null), accuracyCircle = useRef<Circle | null>(null);
  const watch = useRef<number | null>(null), firstFix = useRef(true);
  const [ready, setReady] = useState(false), [mapError, setMapError] = useState(false);
  const [status, setStatus] = useState<"idle" | "requesting" | "tracking" | "error">("idle");
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [location, setLocation] = useState<Location | null>(null), [error, setError] = useState("");
  const valid = latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  useEffect(() => {
    if (!valid || !container.current || latitude === null || longitude === null) return;
    let disposed = false;
    const node = container.current;
    let resize: ResizeObserver | undefined;
    void import("leaflet").then((L) => {
      if (disposed) return;
      const view = L.map(node, { scrollWheelZoom: false }).setView([latitude, longitude], 15);
      map.current = view;
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(view);
      tiles.on("tileerror", () => { if (!disposed) setMapError(true); });
      const icon = L.divIcon({ className: styles.destinationPin, html: '<span aria-hidden="true"></span>', iconSize: [30, 38], iconAnchor: [15, 38] });
      const title = document.createElement("div"); title.textContent = `${outletId} · ${address ?? "Delivery stop"}`;
      L.marker([latitude, longitude], { icon, title: "Delivery stop", alt: "Delivery stop" }).addTo(view).bindPopup(title);
      resize = new ResizeObserver(() => view.invalidateSize()); resize.observe(node);
      setReady(true);
    }).catch((error) => { console.error("Driver map could not initialise", error); if (!disposed) setMapError(true); });
    return () => {
      disposed = true;
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
      resize?.disconnect(); map.current?.remove(); map.current = null;
      positionMarker.current = null; accuracyCircle.current = null;
    };
  }, [latitude, longitude, address, outletId, valid]);

  function stopLocation() {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    positionMarker.current?.remove(); accuracyCircle.current?.remove();
    positionMarker.current = null; accuracyCircle.current = null;
    setLocation(null); setError(""); setStatus("idle"); setTrackingEnabled(false);
  }
  function showLocation() {
    if (!window.isSecureContext) { setError("Location needs HTTPS on your phone. Localhost also works for development."); setStatus("error"); return; }
    if (!navigator.geolocation) { setError("Location is not supported by this browser."); setStatus("error"); return; }
    if (location && status === "tracking") { map.current?.setView([location.latitude, location.longitude], 16); return; }
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    setError(""); setStatus("requesting"); setTrackingEnabled(true); firstFix.current = true;
    watch.current = navigator.geolocation.watchPosition((position) => {
      if (!map.current) return;
      const current = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
      if (!Number.isFinite(current.latitude) || !Number.isFinite(current.longitude) || !Number.isFinite(current.accuracy) || Math.abs(current.latitude) > 90 || Math.abs(current.longitude) > 180 || current.accuracy < 0) return;
      setLocation(current); setStatus("tracking"); setError("");
      void import("leaflet").then((L) => {
        const view = map.current; if (!view || watch.current === null) return;
        const point: [number, number] = [current.latitude, current.longitude];
        if (positionMarker.current) positionMarker.current.setLatLng(point);
        else positionMarker.current = L.circleMarker(point, { radius: 8, color: "#fff", weight: 3, fillColor: "#2477d4", fillOpacity: 1 }).addTo(view).bindTooltip("You are here");
        const element = positionMarker.current.getElement(); element?.setAttribute("aria-label", "Your current location");
        if (accuracyCircle.current) accuracyCircle.current.setLatLng(point).setRadius(current.accuracy);
        else accuracyCircle.current = L.circle(point, { radius: current.accuracy, color: "#2477d4", weight: 1, fillColor: "#2477d4", fillOpacity: .1 }).addTo(view);
        if (firstFix.current && latitude !== null && longitude !== null) { view.fitBounds(L.latLngBounds([[latitude, longitude], point]), { padding: [35, 35], maxZoom: 16 }); firstFix.current = false; }
      });
    }, (failure) => {
      // A weak GPS signal can recover; only permission denial ends the watch.
      if (failure.code === 1) {
        if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
        watch.current = null;
        setTrackingEnabled(false);
        positionMarker.current?.remove(); accuracyCircle.current?.remove(); positionMarker.current = null; accuracyCircle.current = null;
        setLocation(null);
      }
      setStatus("error");
      setError(failure.code === 1 ? "Location access was denied. Allow location for this site in your browser settings and try again." : failure.code === 3 ? "Location timed out. Check your device location settings and try again." : "Your location is unavailable. Turn on device location and try again.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  }
  if (!valid) return <p>No location registered for this stop.</p>;
  const fullMap = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  return <section className={styles.stopMap} aria-label={`Map for ${outletId}`}>
    <p>{address ?? outletId}</p>
    <div ref={container} className={styles.liveMap} role="region" aria-label="OpenStreetMap showing the delivery stop and your location" />
    <div className={styles.mapControls}><button type="button" onClick={showLocation} disabled={!ready || status === "requesting"}><LocateFixed size={17} />{status === "requesting" ? "Finding location…" : status === "tracking" ? "Centre on me" : "Show my location"}</button><button type="button" disabled={!ready} onClick={() => map.current?.setView([latitude!, longitude!], 16)}><MapPin size={17} />Delivery stop</button>{trackingEnabled && <button type="button" onClick={stopLocation} aria-label="Stop location updates"><X size={17} />Stop</button>}</div>
    <div className={styles.mapLegend}><span><i />Delivery stop</span><span><i />Your position</span></div>
    {location && <p className={styles.locationStatus} role="status">{status === "tracking" ? "Location updating" : "Last known location"} · accuracy ±{Math.round(location.accuracy)} m</p>}
    {error && <p className={styles.locationError} role="alert">{error}</p>}
    {mapError && <p className={styles.locationError}>Map tiles could not load. Check your connection or open the larger map.</p>}
    <div className={styles.mapLinks}><a href={fullMap} target="_blank" rel="noopener noreferrer">Open larger map</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></div>
  </section>;
}
