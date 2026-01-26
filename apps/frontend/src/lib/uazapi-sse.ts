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
}

export interface UazapiEvent {
  type: string
  data?: UazapiMessage | null
  raw: unknown
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
    const url = `${this.baseUrl}/sse?token=${this.token}&events=messages,chats,history`
    
    console.log('SSE URL completa:', url)
    
    this.eventSource = new EventSource(url)

    this.eventSource.onopen = () => {
      console.log('SSE conectado com UAZAPI')
    }

    this.eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data)

        const normalizedType = (() => {
          if (raw.type) return raw.type
          if (raw.EventType) {
            return raw.EventType === 'messages' ? 'message' : raw.EventType
          }
          if (raw.event) return raw.event
          return 'unknown'
        })()

        const normalizedData = raw.data || raw.message || null

        const normalizedEvent: UazapiEvent = {
          type: normalizedType,
          data: normalizedData,
          raw
        }

        console.log('Evento SSE recebido:', raw)

        if (normalizedEvent.type === 'message') {
          console.log('Mensagem detectada:', normalizedEvent.data)
        } else {
          console.log('Outro tipo de evento:', normalizedEvent.type, raw)
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
