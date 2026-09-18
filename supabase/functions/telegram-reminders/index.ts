import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/**
 * Cron: раз в минуту шлёт напоминания по habits[].reminderTime (HH:mm, локаль UTC+0 по умолчанию).
 * Настрой TZ через REMINDER_TZ_OFFSET_MINUTES (для UTC+6 = 360).
 *
 * Schedule в supabase/config.toml или Dashboard → Edge Functions → Cron.
 */

type Habit = {
  id: string
  name: string
  emoji?: string
  reminderTime?: string
  completions?: Record<string, boolean>
}

type Store = { habits?: Habit[] }

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (secret) {
    const hdr = req.headers.get('Authorization')
    if (hdr !== `Bearer ${secret}`) {
      return new Response('unauthorized', { status: 401 })
    }
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const offsetMin = Number(Deno.env.get('REMINDER_TZ_OFFSET_MINUTES') ?? '360')
  const miniAppUrl = Deno.env.get('TELEGRAM_MINI_APP_URL') ?? ''

  if (!botToken || !supabaseUrl || !serviceKey) {
    return new Response('misconfigured', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = new Date(Date.now() + offsetMin * 60_000)
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const slot = `${hh}:${mm}`
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, telegram_id, name')
    .not('telegram_id', 'is', null)

  let sent = 0
  for (const p of profiles ?? []) {
    if (!p.telegram_id) continue
    const { data: row } = await admin
      .from('user_stores')
      .select('data')
      .eq('user_id', p.id)
      .maybeSingle()

    const store = (row?.data as Store) ?? {}
    const due = (store.habits ?? []).filter(
      (h) =>
        h.reminderTime === slot &&
        !h.completions?.[today],
    )
    if (!due.length) continue

    const text =
      `⏰ Напоминание Life OS\n\n` +
      due.map((h) => `${h.emoji ?? '•'} ${h.name}`).join('\n')

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: p.telegram_id,
        text,
        reply_markup: miniAppUrl
          ? {
              inline_keyboard: [
                [{ text: 'Открыть Life OS', web_app: { url: miniAppUrl } }],
                ...due.slice(0, 5).map((h) => [
                  {
                    text: `✅ ${h.name}`.slice(0, 40),
                    callback_data: `done:${h.id}`,
                  },
                ]),
              ],
            }
          : undefined,
      }),
    })
    sent++
  }

  return new Response(JSON.stringify({ ok: true, slot, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
