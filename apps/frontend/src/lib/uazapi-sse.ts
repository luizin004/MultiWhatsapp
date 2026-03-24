export interface UazapiMessage {
  id?: string
  messageid?: string
  chatid?: string
  from?: string
  to?: string
  sender?: string
  sender_pn?: string
  senderName?: string
  text?: string
  content?: string
  type?: string
  messageType?: string
  mediaType?: string
  wasSentByApi: boolean
  timestamp?: number
  // message_update fields
  status?: string        // sent / delivered / read / deleted
  reaction?: string      // emoji reaction
  edited?: string        // edited message text
  // presence fields
  presence?: string      // composing / recording / paused
  // connection fields
  state?: string         // connected / disconnected
}

export interface UazapiEvent {
  type: 'message' | 'message_update' | 'connection' | 'presence' | 'labels' | 'call' | 'unknown'
  data?: UazapiMessage | null
  raw: unknown
}

// Maps raw event type strings from the UAZAPI SSE stream to our normalized types.
const EVENT_TYPE_MAP: Record<string, UazapiEvent['type']> = {
  messages: 'message',
  message: 'message',
  messages_update: 'message_update',
  message_update: 'message_update',
  connection: 'connection',
  presence: 'presence',
  labels: 'labels',
  call: 'call',
}

function normalizeEventType(raw: Record<string, unknown>): UazapiEvent['type'] {
  const candidates = [
    raw.type as string | undefined,
    raw.EventType as string | undefined,
    raw.event as string | undefined,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const mapped = EVENT_TYPE_MAP[candidate.toLowerCase()]
    if (mapped) return mapped
  }

  return 'unknown'
}

export class UazapiSSE {
  private eventSource: EventSource | null = null
  private token: string
  private baseUrl: string

  constructor(token: string, baseUrl: string) {
    this.token = token
    this.baseUrl = baseUrl
  }

  connect(onMessage: (event: UazapiEvent) => void, onError?: (error: Event) => void) {
    const url = `${this.baseUrl}/sse?token=${this.token}&events=messages,messages_update,connection,presence,labels,call`

    console.log('SSE URL completa:', url)

    this.eventSource = new EventSource(url)

    this.eventSource.onopen = () => {
      console.log('SSE conectado com UAZAPI')
    }

    this.eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data) as Record<string, unknown>

        const type = normalizeEventType(raw)
        const data = (raw.data ?? raw.message ?? null) as UazapiMessage | null

        const normalizedEvent: UazapiEvent = { type, data, raw }

        console.log('Evento SSE recebido:', raw)

        if (type === 'message') {
          console.log('Mensagem detectada:', data)
        } else {
          console.log('Evento SSE tipo:', type, raw)
        }

        onMessage(normalizedEvent)
      } catch (error) {
        console.error('Erro ao parsear evento SSE:', error)
        console.log('Raw event data:', event.data)
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error)
      if (onError) onError(error)
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}
