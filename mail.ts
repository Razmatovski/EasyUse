import nodemailer from "nodemailer";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  throw new Error("ADMIN_EMAIL environment variable is required");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendClientEmail(
  lang: "pl" | "en" | "ua",
  to: string,
  estimate: { low: number; high: number; days_min: number; days_max: number }
){
  if (!to) return null;
  const subject = {
    pl: "Twój kosztorys łazienki",
    en: "Your bathroom quote",
    ua: "Ваш кошторис санвузла"
  }[lang];
  const text = {
    pl: `Szacunkowy koszt: ${estimate.low}-${estimate.high} PLN. Termin: ${estimate.days_min}-${estimate.days_max} dni.`,
    en: `Estimated cost: ${estimate.low}-${estimate.high} PLN. Timeline: ${estimate.days_min}-${estimate.days_max} days.`,
    ua: `Орієнтовна вартість: ${estimate.low}-${estimate.high} PLN. Термін: ${estimate.days_min}-${estimate.days_max} днів.`
  }[lang];
  try {
    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to,
      subject,
      text
    });
    return true;
  } catch (e) {
    console.error("sendClientEmail failed", e);
    return false;
  }
}

export async function sendAdminEmail({
  lead,
  leadId,
  deeplink
}:{
  lead: any; leadId: string; deeplink: string;
}){
  const subject = `New lead ${leadId}`;
  const text = `Name: ${lead.name}\nPhone: ${lead.phone}\nWhatsApp: ${deeplink}\nLang: ${lead.lang}`;
  try {
    await transporter.sendMail({
      from: ADMIN_EMAIL,
      to: ADMIN_EMAIL,
      subject,
      text
    });
  } catch (e) {
    console.error("sendAdminEmail failed", e);
    throw e;
  }
}
