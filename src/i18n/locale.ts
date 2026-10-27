export type Locale = 'fi' | 'en';

export const LOCALE_STORAGE_KEY = 'research-evidence-explorer-locale-v1';
export const TRANSLATION_RESOURCE_VERSION = '1.0.0';

export function isLocale(value: unknown): value is Locale {
  return value === 'fi' || value === 'en';
}

type BrowserGlobals = {
  navigator?: { languages?: readonly string[]; language?: string };
  localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  document?: { documentElement: { lang: string } };
};

function browser(): BrowserGlobals {
  return globalThis as BrowserGlobals;
}

/** Prefer Finnish or English from the browser; otherwise Finnish. */
export function detectBrowserLocale(languages?: readonly string[]): Locale {
  const nav = browser().navigator;
  const list = languages || (nav ? (nav.languages || [nav.language || 'fi']) : ['fi']);
  for (const entry of list) {
    const code = String(entry || '').toLowerCase();
    if (code === 'fi' || code.startsWith('fi-')) return 'fi';
    if (code === 'en' || code.startsWith('en-')) return 'en';
  }
  return 'fi';
}

export function readStoredLocale(): Locale | null {
  try {
    const raw = browser().localStorage?.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    browser().localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* preference only */
  }
}

export function resolveInitialLocale(): Locale {
  return readStoredLocale() || detectBrowserLocale();
}

export function applyDocumentLang(locale: Locale): void {
  const doc = browser().document;
  if (!doc) return;
  doc.documentElement.lang = locale;
}
