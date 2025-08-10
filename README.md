# EasyUse

## Требования
- Node.js >= 20
- npm >= 11

## Установка и запуск
1. Установите зависимости:
   ```bash
   npm install
   ```
2. Создайте файл `.env` с необходимыми переменными окружения.
   Пример:
   ```env
   PORT=3000
   API_KEY=your_api_key
   ```
3. Запустите сервер в режиме разработки:
   ```bash
   npm run dev
   ```

## API
- Полное описание доступно в файле [openapi_lazienka.yaml](openapi_lazienka.yaml).

### Пример запроса
```bash
curl -X POST http://localhost:3000/api/estimate \
  -H "Content-Type: application/json" \
  -d '{"area_m2":"4-6","scope":"tiling_only","tile_type":"ceramic","plumbing":true}'
```
