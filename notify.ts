import { Lead } from './types/lead';

export async function notifyTelegram({ lead, leadId, deeplink }: {
  lead: Lead; leadId: string; deeplink: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing");
    return false;
  }
  const api = `https://api.telegram.org/bot${token}/sendMessage`;
  const langFlag = { pl: "🇵🇱", en: "🇬🇧", ua: "🇺🇦" }[lead.lang] || "";
  const text =
`*Nowy lead — Łazienka pod klucz (Wrocław +30 km)*
ID: \`${leadId}\`
Imię: *${lead.name}*
Telefon: [${lead.phone}](tel:${lead.phone})  (${lead.preferred_channel})
Język: ${langFlag} ${lead.lang.toUpperCase()}

*Zakres*: ${lead.quiz_answers?.scope} | *Pow.*: ${lead.quiz_answers?.area_m2} | *Płytка*: ${lead.quiz_answers?.tile_type}
*Dodatki*: WC:${lead.quiz_answers?.plumbing?.wall_hung_wc?'✓':'—'}, Prysz/Wanna:${lead.quiz_answers?.plumbing?.shower_or_bath?'✓':'—'}, Umywalka:${lead.quiz_answers?.plumbing?.vanity_sink?'✓':'—'}, Deszczownica:${lead.quiz_answers?.plumbing?.rain_shower?'✓':'—'}, Ogrzewanie:${lead.quiz_answers?.plumbing?.floor_heating?'✓':'—'}

*Szacunek*: ${lead.estimate.low}-${lead.estimate.high} PLN | ${lead.estimate.days_min}-${lead.estimate.days_max} dni
UTM: ${lead.utm?.source ?? '-'} / ${lead.utm?.medium ?? '-'} / ${lead.utm?.campaign ?? '-'}
*WA:* [Otwórz czat](${deeplink})`;

  try {
    await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
        text
      })
    });
    return true;
  } catch (e) {
    console.error("notifyTelegram fetch failed", e);
    return false;
  }
}
