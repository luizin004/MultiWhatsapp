const UAZAPI_BASE_URL = process.env.NEXT_PUBLIC_UAZAPI_BASE_URL

interface SendTextParams {
  token: string
  number: string
  text: string
  linkPreview?: boolean
}

interface SendMediaParams {
  token: string
  number: string
  type: 'image' | 'video' | 'document'
  file: string
  text?: string
  docName?: string
  mimeType?: string
}

export async function sendTextMessage({ token, number, text, linkPreview = true }: SendTextParams) {
  if (!UAZAPI_BASE_URL) {
    throw new Error('URL da UAZAPI não configurada. Defina NEXT_PUBLIC_UAZAPI_BASE_URL no .env.local.')
  }

  const payload = {
    number,
    text,
    linkPreview
  }

  const response = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message || 'Falha ao enviar mensagem via UAZAPI.'
    throw new Error(message)
  }

  return data
}

export async function sendMediaMessage({ token, number, type, file, text, docName, mimeType }: SendMediaParams) {
  if (!UAZAPI_BASE_URL) {
    throw new Error('URL da UAZAPI não configurada. Defina NEXT_PUBLIC_UAZAPI_BASE_URL no .env.local.')
  }

  const payload: Record<string, unknown> = {
    number,
    type,
    file
  }

  if (text) payload.text = text
  if (docName && type === 'document') payload.docName = docName
  if (mimeType) payload.mimetype = mimeType

  const response = await fetch(`${UAZAPI_BASE_URL}/send/media`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message || 'Falha ao enviar mídia via UAZAPI.'
    throw new Error(message)
  }

  return data
}
