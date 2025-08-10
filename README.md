# EasyUse

## Требования
- Node.js >= 20
- npm >= 11

## Установка и запуск
1. Установите зависимости:
   ```bash
   npm install
   ```
   или установите необходимые пакеты вручную:
   ```bash
   npm install zod nodemailer google-auth-library node-fetch
   ```
2. Создайте файл `.env` с необходимыми переменными окружения:
   ```env
   PORT=3000
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=xxxxxxxx
   ADMIN_EMAIL=admin@example.com
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHAT_ID=-1001234567890
   GOOGLE_SHEETS_ID=1AbCdEf...
   GOOGLE_SERVICE_ACCOUNT_EMAIL=service@example.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nABC...\\n-----END PRIVATE KEY-----\\n"
   BUSINESS_WHATSAPP_PHONE=48500111222
   PIPEDRIVE_API_TOKEN=xxxxxxxx
   PIPEDRIVE_BASE_URL=https://api.pipedrive.com/v1
   TURNSTILE_SECRET_KEY=xxxxxxxx
   SERVICE_AREA_CENTER_LAT=51.109
   SERVICE_AREA_CENTER_LON=17.032
   SERVICE_AREA_RADIUS_KM=30
   ```
3. Запустите сервер в режиме разработки:
   ```bash
   npm run dev
   # Server listening on port 3000
   ```

## API
- Полное описание доступно в файле [openapi_lazienka.yaml](openapi_lazienka.yaml).

### Пример запроса
```bash
curl -X POST http://localhost:3000/api/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "area_m2":"4-6",
    "scope":"tiling_only",
    "tile_type":"<=60x60",
    "plumbing":{
      "wall_hung_wc":true,
      "shower_or_bath":true,
      "vanity_sink":false,
      "rain_shower":false,
      "floor_heating":false
    },
    "postal_code":"50-123"
  }'
```

## Справочник почтовых индексов

Локальный файл `helpers/pl_zip_geocodes.json` содержит соответствие между почтовыми индексами Польши и их геокоординатами. Формат:

```json
{
  "50-001": { "lat": 51.109, "lon": 17.032 },
  "00-001": { "lat": 52.2297, "lon": 21.0122 }
}
```

Ключ — почтовый индекс, значение — объект с широтой `lat` и долготой `lon` (в градусах).

## Тестирование
```bash
npm test
```
