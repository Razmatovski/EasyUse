// --- helpers/geo.ts
const WROCLAW = { lat: 51.109, lon: 17.032 };

export function haversineKm(a:{lat:number,lon:number}, b:{lat:number,lon:number}){
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
  const s1=Math.sin(dLat/2), s2=Math.sin(dLon/2);
  const aa=s1*s1 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*s2*s2;
  return 2*R*Math.asin(Math.sqrt(aa));
}

// MVP: локальный справочник индексов { "50-001": {lat,lon}, ... }
import zip2geo from "./pl_zip_geocodes.json";

export function distanceFromZip(postal:string){
  const rec = zip2geo[postal];
  if(!rec) return {distance_km:null, serviceable:true};
  const d = haversineKm(WROCLAW, rec);
  return { distance_km: Math.round(d*10)/10, serviceable: d<=30 };
}

// --- estimate.ts
type AreaRange = "2-4"|"4-6"|"6-8"|"8+";
type Scope = "tiling_only"|"full_renovation_no_furniture"|"turnkey_with_fixtures_furniture";
type TileType = "<=60x60"|">=60x120"|"mosaic";

function midpoint(area: AreaRange): number {
  switch(area){
    case "2-4": return 3;
    case "4-6": return 5;
    case "6-8": return 7;
    case "8+":  return 9;
  }
}

export function calculateEstimate(
  area_m2: AreaRange,
  scope: Scope,
  tile_type: TileType,
  plumbing: { wall_hung_wc:boolean; shower_or_bath:boolean; vanity_sink:boolean; rain_shower:boolean; floor_heating:boolean; }
){
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

  const estimate_low  = Math.round((labor * 0.95 + addons * 0.9) / 100) * 100;
  const estimate_high = Math.round((labor * 1.10 + addons * 1.1) / 100) * 100;

  let daysMin = 12, daysMax = 18;
  if (scope === "tiling_only") { daysMin = 8; daysMax = 12; }
  if (scope === "full_renovation_no_furniture") { daysMin = 12; daysMax = 18; }
  if (scope === "turnkey_with_fixtures_furniture") { daysMin = 12; daysMax = 20; }
  if (tile_type !== "<=60x60") daysMax += 2;
  if (plumbing.floor_heating) daysMax += 1;

  return { low: estimate_low, high: estimate_high, days_min: daysMin, days_max: daysMax };
}

// --- wa.ts
type Lang = "pl"|"en"|"ua";

export function buildWhatsAppLink(opts:{
  phone: string; // business WA number, digits only, e.g. "48500111222"
  lang: Lang;
  payload: {
    name: string; phone: string;
    estimate: { low:number; high:number; days_min:number; days_max:number; };
    callback?: "morning"|"day"|"evening";
  }
}){
  const t = {
    pl: (p:any)=>`Dzień dobry! Interesuje mnie łazienka pod klucz.
Szacunek: ${p.estimate.low}-${p.estimate.high} PLN, termin: ${p.estimate.days_min}-${p.estimate.days_max} dni.
Proszę o kontakt. Preferencja: ${p.callback ?? "Dowolnie"}.`,
    en: (p:any)=>`Hello! I'm interested in a turnkey bathroom.
Estimate: ${p.estimate.low}-${p.estimate.high} PLN, timeline: ${p.estimate.days_min}-${p.estimate.days_max} days.
Please contact me. Preference: ${p.callback ?? "Any"}.`,
    ua: (p:any)=>`Вітаю! Цікавить санвузол під ключ.
Оцінка: ${p.estimate.low}-${p.estimate.high} PLN, термін: ${p.estimate.days_min}-${p.estimate.days_max} днів.
Прошу зв’язок. Побажання: ${p.callback ?? "Будь-коли"}.`
  }[opts.lang](opts.payload);

  const text = encodeURIComponent(t);
  return `https://wa.me/${opts.phone}?text=${text}`;
}

// --- notify.ts
export async function notifyTelegram({ lead, leadId, deeplink }:{
  lead:any; leadId:string; deeplink:string;
}){
  const api = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const langFlag = {pl:"🇵🇱", en:"🇬🇧", ua:"🇺🇦"}[lead.lang] || "";
  const text =
`*Nowy lead — Łazienka pod klucz (Wrocław +30 km)*
ID: \`${leadId}\`
Imię: *${lead.name}*
Telefon: [${lead.phone}](tel:${lead.phone})  (${lead.preferred_channel})
Język: ${langFlag} ${lead.lang.toUpperCase()}

*Zakres*: ${lead.scope} | *Pow.*: ${lead.quiz_answers?.area_m2} | *Płytка*: ${lead.quiz_answers?.tile_type}
*Dodatki*: WC:${lead.quiz_answers?.plumbing?.wall_hung_wc?'✓':'—'}, Prysz/Wanna:${lead.quiz_answers?.plumbing?.shower_or_bath?'✓':'—'}, Umywalka:${lead.quiz_answers?.plumbing?.vanity_sink?'✓':'—'}, Deszczownica:${lead.quiz_answers?.plumbing?.rain_shower?'✓':'—'}, Ogrzewanie:${lead.quiz_answers?.plumbing?.floor_heating?'✓':'—'}

*Szacunek*: ${lead.estimate.low}-${lead.estimate.high} PLN | ${lead.estimate.days_min}-${lead.estimate.days_max} dni
UTM: ${lead.utm?.source ?? '-'} / ${lead.utm?.medium ?? '-'} / ${lead.utm?.campaign ?? '-'}
*WA:* [Otwórz czat](${deeplink})`;

  await fetch(api, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      text
    })
  });
}

// --- api/leads.ts
import { buildWhatsAppLink } from "./wa";
import { notifyTelegram } from "./notify";
import { z } from "zod";
import { sendClientEmail, sendAdminEmail } from "./mail";
import { saveLead } from "./storage";
import { verifyTurnstile } from "./turnstile";

const LeadSchema = z.object({
  name: z.string().min(2).max(60),
  phone: z.string().regex(/^\+?\d{8,16}$/),
  email: z.string().email().optional().or(z.literal("")),
  preferred_channel: z.enum(["whatsapp","email","phone"]),
  callback_window: z.enum(["morning","day","evening"]).optional(),
  lang: z.enum(["pl","en","ua"]),
  postal_code: z.string().optional(),
  serviceable: z.boolean().default(true),
  quiz_answers: z.record(z.any()),
  estimate: z.object({ low: z.number(), high: z.number(), days_min: z.number(), days_max: z.number() }),
  utm: z.object({ source: z.string().optional(), medium: z.string().optional(), campaign: z.string().optional(), term: z.string().optional(), content: z.string().optional() }).optional(),
  consent: z.boolean()
});

export default async function handler(req:any,res:any){
  if (req.method!=="POST") return res.status(405).end();
  const turnstileOk = await verifyTurnstile(req.headers["cf-turnstile-token"]);
  if (!turnstileOk) return res.status(403).json({error:"turnstile_failed"});

  const parsed = LeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({error:"validation_failed", details: parsed.error.flatten()});
  const lead = parsed.data;

  const deeplink = buildWhatsAppLink({
    phone: process.env.BUSINESS_WHATSAPP_PHONE!,
    lang: lead.lang,
    payload: { name: lead.name, phone: lead.phone, estimate: lead.estimate, callback: lead.callback_window }
  });

  const leadId = await saveLead({ ...lead, whatsapp_deeplink: deeplink });

  const emailSent = await sendClientEmail(lead.lang, lead.email ?? "", lead.estimate);
  await sendAdminEmail({ lead, leadId, deeplink });

  await notifyTelegram({ lead, leadId, deeplink }).catch(()=>{});

  return res.status(200).json({ lead_id: leadId, whatsapp_deeplink: deeplink, email_sent: !!emailSent });
}

// --- i18n keys
export const i18n = {
  pl: {
    hero_h1: "Łazienka pod klucz we Wrocławiu w 12–20 dni",
    hero_sub: "Stały kosztorys, zakup materiałów, czysty montaż, 24 mies. gwarancji",
    cta_whatsapp: "Napisz na WhatsApp",
    cta_call: "Zadzwoń teraz",
    cta_quote: "Wyceń w 60 s",
    result_note: "Zostaw kontakt — wyślemy dokładny kosztorys i 3 układy płytek.",
  },
  en: {
    hero_h1: "Bathroom renovation, turnkey — Wrocław in 12–20 days",
    hero_sub: "Fixed quote, materials supplied, clean installation, 24-month warranty",
    cta_whatsapp: "Message on WhatsApp",
    cta_call: "Call now",
    cta_quote: "Get a 60-sec estimate",
    result_note: "Leave your contact — we’ll send a precise quote and 3 tile layouts."
  },
  ua: {
    hero_h1: "Санвузол під ключ у Вроцлаві за 12–20 днів",
    hero_sub: "Фіксований кошторис, закупівля матеріалів, чистий монтаж, гарантія 24 міс.",
    cta_whatsapp: "Написати в WhatsApp",
    cta_call: "Подзвонити зараз",
    cta_quote: "Оцінити за 60 с",
    result_note: "Залиште контакт — надішлемо точний кошторис і 3 варіанти викладки плитки."
  }
};
