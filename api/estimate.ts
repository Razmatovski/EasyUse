import { z } from "zod";
import { calculateEstimate } from "../estimate";
import { distanceFromZip } from "../helpers/geo";

const EstimateSchema = z.object({
  area_m2: z.enum(["2-4","4-6","6-8","8+"]),
  scope: z.enum(["tiling_only","full_renovation_no_furniture","turnkey_with_fixtures_furniture"]),
  tile_type: z.enum(["<=60x60",">=60x120","mosaic"]),
  plumbing: z.object({
    wall_hung_wc: z.number().int().min(0),
    shower_or_bath: z.number().int().min(0),
    vanity_sink: z.number().int().min(0),
    rain_shower: z.number().int().min(0),
    floor_heating: z.number().int().min(0)
  }),
  bathrooms: z.number().int().min(1).max(10),
  postal_code: z.string().optional()
});

export default function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  const parsed = EstimateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "validation_failed", details: parsed.error.flatten() });
  const { area_m2, scope, tile_type, plumbing, bathrooms, postal_code } = parsed.data;
  const estimate = calculateEstimate(area_m2, scope, tile_type, plumbing, bathrooms);
  const geo = postal_code ? distanceFromZip(postal_code) : { serviceable: true, distance_km: null };
  return res.status(200).json({ ...estimate, ...geo });
}
