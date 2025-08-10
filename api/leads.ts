import { buildWhatsAppLink } from "../wa";
import { notifyTelegram } from "../notify";
import { z } from "zod";
import { sendClientEmail, sendAdminEmail } from "../mail";
import { saveLead } from "../storage";
import { verifyTurnstile } from "../turnstile";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  const turnstileOk = await verifyTurnstile(req.headers["cf-turnstile-token"]);
  if (!turnstileOk) return res.status(403).json({ error: "turnstile_failed" });

  const parsed = LeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "validation_failed", details: parsed.error.flatten() });
  const lead = parsed.data;

  const deeplink = buildWhatsAppLink({
    phone: process.env.BUSINESS_WHATSAPP_PHONE!,
    lang: lead.lang,
    payload: { name: lead.name, phone: lead.phone, estimate: lead.estimate, callback: lead.callback_window }
  });

  const leadId = await saveLead({ ...lead, whatsapp_deeplink: deeplink });

  const emailSent = await sendClientEmail(lead.lang, lead.email ?? "", lead.estimate);
  await sendAdminEmail({ lead, leadId, deeplink });

  await notifyTelegram({ lead, leadId, deeplink }).catch(() => {});

  return res.status(200).json({ lead_id: leadId, whatsapp_deeplink: deeplink, email_sent: !!emailSent });
}
