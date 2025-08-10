# Łazienka pod klucz — Wrocław +30 km: SPEC v1.1

## 0) Принятые решения
- **Хранилище лидов:** Google Sheets (MVP) + адаптер под Pipedrive позже.
- **Хостинг:** Vercel (Next.js SSG). Кэш: `stale-while-revalidate` 60s.
- **Почта:** Brevo/Sendinblue SMTP (дешёвый старт), доменная подпись SPF/DKIM/DMARC.
- **Каналы клиента:** WhatsApp deeplink + e-mail; **админ:** Telegram.
- **Серверные события в Ads/GA4:** включаем (Measurement Protocol).
- **Проверка гео-радиуса:** включаем (Wrocław центр, 30 км). Предупреждение + фолбэк.
- **Антибот:** Cloudflare Turnstile + honeypot + rate-limit IP/phone.
- **A/B:** простое разделение 50/50 через `ab.assign_bucket`.

## 1) Изменения в UX (vs v1.0)
1. В квиз добавлен шаг 0: **локализация**
   - `postal_code` (PL) **или** `locality` (select: Wrocław + окрестности).
   - Если расстояние > 30 км → сообщение: *„Poza strefą 30 km — wycena i dojazd do uzgodnienia”* и пометка `serviceable=false`.
2. На экране результата два CTA: **Otwórz czat w WhatsApp** и **Wyślij wycenę na e-mail**.
3. Accept-Language → автоподбор языка + ручной переключатель.

## 2) API
- `/api/estimate` принимает `postal_code` (опц.) и возвращает `serviceable` и `distance_km`.
- `/api/leads` принимает `postal_code`, `serviceable`, сохраняет оба поля.
- Полный контракт — см. `openapi_lazienka.yaml`.

## 3) Проверка радиуса обслуживания
Точка центра (Wrocław Rynek): **51.109°N, 17.032°E**. Радиус: **30 км**.
- Если `postal_code` неизвестен — не блокируем, `serviceable=true`, `distance_km=null`.

## 4) Accept-Language autodetect + переключатель
- Языки интерфейса: **PL (default)**, EN, UA.
- Сохранение выбора в localStorage/cookie.
- Коммуникации (e-mail/WA) — на выбранном языке.

## 5) Серверные события GA4
- Дублируем ключевые события через Measurement Protocol: `lead_submit_server`, `lead_valid`, `lead_reject`.
- Параметры: `lang`, `serviceable`, `ab_bucket` и др.

## 6) Согласия и RODO
- Сохраняем: `consent=true`, `consent_v="2025-08-10"`, timestamp, IP (hash), язык.

## 7) Фолбэки и ретраи
- Telegram недоступен → e-mail админу (ретраи 0.5s/2s/5s).
- SMTP недоступен → лог + сообщение пользователю, что e-mail в очереди.
- Turnstile fail → 403 + "spróbuj ponownie".

## 8) Чек-лист деплоя
1. Домены на Vercel, HTTPS auto.
2. SMTP (Brevo): API key, SPF/DKIM/DMARC.
3. GA4: Measurement ID + API Secret.
4. Turnstile: site key + secret.
5. Google Sheets: сервисный аккаунт, `SHEETS_ID`.
6. Telegram: бот, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
7. WhatsApp: бизнес-номер без `+` → `BUSINESS_WHATSAPP_PHONE`.
8. `pl_zip_geocodes.json` (локальный справочник индексов).
9. `robots.txt`, `sitemap.xml`.
10. Lighthouse Mobile ≥ 90, LCP ≤ 2.5 s.

## 9) .env
```bash
FROM_EMAIL="no-reply@example.com"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="xxxxxxxx"

TELEGRAM_BOT_TOKEN="123456:ABC..."
TELEGRAM_CHAT_ID="-1001234567890"

SHEETS_ID="1AbCdEf..."
TURNSTILE_SITE_KEY="..."
TURNSTILE_SECRET_KEY="..."

BUSINESS_WHATSAPP_PHONE="48500111222"

GA4_MEASUREMENT_ID="G-XXXXXXX"
GA4_API_SECRET="xxxxxxxx"

SERVICE_AREA_CENTER_LAT="51.109"
SERVICE_AREA_CENTER_LON="17.032"
SERVICE_AREA_RADIUS_KM="30"
```

## 10) Критерии завершения A/B
- ≥500 сессий на вариант и ≥100 завершённых квизов суммарно.
- Uplift ≥ +20% или p<0.05 (prop-test).

## 11) Риски
- Вилка — только работы, материалы отдельно.
- Deeplink WA требует клика клиента.
- Почтовый индекс даёт точность района, не адреса.
