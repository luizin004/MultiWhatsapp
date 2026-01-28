import { NextRequest, NextResponse } from 'next/server'

type ConnectionMode = 'paircode' | 'qrcode'

const uazapiBaseUrl = process.env.UAZAPI_BASE_URL || process.env.NEXT_PUBLIC_UAZAPI_BASE_URL
const adminToken = process.env.UAZAPI_ADMIN_TOKEN || process.env.NEXT_PUBLIC_UAZAPI_ADMIN_TOKEN

const sanitize = (value?: string | null) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const normalizePhone = (phone?: string) => {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  return digits.length ? digits : undefined
}

const pickNestedString = (source: unknown, paths: string[][]) => {
  for (const path of paths) {
    let current: any = source
    let failed = false
    for (const segment of path) {
      if (current && typeof current === 'object' && segment in current) {
        current = current[segment]
      } else {
        failed = true
        break
      }
    }
    if (!failed && typeof current === 'string' && current.trim()) {
      return current.trim()
    }
  }
  return undefined
}

const buildInitPayload = (body: Record<string, unknown>) => {
  const payload: Record<string, string> = {
    name: String(body.name),
    systemName: sanitize(body.systemName as string) || 'uazapiGO'
  }

  const optionalKeys: Array<keyof typeof body> = ['adminField01', 'adminField02', 'fingerprintProfile', 'browser']

  optionalKeys.forEach((key) => {
    const value = sanitize(body[key] as string)
    if (value) {
      payload[key] = value
    }
  })

  if (!payload.fingerprintProfile) {
    payload.fingerprintProfile = 'chrome'
  }

  if (!payload.browser) {
    payload.browser = 'chrome'
  }

  return payload
}

export async function POST(req: NextRequest) {
  try {
    if (!uazapiBaseUrl) {
      return NextResponse.json({ error: 'URL da UAZAPI não configurada.' }, { status: 500 })
    }

    if (!adminToken) {
      return NextResponse.json({ error: 'Token administrativo da UAZAPI não configurado.' }, { status: 500 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null

    if (!body || !sanitize(body.name as string)) {
      return NextResponse.json({ error: 'Informe o nome da instância.' }, { status: 400 })
    }

    const connectionMode: ConnectionMode = body.connectionMode === 'qrcode' ? 'qrcode' : 'paircode'
    const normalizedPhone = normalizePhone(body.phone as string)

    if (connectionMode === 'paircode' && !normalizedPhone) {
      return NextResponse.json({ error: 'Informe o número em formato internacional para gerar o código de pareamento.' }, { status: 400 })
    }

    const initPayload = buildInitPayload(body)

    const initResponse = await fetch(`${uazapiBaseUrl}/instance/init`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        admintoken: adminToken
      },
      body: JSON.stringify(initPayload)
    })

    const initData = await initResponse.json().catch(() => null)

    if (!initResponse.ok) {
      const message = initData?.response || initData?.error || 'Falha ao criar a instância na UAZAPI.'
      return NextResponse.json({ error: message, details: initData }, { status: initResponse.status })
    }

    const instanceToken = sanitize(initData?.token) || sanitize(initData?.instance?.token)

    if (!instanceToken) {
      return NextResponse.json({ error: 'Instância criada, mas o token não foi retornado pela UAZAPI.' }, { status: 502 })
    }

    const connectResponse = await fetch(`${uazapiBaseUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token: instanceToken
      },
      body: JSON.stringify(connectionMode === 'paircode' ? { phone: normalizedPhone } : {})
    })

    const connectData = await connectResponse.json().catch(() => null)

    if (!connectResponse.ok) {
      const message = connectData?.response || connectData?.error || 'Instância criada, porém falhou ao iniciar conexão.'
      return NextResponse.json(
        { error: message, details: { init: initData, connect: connectData } },
        { status: connectResponse.status }
      )
    }

    const paircode =
      pickNestedString(connectData, [
        ['paircode'],
        ['pairCode'],
        ['pair_code'],
        ['status', 'paircode'],
        ['status', 'pairCode'],
        ['instance', 'paircode'],
        ['instance', 'pairCode']
      ]) || undefined

    const qrcode =
      pickNestedString(connectData, [
        ['qrcode'],
        ['qrCode'],
        ['qr_code'],
        ['status', 'qrcode'],
        ['status', 'qrCode'],
        ['instance', 'qrcode'],
        ['instance', 'qrCode']
      ]) || undefined

    const statusMessage =
      pickNestedString(connectData, [['response'], ['message'], ['status', 'state'], ['instance', 'status'], ['status', 'status']]) ||
      (connectData?.status && typeof connectData.status === 'object' ? JSON.stringify(connectData.status) : undefined)

    return NextResponse.json({
      success: true,
      instanceToken,
      instanceName: initData?.instance?.name || initPayload.name,
      connectionMode,
      connection: {
        status: statusMessage,
        paircode,
        qrcode,
        raw: connectData
      },
      init: {
        instanceId: initData?.instance?.id,
        status: initData?.instance?.status,
        raw: initData
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao criar a instância.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
