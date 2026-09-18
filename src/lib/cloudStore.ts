import { getSupabase, isCloudEnabled, type CloudProfile } from './supabase'

const EMPTY = '{}'

/** Локальный кэш зеркала облачного стора */
export function localStoreKey(userId: string) {
  return `life-os-habits-v12:${userId}`
}

export async function fetchCloudStore(userId: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb || !isCloudEnabled()) return null

  const { data, error } = await sb
    .from('user_stores')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[cloudStore] fetch failed', error.message)
    return null
  }
  if (!data) return null
  const payload = data.data
  if (!payload || (typeof payload === 'object' && Object.keys(payload as object).length === 0)) {
    return null
  }
  return JSON.stringify(payload)
}

export async function pushCloudStore(userId: string, storeJson: string): Promise<boolean> {
  const sb = getSupabase()
  if (!sb || !isCloudEnabled()) return false

  let parsed: unknown = {}
  try {
    parsed = JSON.parse(storeJson || EMPTY)
  } catch {
    parsed = {}
  }

  const { error } = await sb.from('user_stores').upsert({
    user_id: userId,
    data: parsed,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.warn('[cloudStore] push failed', error.message)
    return false
  }
  return true
}

export async function fetchCloudProfile(userId: string): Promise<CloudProfile | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return data as CloudProfile
}

export async function updateCloudProfile(
  userId: string,
  patch: Partial<
    Pick<
      CloudProfile,
      | 'name'
      | 'has_subscription'
      | 'life_map_offer_status'
      | 'training_phase'
    >
  >,
): Promise<CloudProfile | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()
  if (error) {
    console.warn('[cloudStore] profile update failed', error.message)
    return null
  }
  return data as CloudProfile
}

/**
 * Миграция: если в облаке пусто, а локально есть данные старого аккаунта —
 * заливаем их в облако один раз.
 */
export async function migrateLocalStoreIfNeeded(
  cloudUserId: string,
  legacyUserIds: string[] = [],
): Promise<void> {
  const remote = await fetchCloudStore(cloudUserId)
  if (remote) return

  const candidates = [cloudUserId, ...legacyUserIds]
  for (const id of candidates) {
    try {
      const raw = localStorage.getItem(localStoreKey(id))
      if (!raw || raw === EMPTY) continue
      const parsed = JSON.parse(raw) as { habits?: unknown[] }
      if (!parsed?.habits?.length && !('diamonds' in parsed)) continue
      await pushCloudStore(cloudUserId, raw)
      return
    } catch {
      /* next */
    }
  }
}
