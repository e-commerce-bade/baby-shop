const DEFAULT_BACKEND_BASE_URL = 'http://localhost:5050'

export function getBackendBaseUrl() {
  return (
    process.env.BACKEND_BASE_URL ??
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ??
    DEFAULT_BACKEND_BASE_URL
  ).replace(/\/$/, '')
}

export function buildBackendUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getBackendBaseUrl()}${normalizedPath}`
}

export async function backendFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildBackendUrl(path), {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}
