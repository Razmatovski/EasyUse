export async function notifyTelegram({ lead, leadId, deeplink }: {
  lead: any; leadId: string; deeplink: string;
}) {
  const api = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const langFlag = { pl: "🇵🇱", en: "🇬🇧", ua: "🇺🇦" }[lead.lang] || "";
  const text =
`*Nowy lead — Łazienka pod klucz (Wrocław +30 km)*
ID: \`${leadId}\`
Imię: *${lead.name}*
Telefon: [${lead.phone}](tel:${lead.phone})  (${lead.preferred_channel})
Język: ${langFlag} ${lead.lang.toUpperCase()}

*Zakres*: ${lead.scope} | *Pow.*: ${lead.quiz_answers?.area_m2} | *Płytka*: ${lead.quiz_answers?.tile_type}
*Dodatki*: WC:${lead.quiz_answers?.plumbing?.wall_hung_wc?'✓':'—'}, Prysz/Wanna:${lead.quiz_answers?.plumbing?.shower_or_bath?'✓':'—'}, Umywalka:${lead.quiz_answers?.plumbing?.vanity_sink?'✓':'—'}, Deszczownica:${lead.quiz_answers?.plumbing?.rain_shower?'✓':'—'}, Ogrzewanie:${lead.quiz_answers?.plumbing?.floor_heating?'✓':'—'}

*Szacunek*: ${lead.estimate.low}-${lead.estimate.high} PLN | ${lead.estimate.days_min}-${lead.estimate.days_max} dni
UTM: ${lead.utm?.source ?? '-'} / ${lead.utm?.medium ?? '-'} / ${lead.utm?.campaign ?? '-'}
*WA:* [Otwórz czat](${deeplink})`;

  await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      text
    })
  });
}
