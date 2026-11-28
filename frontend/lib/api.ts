export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export type ApiEnvelope<T> = { data: T; pagination?: { page: number; pageSize: number; total: number; totalPages: number } };

export type SessionUser = { id: string; name: string; email: string };
export type SessionOrganization = { id: string; name: string; slug: string; role?: string };
export type Session = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  organization: SessionOrganization;
};

const SESSION_KEY = "worksphere-session";

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("worksphere-session-change"));
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("worksphere-session-change"));
}

async function refreshAccessToken(): Promise<string | null> {
  const session = readSession();
  if (!session?.refreshToken) return null;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      clearSession();
      return null;
    }
    const payload = await response.json();
    const data = payload.data;
    saveSession({
      ...session,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.accessToken as string;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (authenticated && session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  let response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (response.status === 401 && authenticated && session?.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? body?.message ?? message;
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function dataOf<T>(payload: ApiEnvelope<T> | { data: T }): T {
  return payload.data;
}
