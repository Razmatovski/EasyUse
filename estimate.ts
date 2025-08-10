type AreaRange = "2-4" | "4-6" | "6-8" | "8+";
type Scope = "tiling_only" | "full_renovation_no_furniture" | "turnkey_with_fixtures_furniture";
type TileType = "<=60x60" | ">=60x120" | "mosaic";

function midpoint(area: AreaRange): number {
  switch (area) {
    case "2-4": return 3;
    case "4-6": return 5;
    case "6-8": return 7;
    case "8+": return 9;
  }
}

export function calculateEstimate(
  area_m2: AreaRange,
  scope: Scope,
  tile_type: TileType,
  plumbing: { wall_hung_wc: boolean; shower_or_bath: boolean; vanity_sink: boolean; rain_shower: boolean; floor_heating: boolean; }
) {
  const baseRate: Record<Scope, number> = {
    tiling_only: 800,
    full_renovation_no_furniture: 1200,
    turnkey_with_fixtures_furniture: 1500
  };

  const area = midpoint(area_m2);
  let labor = baseRate[scope] * area;

  const tileCoef: Record<TileType, number> = {
    "<=60x60": 1.00,
    ">=60x120": 1.15,
    "mosaic": 1.20
  };
  labor *= tileCoef[tile_type];

  const demolitionCoef = (scope === "tiling_only") ? 1.05 : 1.20;
  labor *= demolitionCoef;

  let addons = 0;
  if (plumbing.wall_hung_wc) addons += 800;
  if (plumbing.shower_or_bath) addons += 1200;
  if (plumbing.vanity_sink) addons += 700;
  if (plumbing.rain_shower) addons += 900;
  if (plumbing.floor_heating) addons += 300 * area;

  const estimate_low = Math.round((labor * 0.95 + addons * 0.9) / 100) * 100;
  const estimate_high = Math.round((labor * 1.10 + addons * 1.1) / 100) * 100;

  let daysMin = 12, daysMax = 18;
  if (scope === "tiling_only") { daysMin = 8; daysMax = 12; }
  if (scope === "full_renovation_no_furniture") { daysMin = 12; daysMax = 18; }
  if (scope === "turnkey_with_fixtures_furniture") { daysMin = 12; daysMax = 20; }
  if (tile_type !== "<=60x60") daysMax += 2;
  if (plumbing.floor_heating) daysMax += 1;

  return { low: estimate_low, high: estimate_high, days_min: daysMin, days_max: daysMax };
}
