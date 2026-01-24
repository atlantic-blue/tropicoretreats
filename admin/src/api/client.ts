const API_BASE = import.meta.env.VITE_API_ENDPOINT;

// Singleton for token getter (set by App.tsx)
let getTokenFn: (() => Promise<string>) | null = null;

export function setTokenGetter(fn: () => Promise<string>) {
  getTokenFn = fn;
}

export async function fetchWithAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!getTokenFn) {
    throw new Error('Token getter not initialized');
  }

  const token = await getTokenFn();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}
