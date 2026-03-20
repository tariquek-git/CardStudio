// ─── Analytics Event Bus ──────────────────────────────────
// Zero-dependency, privacy-respecting event tracking.
// Use subscribe() to wire in PostHog, Segment, or custom backend later.

export type AnalyticsEvent =
  | { type: 'page_view'; view: 'dashboard' | 'editor' | 'program-editor' }
  | { type: 'design_create'; designId: string; name: string }
  | { type: 'design_save'; designId: string }
  | { type: 'design_load'; designId: string }
  | { type: 'design_delete'; designId: string }
  | { type: 'design_duplicate'; designId: string }
  | { type: 'template_apply'; templateId: string }
  | { type: 'export_trigger'; format: string }
  | { type: 'config_change'; field: string }
  | { type: 'theme_toggle'; dark: boolean }
  | { type: 'hub_navigate' }
  | { type: 'program_create'; programId: string; name: string }
  | { type: 'program_delete'; programId: string }
  | { type: 'program_duplicate'; programId: string }
  | { type: 'program_update'; programId: string }
  | { type: 'tier_add'; programId: string }
  | { type: 'tier_remove'; programId: string };

type TimestampedEvent = AnalyticsEvent & { timestamp: number };
type Handler = (event: TimestampedEvent) => void;

const MAX_HISTORY = 200;
const listeners = new Set<Handler>();
const history: TimestampedEvent[] = [];

// Debounce config_change per field (2s window)
const recentFields = new Map<string, number>();
const DEBOUNCE_MS = 2000;

export function track(event: AnalyticsEvent): void {
  try {
    // Debounce config_change events per field
    if (event.type === 'config_change') {
      const now = Date.now();
      const last = recentFields.get(event.field);
      if (last && now - last < DEBOUNCE_MS) return;
      recentFields.set(event.field, now);
    }

    const stamped: TimestampedEvent = { ...event, timestamp: Date.now() };

    // Ring buffer
    history.push(stamped);
    if (history.length > MAX_HISTORY) history.shift();

    // Notify listeners (non-blocking)
    for (const handler of listeners) {
      try { handler(stamped); } catch { /* silent */ }
    }
  } catch {
    // Analytics must never break the app
  }
}

export function subscribe(handler: Handler): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function getHistory(): readonly TimestampedEvent[] {
  return history;
}
