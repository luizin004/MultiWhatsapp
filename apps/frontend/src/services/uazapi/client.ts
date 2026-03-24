const UAZAPI_BASE_URL = process.env.NEXT_PUBLIC_UAZAPI_BASE_URL

export class UazapiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'UazapiError'
  }
}

export async function uazapiFetch<T>(
  path: string,
  token: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  if (!UAZAPI_BASE_URL) {
    throw new UazapiError(
      'UAZAPI base URL not configured. Set NEXT_PUBLIC_UAZAPI_BASE_URL in .env.local.',
      0
    )
  }

  const method = options?.method ?? (options?.body !== undefined ? 'POST' : 'GET')

  const response = await fetch(`${UAZAPI_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token,
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = data?.message ?? `UAZAPI request failed: ${method} ${path}`
    throw new UazapiError(message, response.status)
  }

  return data as T
}
