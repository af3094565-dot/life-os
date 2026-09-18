import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isCloudEnabled(): boolean {
  return Boolean(url && anon)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isCloudEnabled()) return null
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'life-os-supabase-auth',
      },
    })
  }
  return client
}

export type CloudProfile = {
  id: string
  email: string | null
  name: string
  telegram_id: number | null
  telegram_username: string | null
  has_subscription: boolean
  life_map_offer_status: 'pending' | 'accepted' | 'deferred' | 'done'
  training_phase:
    | 'offer'
    | 'free_tour'
    | 'wheel_offer'
    | 'pro_offer'
    | 'pro_tour'
    | 'completed'
    | 'skipped'
  created_at: string
}
