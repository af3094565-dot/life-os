# Life OS — трекер привычек

Веб-приложение в стиле Life OS для отслеживания привычек, целей и ежедневных квестов.

## Открыть приложение

После деплоя на GitHub Pages:

**https://af3094565-dot.github.io/life-os/**

## Запуск локально

```bash
npm install
npm run dev
```

Без `.env.local` работает как раньше (данные в `localStorage`).

## Облако + Telegram (полная интеграция)

1. Создай проект на [supabase.com](https://supabase.com), в SQL Editor выполни `supabase/migrations/001_life_os.sql`.
2. Скопируй `.env.example` → `.env.local`, вставь `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
3. В [@BotFather](https://t.me/BotFather) создай бота → получи токен.
4. Задеплой Edge Functions и секреты:

```bash
supabase functions deploy telegram-auth
supabase functions deploy telegram-bot
supabase functions deploy telegram-reminders

supabase secrets set TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_MINI_APP_URL=https://af3094565-dot.github.io/life-os/ \
  REMINDER_TZ_OFFSET_MINUTES=360
```

5. Webhook бота:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT>.supabase.co/functions/v1/telegram-bot"
```

6. В BotFather → Bot Settings → Menu Button / Web App укажи URL сайта (HTTPS).

После этого: сайт и Mini App делят один аккаунт и стор; бот отвечает на `/today`, `/done`, `/status` и шлёт напоминания по `reminderTime`.

## Разделы

- **Дашборд** — следующий шаг, квесты дня, прогресс
- **Привычки** — месячная сетка, добавление и удаление привычек
- **Цели / Квесты / Прогресс** — цели, миссии и аналитика
