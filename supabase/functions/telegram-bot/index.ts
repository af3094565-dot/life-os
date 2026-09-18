import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type Habit = {
  id: string
  name: string
  emoji?: string
  completions?: Record<string, boolean>
  reminderTime?: string
  startDate?: string
  targetDays?: number
  timesPerWeek?: number
  priority?: string
}

type Store = {
  habits?: Habit[]
  diamonds?: number
}

type TgUpdate = {
  message?: {
    chat: { id: number }
    text?: string
    from?: { id: number; username?: string; first_name?: string }
  }
  callback_query?: {
    id: string
    data?: string
    from: { id: number }
    message?: { chat: { id: number } }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('Life OS Telegram bot OK', { status: 200 })
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const miniAppUrl = Deno.env.get('TELEGRAM_MINI_APP_URL') ?? ''

  if (!botToken || !supabaseUrl || !serviceKey) {
    return new Response('misconfigured', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const update = (await req.json()) as TgUpdate

  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message?.chat.id
    if (!chatId) return ok()

    const data = cq.data ?? ''
    if (data.startsWith('done:')) {
      const habitId = data.slice(5)
      const profile = await findByTelegram(admin, cq.from.id)
      if (!profile) {
        await answerCallback(botToken, cq.id, 'Сначала открой Mini App и войди')
        return ok()
      }
      const result = await markHabitDone(admin, profile.id, habitId)
      await answerCallback(botToken, cq.id, result)
      await send(botToken, chatId, result)
    }
    return ok()
  }

  const msg = update.message
  if (!msg?.text) return ok()

  const chatId = msg.chat.id
  const text = msg.text.trim()
  const fromId = msg.from?.id
  if (!fromId) return ok()

  const profile = await findByTelegram(admin, fromId)

  if (text.startsWith('/start')) {
    const lines = [
      '👋 Life OS — трекер привычек в Telegram.',
      '',
      profile
        ? `Привет, ${profile.name}! Аккаунт связан.`
        : 'Открой Mini App — аккаунт создастся автоматически.',
      '',
      'Команды:',
      '/today — привычки на сегодня',
      '/done — отметить привычку',
      '/status — энергия и прогресс',
      '/app — открыть приложение',
    ]
    await send(botToken, chatId, lines.join('\n'), miniAppKeyboard(miniAppUrl))
    return ok()
  }

  if (text.startsWith('/app')) {
    if (!miniAppUrl) {
      await send(botToken, chatId, 'URL Mini App ещё не настроен (TELEGRAM_MINI_APP_URL).')
    } else {
      await send(botToken, chatId, 'Открыть Life OS:', miniAppKeyboard(miniAppUrl))
    }
    return ok()
  }

  if (!profile) {
    await send(
      botToken,
      chatId,
      'Аккаунт не найден. Открой Mini App один раз — или привяжи Telegram в профиле на сайте.',
      miniAppKeyboard(miniAppUrl),
    )
    return ok()
  }

  if (text.startsWith('/today') || text.startsWith('/done')) {
    const store = await loadStore(admin, profile.id)
    const today = todayKey()
    const due = (store.habits ?? []).filter((h) => isDueToday(h, today))
    if (!due.length) {
      await send(botToken, chatId, 'На сегодня нет активных привычек ✨')
      return ok()
    }

    if (text.startsWith('/today')) {
      const lines = due.map((h, i) => {
        const done = !!h.completions?.[today]
        return `${i + 1}. ${done ? '✅' : '⬜️'} ${h.emoji ?? '•'} ${h.name}`
      })
      await send(botToken, chatId, `Привычки на сегодня:\n\n${lines.join('\n')}`)
      return ok()
    }

    // /done → кнопки
    const buttons = due
      .filter((h) => !h.completions?.[today])
      .slice(0, 8)
      .map((h) => [
        {
          text: `${h.emoji ?? '✓'} ${h.name}`.slice(0, 40),
          callback_data: `done:${h.id}`,
        },
      ])

    if (!buttons.length) {
      await send(botToken, chatId, 'Все привычки на сегодня уже отмечены 🎉')
      return ok()
    }

    await send(botToken, chatId, 'Что отметить?', {
      inline_keyboard: buttons,
    })
    return ok()
  }

  if (text.startsWith('/status')) {
    const store = await loadStore(admin, profile.id)
    const today = todayKey()
    const habits = store.habits ?? []
    const due = habits.filter((h) => isDueToday(h, today))
    const done = due.filter((h) => h.completions?.[today]).length
    await send(
      botToken,
      chatId,
      [
        `🔋 Энергия: ${store.diamonds ?? 0}`,
        `Сегодня: ${done}/${due.length}`,
        `Всего привычек: ${habits.length}`,
      ].join('\n'),
    )
    return ok()
  }

  await send(botToken, chatId, 'Не понял. Попробуй /today, /done, /status или /app')
  return ok()
})

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

async function findByTelegram(
  admin: ReturnType<typeof createClient>,
  telegramId: number,
) {
  const { data } = await admin
    .from('profiles')
    .select('id, name, telegram_id')
    .eq('telegram_id', telegramId)
    .maybeSingle()
  return data
}

async function loadStore(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<Store> {
  const { data } = await admin
    .from('user_stores')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.data as Store) ?? {}
}

async function saveStore(
  admin: ReturnType<typeof createClient>,
  userId: string,
  store: Store,
) {
  await admin.from('user_stores').upsert({
    user_id: userId,
    data: store,
    updated_at: new Date().toISOString(),
  })
}

async function markHabitDone(
  admin: ReturnType<typeof createClient>,
  userId: string,
  habitId: string,
): Promise<string> {
  const store = await loadStore(admin, userId)
  const habits = store.habits ?? []
  const idx = habits.findIndex((h) => h.id === habitId)
  if (idx < 0) return 'Привычка не найдена'
  const today = todayKey()
  const habit = habits[idx]!
  if (habit.completions?.[today]) return `Уже отмечено: ${habit.name}`
  habits[idx] = {
    ...habit,
    completions: { ...(habit.completions ?? {}), [today]: true },
  }
  store.habits = habits
  await saveStore(admin, userId, store)
  return `✅ ${habit.emoji ?? ''} ${habit.name}`.trim()
}

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Упрощённо: активна, если стартовала и ещё не «сформирована» по targetDays. */
function isDueToday(h: Habit, today: string) {
  if (h.startDate && h.startDate > today) return false
  return true
}

function miniAppKeyboard(url: string) {
  if (!url) return undefined
  return {
    inline_keyboard: [[{ text: '🚀 Открыть Life OS', web_app: { url } }]],
  }
}

async function send(
  token: string,
  chatId: number,
  text: string,
  reply_markup?: unknown,
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup,
    }),
  })
}

async function answerCallback(token: string, id: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text: text.slice(0, 180) }),
  })
}
