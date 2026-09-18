import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  corsHeaders,
  parseTgUser,
  validateTelegramInitData,
} from '../_shared/telegram.ts'

const TELEGRAM_EMAIL_DOMAIN = 'tg.lifeos.local'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!botToken || !supabaseUrl || !serviceKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const body = (await req.json()) as {
      initData?: string
      /** Если есть JWT — привязать Telegram к текущему аккаунту */
      linkOnly?: boolean
    }
    const initData = body.initData?.trim()
    if (!initData) return json({ error: 'initData required' }, 400)

    const validated = await validateTelegramInitData(initData, botToken)
    if (!validated) return json({ error: 'Invalid Telegram initData' }, 401)

    const tgUser = parseTgUser(validated.user)
    if (!tgUser?.id) return json({ error: 'No Telegram user' }, 401)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    const jwt = authHeader?.replace(/^Bearer\s+/i, '')

    // Привязка к уже залогиненному аккаунту сайта
    if (body.linkOnly && jwt) {
      const userClient = createClient(supabaseUrl, serviceKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: authed, error: authErr } = await userClient.auth.getUser(jwt)
      if (authErr || !authed.user) return json({ error: 'Unauthorized' }, 401)

      const { data: taken } = await admin
        .from('profiles')
        .select('id')
        .eq('telegram_id', tgUser.id)
        .maybeSingle()

      if (taken && taken.id !== authed.user.id) {
        return json({ error: 'Этот Telegram уже привязан к другому аккаунту' }, 409)
      }

      const { error: updErr } = await admin
        .from('profiles')
        .update({
          telegram_id: tgUser.id,
          telegram_username: tgUser.username ?? null,
        })
        .eq('id', authed.user.id)

      if (updErr) return json({ error: updErr.message }, 500)

      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', authed.user.id)
        .single()

      return json({ ok: true, linked: true, profile })
    }

    // Вход / регистрация через Telegram
    const { data: existing } = await admin
      .from('profiles')
      .select('*')
      .eq('telegram_id', tgUser.id)
      .maybeSingle()

    let userId = existing?.id as string | undefined
    const email = `tg${tgUser.id}@${TELEGRAM_EMAIL_DOMAIN}`
    const password = await stablePassword(botToken, tgUser.id)
    const displayName =
      [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') ||
      tgUser.username ||
      `TG ${tgUser.id}`

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          telegram_id: tgUser.id,
          telegram_username: tgUser.username,
        },
      })

      if (createErr) {
        // Пользователь мог уже существовать по email
        const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const found = listed?.users?.find((u) => u.email === email)
        if (!found) return json({ error: createErr.message }, 500)
        userId = found.id
      } else {
        userId = created.user!.id
      }

      await admin.from('profiles').upsert({
        id: userId,
        email,
        name: displayName,
        telegram_id: tgUser.id,
        telegram_username: tgUser.username ?? null,
      })
    } else {
      await admin
        .from('profiles')
        .update({
          telegram_username: tgUser.username ?? null,
          name: existing?.name || displayName,
        })
        .eq('id', userId)
    }

    const { data: sessionData, error: signErr } =
      await admin.auth.signInWithPassword({ email, password })

    if (signErr || !sessionData.session) {
      // Обновим пароль и повторим
      await admin.auth.admin.updateUserById(userId!, { password })
      const retry = await admin.auth.signInWithPassword({ email, password })
      if (retry.error || !retry.data.session) {
        return json({ error: retry.error?.message ?? 'Sign-in failed' }, 500)
      }
      return json({
        ok: true,
        session: retry.data.session,
        profile: await loadProfile(admin, userId!),
      })
    }

    return json({
      ok: true,
      session: sessionData.session,
      profile: await loadProfile(admin, userId!),
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

async function loadProfile(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data } = await admin.from('profiles').select('*').eq('id', userId).single()
  return data
}

async function stablePassword(botToken: string, telegramId: number) {
  const enc = new TextEncoder()
  const data = enc.encode(`life-os-tg:${botToken}:${telegramId}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
