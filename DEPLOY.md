# Деплой сайта

Сайт должен запускаться как Node.js Web Service, потому что обратный звонок отправляет заявки в Bitrix24 через серверный обработчик `/api/callback`.

## Render

1. Загрузите проект в GitHub без файла `.env`.
2. В Render создайте новый Web Service из этого репозитория.
3. Start command: `npm start`.
4. Добавьте переменные окружения:
   - `BITRIX_WEBHOOK_BASE_URL` — полный входящий webhook Bitrix24.
   - `BITRIX_DEAL_CATEGORY_ID` — `1` для воронки КодЛаб.
   - `BITRIX_DEAL_STAGE_ID` — `NEW`.
   - `BITRIX_CURRENCY` — `RUB`.
   - `BITRIX_SOURCE_ID` — `WEB`.
5. Откройте выданный Render URL и проверьте форму обратного звонка.

## Локальный запуск

```bash
npm start
```

Локальный адрес: `http://localhost:3000`.
