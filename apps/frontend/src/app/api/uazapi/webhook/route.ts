import { NextRequest, NextResponse } from 'next/server'

const uazapiBaseUrl = process.env.UAZAPI_BASE_URL || process.env.NEXT_PUBLIC_UAZAPI_BASE_URL
const edgeWebhookUrl = process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const instanceToken = body.instanceToken as string | undefined
    const events: string[] = Array.isArray(body.events) && body.events.length > 0 ? body.events : ['messages', 'connection']
    const excludeMessages: string[] = Array.isArray(body.excludeMessages) && body.excludeMessages.length > 0 ? body.excludeMessages : ['wasSentByApi']

    if (!instanceToken) {
      return NextResponse.json({ error: 'instanceToken é obrigatório' }, { status: 400 })
    }

    if (!uazapiBaseUrl) {
      return NextResponse.json({ error: 'URL da UAZAPI não configurada' }, { status: 500 })
    }

    if (!edgeWebhookUrl) {
      return NextResponse.json({ error: 'URL da Edge Function não configurada' }, { status: 500 })
    }

    const payload = {
      action: 'add',
      enabled: body.enabled ?? true,
      url: `${edgeWebhookUrl}?instance_token=${encodeURIComponent(instanceToken)}`,
      events,
      excludeMessages,
      addUrlEvents: body.addUrlEvents ?? false,
      addUrlTypesMessages: body.addUrlTypesMessages ?? false
    }

    const response = await fetch(`${uazapiBaseUrl}/webhook`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instanceToken
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.message || 'Falha ao registrar webhook automaticamente.',
          details: data
        },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao registrar webhook.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
