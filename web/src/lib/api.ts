const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getTokens() {
  const raw = localStorage.getItem('rated.tokens');
  return raw ? (JSON.parse(raw) as { access_token: string; refresh_token: string }) : null;
}

export function setTokens(tokens: { access_token: string; refresh_token: string } | null) {
  if (tokens) localStorage.setItem('rated.tokens', JSON.stringify(tokens));
  else localStorage.removeItem('rated.tokens');
}

async function refreshTokens(): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens) return false;
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) {
    setTokens(null);
    return false;
  }
  const data = await res.json();
  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
  return true;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query } = options;
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const doFetch = async () => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const tokens = getTokens();
    if (auth && tokens) headers.Authorization = `Bearer ${tokens.access_token}`;
    return fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();
  if (res.status === 401 && auth) {
    const refreshed = await refreshTokens();
    if (refreshed) res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code ?? 'unknown_error', data?.message ?? res.statusText, data?.details);
  }
  return data as T;
}
