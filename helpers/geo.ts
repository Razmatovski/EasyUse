const WROCLAW = { lat: 51.109, lon: 17.032 };

import zip2geo from './pl_zip_geocodes.json';

export function haversineKm(a:{lat:number,lon:number}, b:{lat:number,lon:number}){
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const aa = s1 * s1 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

export function distanceFromZip(postal: string){
  const rec = (zip2geo as Record<string, {lat:number, lon:number}>)[postal];
  if (!rec) {
    return { distance_km: null as number | null, serviceable: true };
  }
  const d = haversineKm(WROCLAW, rec);
  return { distance_km: Math.round(d * 10) / 10, serviceable: d <= 30 };
}
