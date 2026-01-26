import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.')
}

export async function POST() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/metrics-daily`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = typeof payload?.error === 'string' ? payload.error : 'Falha ao reprocessar métricas.'
      throw new Error(message)
    }

    return NextResponse.json({ success: true, details: payload })
  } catch (error) {
    console.error('Erro ao acionar recomputo das métricas:', error)
    const message = error instanceof Error ? error.message : 'Falha ao recomputar métricas.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
