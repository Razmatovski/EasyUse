const SERVICE_AREA_CENTER = {
  lat: Number(process.env.SERVICE_AREA_CENTER_LAT ?? 51.109),
  lon: Number(process.env.SERVICE_AREA_CENTER_LON ?? 17.032)
};
const SERVICE_AREA_RADIUS_KM = Number(process.env.SERVICE_AREA_RADIUS_KM ?? 30);

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371,
    dLat = (b.lat - a.lat) * Math.PI / 180,
    dLon = (b.lon - a.lon) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2),
    s2 = Math.sin(dLon / 2);
  const aa = s1 * s1 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

// MVP: локальный справочник индексов { "50-001": {lat,lon}, ... }
import zip2geo from "./pl_zip_geocodes.json";

export function distanceFromZip(postal: string) {
  const rec = (zip2geo as Record<string, { lat: number; lon: number }>)[postal];
  if (!rec) return { distance_km: null, serviceable: true };
  const d = haversineKm(SERVICE_AREA_CENTER, rec);
  return {
    distance_km: Math.round(d * 10) / 10,
    serviceable: d <= SERVICE_AREA_RADIUS_KM
  };
}
