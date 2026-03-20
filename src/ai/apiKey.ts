const STORAGE_KEY = 'cardstudio-anthropic-key';

export function getApiKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
