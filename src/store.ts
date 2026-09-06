import { OverlayState, DEFAULT_STATE } from './types';

const STORAGE_KEY = 'kentroid_overlay_state';

export function loadState(): OverlayState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OverlayState>;
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load overlay state:', e);
  }
  return { ...DEFAULT_STATE };
}

export function saveState(state: OverlayState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save overlay state:', e);
  }
}

export function exportState(state: OverlayState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): OverlayState | null {
  try {
    const parsed = JSON.parse(json) as Partial<OverlayState>;
    if (parsed.panels && Array.isArray(parsed.panels)) {
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to import state:', e);
  }
  return null;
}
