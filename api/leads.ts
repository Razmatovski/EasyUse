import { buildWhatsAppLink } from "../wa";
import { notifyTelegram } from "../notify";
import { z } from "zod";
import { sendClientEmail, sendAdminEmail } from "../mail";
import { saveLead } from "../storage";
import { verifyTurnstile } from "../turnstile";
import { createHash } from "crypto";
import { sendServerEvent } from "../ga4";

const LeadSchema = z.object({
  name: z.string().min(2).max(60),
  phone: z.string().regex(/^\+?\d{8,16}$/),
  email: z.string().email().optional().or(z.literal("")),
  preferred_channel: z.enum(["whatsapp","email","phone"]),
  callback_window: z.enum(["morning","day","evening"]).optional(),
  lang: z.enum(["pl","en","ua"]),
  postal_code: z.string().optional(),
  serviceable: z.boolean().default(true),
  quiz_answers: z.record(z.string(), z.any()),
  estimate: z.object({ low: z.number(), high: z.number(), days_min: z.number(), days_max: z.number() }),
  utm: z.object({ source: z.string().optional(), medium: z.string().optional(), campaign: z.string().optional(), term: z.string().optional(), content: z.string().optional() }).optional(),
  consent: z.boolean(),
  consent_v: z.string().optional(),
  consent_ts: z.string().optional(),
  ip_hash: z.string().optional(),
  ga_client_id: z.string().optional()
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  const turnstileOk = await verifyTurnstile(req.headers["cf-turnstile-token"]);
  if (!turnstileOk) return res.status(403).json({ error: "turnstile_failed" });

  const parsed = LeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "validation_failed", details: parsed.error.flatten() });
  const lead = parsed.data;
  lead.consent_v = process.env.CONSENT_VERSION || "1";
  lead.consent_ts = new Date().toISOString();
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string | undefined) ||
    req.socket?.remoteAddress ||
    "";
  lead.ip_hash = createHash("sha256").update(ip).digest("hex");

  const gaParams: Record<string, any> = {
    lang: lead.lang,
    serviceable: lead.serviceable,
    ab_bucket: (req.body as any)?.ab_bucket,
    utm_source: lead.utm?.source,
    utm_medium: lead.utm?.medium,
    utm_campaign: lead.utm?.campaign,
    utm_term: lead.utm?.term,
    utm_content: lead.utm?.content
  };

  sendServerEvent("lead_submit_server", gaParams, lead.ga_client_id || lead.ip_hash);

  const deeplink = buildWhatsAppLink({
    phone: process.env.BUSINESS_WHATSAPP_PHONE!,
    lang: lead.lang,
    payload: { name: lead.name, phone: lead.phone, estimate: lead.estimate, callback: lead.callback_window }
  });

  const leadId = await saveLead({ ...lead, whatsapp_deeplink: deeplink });

  sendServerEvent(lead.serviceable ? "lead_valid" : "lead_reject", gaParams, lead.ga_client_id || lead.ip_hash);

  let emailSent = false;
  if (lead.email) {
    emailSent = !!(await sendClientEmail(lead.lang, lead.email, lead.estimate));
  }

  const delays = [500, 2000, 5000];
  let notified = false;
  for (let i = 0; i <= delays.length; i++) {
    try {
      await notifyTelegram({ lead, leadId, deeplink });
      notified = true;
      break;
    } catch (e) {
      console.error("notifyTelegram failed", e);
      const delay = delays[i];
      if (delay) await new Promise(res => setTimeout(res, delay));
    }
  }
  if (!notified) {
    console.error("notifyTelegram failed after retries, sending admin email");
    await sendAdminEmail({ lead, leadId, deeplink });
  }

  return res.status(200).json({ lead_id: leadId, whatsapp_deeplink: deeplink, email_sent: !!emailSent });
}
