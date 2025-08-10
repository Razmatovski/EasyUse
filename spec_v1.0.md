# ТЗ (Markdown): Лендинг «Łazienka pod klucz — Wrocław +30 km» с квиз-генерацией лидами (PL/EN/UA), клиенты — WhatsApp/e-mail, админ — Telegram

## 0) Роль и контекст
- Роль: продакт/техлид. Реализация в **Codex (CLI/Web)** либо в любом serverless-стеке (Next.js/Astro) — контракты и функции ниже совместимы.
- Цель: собрать квалифицированные лиды на ремонт санузла **под ключ** во Вроцлаве и радиусе 30 км.

---

## 1) KPI и цели
- CR → лид (с квизом): **≥8% мобайл / ≥10% десктоп**.
- Время реакции на лид (админ уведомлён): **≤5 мин**.
- Производительность (мобайл): **LCP ≤ 2.5s**, **PageSpeed ≥ 90**, **JS ≤ 200 KB**.

---

## 2) Локализация и языки
- Языки интерфейса: **PL (default)**, EN, UA.
- Автовыбор по `Accept-Language`, ручной переключатель (sticky).
- Сохранение выбора в cookie/localStorage.
- Все пользовательские коммуникации (e-mail/WA) — на выбранном языке.

---

## 3) Структура страницы (одна страница `/`)
1. **Hero (Above the fold)**  
   Заголовок, подзаголовок, кнопки: **Napisz na WhatsApp**, **Zadzwoń teraz**, **Wyceń w 60 s**.
2. **Выгоды (иконки)**  
   Stały kosztorys 48h, płatność etapами, zakup/logistyka, czysty montaż, gwarancja 24 mies.
3. **Квиз/калькулятор (5–6 шагов)**  
   Вилка цены и срок → форма контакта (финальный шаг).
4. **Кейсы (2–4)**  
   До/после, метраж, срок, бюджет работ, особенности.
5. **Процесс (4 шага)**  
   Pomiar → Kosztorys → Umowa/Zakup → Montaż/Odbiór/Gwarancja.
6. **FAQ (6–8)**  
   Цена, сроки, материалы, гарантия, оплата, чистота/шум.
7. **Контакт/карта**  
   Короткая форма, кнопки WhatsApp/Call, часы, зона Wrocław +30 km.
8. **Футер**  
   Контакты, политика, согласия (RODO), NAP.

---

## 4) Пользовательские потоки (flows)
- **Flow A (быстрый):** Клик по **WhatsApp** → открывается чат (deeplink) с предзаполненным текстом.  
- **Flow B (квиз):** 5–6 шагов → расчёт вилки → ввод контакта → спасибо-экран с кнопкой **Otwórz czat w WhatsApp** + письмо с чек-листом.  
- **Flow C (звонок):** Click-to-Call `tel:+48…`.

---

## 5) Архитектура в Codex (функции и секреты)

### 5.1 Функции
- `estimate.calculate` — расчёт вилки (serverless).
- `leads.create` — валидация, сохранение (Sheets/CRM), письма, генерация WA-deeplink, **уведомление в Telegram админу**.
- `whatsapp.build_link` — генерация `wa.me` ссылки с предзаполненным текстом.
- `notify.telegram` — отправка сообщения в админский ТГ.
- `ab.assign_bucket` — A/B вариант (заголовок/форма).

### 5.2 Секреты
- Почта: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`.  
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.  
- Google Sheets/CRM: `SHEETS_ID` **или** `PIPEDRIVE_API_KEY`.  
- Антибот: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

---

## 6) Квиз/калькулятор — поля и логика

### 6.1 Поля шагов
1. `bathroom_type`: `bathroom` | `toilet` | `combined`  
2. `area_m2`: `2-4` | `4-6` | `6-8` | `8+`  
3. `scope`: `tiling_only` | `full_renovation_no_furniture` | `turnkey_with_fixtures_furniture`  
4. `tile_type`: `<=60x60` | `>=60x120` | `mosaic`  
5. `plumbing` (флаги): `wall_hung_wc`, `shower_or_bath`, `vanity_sink`, `rain_shower`, `floor_heating`  
6. `materials`: `client` | `contractor` | `mixed`

### 6.2 Формула расчёта (TypeScript, референс)
```ts
type AreaRange = "2-4"|"4-6"|"6-8"|"8+";
type Scope = "tiling_only"|"full_renovation_no_furniture"|"turnkey_with_fixtures_furniture";
type TileType = "<=60x60"|">=60x120"|"mosaic";

function midpoint(area: AreaRange): number {
  switch(area){
    case "2-4": return 3;
    case "4-6": return 5;
    case "6-8": return 7;
    case "8+":  return 9; // стартовый ориентир, уточняется на замере
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

  // сроки
  let daysMin = 12, daysMax = 18;
  if (scope === "tiling_only") { daysMin = 8; daysMax = 12; }
  if (scope === "full_renovation_no_furniture") { daysMin = 12; daysMax = 18; }
  if (scope === "turnkey_with_fixtures_furniture") { daysMin = 12; daysMax = 20; }
  if (tile_type !== "<=60x60") daysMax += 2;
  if (plumbing.floor_heating) daysMax += 1;

  return { low: estimate_low, high: estimate_high, days_min: daysMin, days_max: daysMax };
}
```

> Примечание: цифры — стартовые ориентиры для MVP. Обязательно калибровать после 10–15 лидов.

---

## 7) Контракт API (OpenAPI)

### 7.1 `/api/estimate` (POST)
```yaml
openapi: 3.0.0
info:
  title: Bathroom Estimate API
  version: 1.0.0
paths:
  /api/estimate:
    post:
      summary: Calculate price/time range from quiz answers
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [area_m2, scope, tile_type, plumbing]
              properties:
                area_m2: { type: string, enum: ["2-4","4-6","6-8","8+"] }
                scope: { type: string, enum: ["tiling_only","full_renovation_no_furniture","turnkey_with_fixtures_furniture"] }
                tile_type: { type: string, enum: ["<=60x60",">=60x120","mosaic"] }
                plumbing:
                  type: object
                  properties:
                    wall_hung_wc: { type: boolean }
                    shower_or_bath: { type: boolean }
                    vanity_sink: { type: boolean }
                    rain_shower: { type: boolean }
                    floor_heating: { type: boolean }
      responses:
        "200":
          description: Estimate result
          content:
            application/json:
              schema:
                type: object
                properties:
                  low: { type: integer }
                  high: { type: integer }
                  days_min: { type: integer }
                  days_max: { type: integer }
```

### 7.2 `/api/leads` (POST)
```yaml
paths:
  /api/leads:
    post:
      summary: Create lead, send notifications, return WhatsApp deeplink
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, phone, preferred_channel, lang, quiz_answers, estimate, consent]
              properties:
                name: { type: string, minLength: 2, maxLength: 60 }
                phone: { type: string, description: "E.164 (+48…)" }
                email: { type: string, nullable: true }
                preferred_channel: { type: string, enum: ["whatsapp","email","phone"] }
                callback_window: { type: string, enum: ["morning","day","evening"], nullable: true }
                lang: { type: string, enum: ["pl","en","ua"] }
                quiz_answers: { type: object }   # raw quiz payload
                estimate:
                  type: object
                  properties:
                    low: { type: integer } 
                    high: { type: integer }
                    days_min: { type: integer }
                    days_max: { type: integer }
                utm:
                  type: object
                  properties:
                    source: { type: string }
                    medium: { type: string }
                    campaign: { type: string }
                    term: { type: string }
                    content: { type: string }
                consent: { type: boolean }
      responses:
        "200":
          description: Lead created
          content:
            application/json:
              schema:
                type: object
                properties:
                  lead_id: { type: string }
                  whatsapp_deeplink: { type: string }
                  email_sent: { type: boolean }
```

---

## 8) Пример реализации `leads.create` (TypeScript, serverless)
```ts
import { calculateEstimate } from "./estimate";
import { buildWhatsAppLink } from "./wa";
import { notifyTelegram } from "./notify";
import { z } from "zod";
import { sendClientEmail, sendAdminEmail } from "./mail";
import { saveLead } from "./storage"; // Google Sheets/CRM adapter
import { verifyTurnstile } from "./turnstile";

const LeadSchema = z.object({
  name: z.string().min(2).max(60),
  phone: z.string().regex(/^\+?\d{8,16}$/), // простая проверка E.164
  email: z.string().email().optional().or(z.literal("")),
  preferred_channel: z.enum(["whatsapp","email","phone"]),
  callback_window: z.enum(["morning","day","evening"]).optional(),
  lang: z.enum(["pl","en","ua"]),
  quiz_answers: z.record(z.any()),
  estimate: z.object({
    low: z.number(), high: z.number(), days_min: z.number(), days_max: z.number()
  }),
  utm: z.object({
    source: z.string().optional(), medium: z.string().optional(),
    campaign: z.string().optional(), term: z.string().optional(), content: z.string().optional()
  }).optional(),
  consent: z.boolean()
});

export default async function handler(req:any,res:any){
  if (req.method!=="POST") return res.status(405).end();
  // Антибот
  const turnstileOk = await verifyTurnstile(req.headers["cf-turnstile-token"]);
  if (!turnstileOk) return res.status(403).json({error:"turnstile_failed"});

  const parsed = LeadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({error:"validation_failed", details: parsed.error.flatten()});
  const lead = parsed.data;

  // Генерация deeplink в WA (для клиента и для админа)
  const deeplink = buildWhatsAppLink({
    phone: process.env.BUSINESS_WHATSAPP_PHONE!, // ваш бизнес-номер
    lang: lead.lang,
    payload: {
      name: lead.name, phone: lead.phone,
      estimate: lead.estimate, callback: lead.callback_window
    }
  });

  // Сохранение (Sheets/CRM)
  const leadId = await saveLead({ ...lead, whatsapp_deeplink: deeplink });

  // Письма
  const emailSent = await sendClientEmail(lead.lang, lead.email ?? "", lead.estimate);
  await sendAdminEmail({ lead, leadId, deeplink });

  // Telegram админу (основной канал уведомления)
  await notifyTelegram({ lead, leadId, deeplink }).catch(()=>{ /* лог инцидента, но фронт не блокировать */ });

  return res.status(200).json({ lead_id: leadId, whatsapp_deeplink: deeplink, email_sent: !!emailSent });
}
```

---

## 9) WhatsApp: генерация deeplink (без API)
```ts
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
Proszę o контакт. Preferencja: ${p.callback ?? "Dowolnie"}.`,
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
```

---

## 10) Telegram: уведомление админу
```ts
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

*Zakres*: ${lead.quiz_answers?.scope} | *Pow.*: ${lead.quiz_answers?.area_m2} | *Płytka*: ${lead.quiz_answers?.tile_type}
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
```

---

## 11) Письма (клиент и админ)

### 11.1 Клиент (PL/EN/UA)
```txt
[PL] Temat: Wycena łazienki — potwierdzenie zgłoszenia
Dziękujemy za zgłoszenie. W załączniku — lista kontroli odbioru łazienki (PDF).
Skontaktujemy się dziś до {hh:mm}. Szacunek: {low}–{high} PLN, {days_min}–{days_max} dni.
```
```txt
[EN] Subject: Bathroom quote — confirmation
Thanks for your request. Attached: bathroom handover checklist (PDF).
We’ll contact you by {hh:mm} today. Estimate: {low}–{high} PLN, {days_min}–{days_max} days.
```
```txt
[UA] Тема: Кошторис санвузла — підтвердження
Дякуємо за заявку. У додатку — чек-лист приймання санвузла (PDF).
Зв’яжемось сьогодні до {hh:mm}. Оцінка: {low}–{high} PLN, {days_min}–{days_max} днів.
```

### 11.2 Админ (e-mail, кратко)
```txt
Subject: [Lead] Łazienka — {name} — {low}-{high} PLN
Body: ссылка tel:+, deeplink WhatsApp, все ответы квиза, UTM.
```

---

## 12) I18n (ключевые строки UI)
```json
{
  "pl": {
    "hero_h1": "Łazienka под klucz we Wrocławiu w 12–20 dni",
    "hero_sub": "Stały kosztorys, zakup materiałów, czysty montaż, 24 mies. gwarancji",
    "cta_whatsapp": "Napisz на WhatsApp",
    "cta_call": "Zadzwoń teraz",
    "cta_quote": "Wyceń w 60 s",
    "result_note": "Zostaw контакт — wyślemy dokładny kosztorys и 3 układy płytek."
  },
  "en": {
    "hero_h1": "Bathroom renovation, turnkey — Wrocław in 12–20 days",
    "hero_sub": "Fixed quote, materials supplied, clean installation, 24-month warranty",
    "cta_whatsapp": "Message on WhatsApp",
    "cta_call": "Call now",
    "cta_quote": "Get a 60-sec estimate",
    "result_note": "Leave your contact — we’ll send a precise quote and 3 tile layouts."
  },
  "ua": {
    "hero_h1": "Санвузол під ключ у Вроцлаві за 12–20 днів",
    "hero_sub": "Фіксований кошторис, закупівля матеріалів, чистий монтаж, гарантія 24 міс.",
    "cta_whatsapp": "Написати в WhatsApp",
    "cta_call": "Подзвонити зараз",
    "cta_quote": "Оцінити за 60 с",
    "result_note": "Залиште контакт — надішлемо точний кошторис і 3 варіанти викладки плитки."
  }
}
```

---

## 13) Аналитика (GA4 + конверсии Ads)
События (client-side + server-side дубль):
- `view_hero`, `click_sticky_cta`, `click_whatsapp`, `start_whatsapp_chat`,
- `quiz_step` `{step:n}`, `quiz_view_result`,
- `lead_submit`, `lead_valid`, `lead_reject`,
- `click_call`, `click_email`,
- `view_case`, `faq_open` `{id}`,
- `scroll_75`.

Пример отправки:
```js
gtag('event','lead_submit',{lang:'pl',scope:'turnkey_with_fixtures_furniture'});
```

---

## 14) Антиспам и безопасность
- **Cloudflare Turnstile** (score threshold), **honeypot**, **rate limit**: IP ≤ 5/min; по телефону ≤ 3/сутки.
- Нормализация телефона в E.164 (по умолчанию 🇵🇱 +48).
- Логи без персональных данных на клиенте; секреты — только сервер.

---

## 15) RODO/GDPR (согласия)
Тексты согласий рядом с формой:
```txt
[PL] „Wyrażam zgodę na przetwarzanie moich danych osobowych w celu przygotowania wyceny oraz kontaktu zwrotnego zgodnie z Polityką prywatności.”
[EN] “I consent to the processing of my personal data for preparing the quote and follow-up contact, in accordance with the Privacy Policy.”
[UA] «Надаю згоду на обробку моїх персональних даних з метою підготовки кошторису та зворотного зв’язку відповідно до Політики конфіденційності.»
```
Хранить: факт согласия, дата/время, IP (хеш), версия текста, язык.

---

## 16) Производительность и UX (обязательные)
- Без видео на первом экране; **реальное фото кейса**.
- Sticky-бар на мобиле: слева **WhatsApp**, справа **Zadzwoń**.
- Изображения **WebP/AVIF**, lazy-load, шрифты локально.
- Доступность: контраст ≥ 4.5:1, фокус-стили, кликабельные зоны ≥ 44 px.

---

## 17) SEO / LocalBusiness JSON-LD
```html
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"LocalBusiness",
  "name":"Łazienka pod klucz — Wrocław",
  "areaServed":"Wrocław, Poland (30 km)",
  "image":["https://example.com/case1.webp"],
  "telephone":"+48 500 111 222",
  "email":"contact@example.com",
  "url":"https://example.com",
  "address":{"@type":"PostalAddress","addressLocality":"Wrocław","addressCountry":"PL"},
  "openingHours":"Mo-Sa 08:00-19:00",
  "priceRange":"PLN"
}
</script>
```

---

## 18) A/B-тесты (волна 1)
- **Заголовок:** сроки (12–20 дней) **vs** фикс-смета за 48h.
- **Форма:** квиз 5 шагов **vs** короткая форма (телефон + «kiedy oddzwonić?»).
- **Лид-магнит:** чек-лист PDF **vs** «3 tile layouts» (превью в письме).

---

## 19) Приёмочные критерии
- Валидация телефона: `+48 512 345 678` проходит; `12345` — отклоняется.
- Без чекбокса согласия — сабмит недоступен.
- Успешный лид ⇒ **Telegram** уведомление ≤ 3 с, **e-mail клиенту** ≤ 2 мин.
- Ответ `/api/leads` содержит `lead_id`, `whatsapp_deeplink`, `email_sent`.
- GA4 фиксирует: `lead_submit`, `click_whatsapp`, `start_whatsapp_chat`.
- LCP ≤ 2.5s на эмуляции 4G (Lighthouse Mobile).

---

## 20) Контент к запуску
- 3 кейса (до/после), у каждого: метраж, срок, бюджет работ, особенности.
- 10–12 фото (портрет/альбом), 1-минутное видео-пролёт.
- Лид-магнит: **чек-лист приёмки санузла** (1 стр., PL/EN/UA, PDF).

---

## 21) .env (пример)
```bash
FROM_EMAIL="no-reply@example.com"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user"
SMTP_PASS="pass"

TELEGRAM_BOT_TOKEN="123456:ABC..."
TELEGRAM_CHAT_ID="-1001234567890"

SHEETS_ID="1AbCdEf..."
TURNSTILE_SITE_KEY="..."
TURNSTILE_SECRET_KEY="..."

BUSINESS_WHATSAPP_PHONE="48500111222"
```

---

## 22) Фолбэки и риски
- Если Telegram недоступен → fallback: e-mail админу, ретраи 0.5s/2s/5s.
- Deeplink WhatsApp не доставляет сообщения сам по себе — клиент должен кликнуть (ожидаемо).
- Вилка стоимости — **только работы**, материалы отдельно (чётко указать в UI).

---

## 23) Сниппеты UI (Hero, sticky-bar)

### 23.1 Hero кнопки (React/JSX)
```tsx
<div className="flex gap-3 flex-wrap">
  <a href="https://wa.me/48500111222" className="btn btn-primary">Napisz na WhatsApp</a>
  <a href="tel:+48500111222" className="btn btn-outline">Zadzwoń teraz</a>
  <button className="btn btn-ghost" onClick={()=>openQuiz()} aria-label="Wyceń w 60 s">Wyceń w 60 s</button>
</div>
```

### 23.2 Sticky-bar (мобайл)
```html
<div class="fixed bottom-0 left-0 right-0 flex">
  <a class="flex-1 p-4 text-center" href="https://wa.me/48500111222">Napisz na WhatsApp</a>
  <a class="flex-1 p-4 text-center" href="tel:+48500111222">Zadzwoń</a>
</div>
```

---

## 24) FAQ (коротко, PL — UI-копирайт)
```txt
Ile trwa remont? Zwykle 12–20 dni „pod klucz”. Termin potwierdzamy w umowie (z buforem na schnięcie).
Co z materiałami? Zakup i logistyka po naszej stronie lub mieszany wariант — pełна спецификация перед стартem.
Jak liczy się cena? Powierzchnia, demontaż/wykonanie podkładów, формат płytek, liczba пунктów wod.-кан., nisze/обудовы.
Jakie są płatności? Etapami: materiały → etapy robót → final po odbiorze.
Jaka gwarancja? 24 miesiące на prace. На materiały — zgodnie z producentem.
Jak z czystością и hałasem? Ochrona podłóg, odkurzacz z фильтром budowlanym, wywóz gruzu codziennie.
```

---

## 25) Дорожная карта улучшений (после 2–3 недель)
- Калибровка коэффициентов квиза по фактическим сметам/чекам.
- Динамический соц-пруф: «Dziś 4 osoby otrzymały wycenę».
- Персонализация по гео: кейсы из ближайших районов.
- Подключение **WhatsApp Cloud API** (подтверждённые шаблоны) — для старта диалога вне 24-часового окна.

---
