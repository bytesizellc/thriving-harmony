const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getDevEmail(): string {
  if (typeof window === 'undefined') return 'doc@thrivingharmony.example';
  return localStorage.getItem('harmony-dev-user') ?? 'doc@thrivingharmony.example';
}

export function setDevEmail(email: string): void {
  localStorage.setItem('harmony-dev-user', email);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-dev-user': getDevEmail(),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json()) as { data?: T; error?: { code: string; message: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}
