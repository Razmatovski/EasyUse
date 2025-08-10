type Lang = "pl" | "en" | "ua";

export function buildWhatsAppLink(opts: {
  phone: string; // business WA number, digits only, e.g. "48500111222"
  lang: Lang;
  payload: {
    name: string; phone: string;
    estimate: { low:number; high:number; days_min:number; days_max:number; };
    callback?: "morning"|"day"|"evening";
  }
}) {
  const t = {
    pl: (p: any) => `Dzień dobry! Interesuje mnie łazienka pod klucz.
Szacunek: ${p.estimate.low}-${p.estimate.high} PLN, termin: ${p.estimate.days_min}-${p.estimate.days_max} dni.
Proszę o kontakt. Preferencja: ${p.callback ?? "Dowolnie"}.`,
    en: (p: any) => `Hello! I'm interested in a turnkey bathroom.
Estimate: ${p.estimate.low}-${p.estimate.high} PLN, timeline: ${p.estimate.days_min}-${p.estimate.days_max} days.
Please contact me. Preference: ${p.callback ?? "Any"}.`,
    ua: (p: any) => `Вітаю! Цікавить санвузол під ключ.
Оцінка: ${p.estimate.low}-${p.estimate.high} PLN, термін: ${p.estimate.days_min}-${p.estimate.days_max} днів.
Прошу зв’язок. Побажання: ${p.callback ?? "Будь-коли"}.`
  }[opts.lang](opts.payload);

  const text = encodeURIComponent(t);
  return `https://wa.me/${opts.phone}?text=${text}`;
}
