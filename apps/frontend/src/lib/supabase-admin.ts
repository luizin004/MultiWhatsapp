import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL nao configurada.')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor.')

  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}
