import { apiFetch, setAccessToken } from './client';

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  orgId: string | null;
  onboarded: boolean;
  createdAt: string;
}

export async function apiRegister(email: string, password: string, name?: string): Promise<{ user: ApiUser; token: string }> {
  const data = await apiFetch<{ user: ApiUser; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setAccessToken(data.token);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<{ user: ApiUser; token: string }> {
  const data = await apiFetch<{ user: ApiUser; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.token);
  return data;
}

export async function apiRefreshToken(): Promise<{ token: string } | null> {
  try {
    const data = await apiFetch<{ token: string }>('/auth/refresh', { method: 'POST' });
    setAccessToken(data.token);
    return data;
  } catch {
    return null;
  }
}

export async function apiGetMe(): Promise<ApiUser> {
  const data = await apiFetch<{ user: ApiUser }>('/auth/me');
  return data.user;
}

export async function apiLogout(): Promise<void> {
  setAccessToken(null);
}
