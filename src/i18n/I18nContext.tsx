import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { catalogFor, t, type MessageKey, type UiCatalog } from './catalog.ts';
import {
  applyDocumentLang, resolveInitialLocale, writeStoredLocale, type Locale
} from './locale.ts';
import { researchTranslationManifest, researchTranslationsCurrent } from './research.ts';
import type { Workspace } from '../types.ts';

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  catalog: UiCatalog;
  hashMatches: boolean;
  translationVersion: string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ model, children }: { model: Workspace; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());
  const [hashMatches, setHashMatches] = useState(true);

  useEffect(() => {
    applyDocumentLang(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    void researchTranslationsCurrent(model).then(ok => {
      if (!cancelled) setHashMatches(ok);
    });
    return () => { cancelled = true; };
  }, [model]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    writeStoredLocale(next);
    applyDocumentLang(next);
  }

  const value: I18nValue = {
    locale,
    setLocale,
    t: (key, vars) => t(locale, key, vars),
    catalog: catalogFor(locale),
    hashMatches,
    translationVersion: researchTranslationManifest().resourceVersion
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n requires I18nProvider');
  return value;
}

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return <fieldset className="language-selector">
    <legend className="sr-only">{t('brand.language')}</legend>
    <div role="group" aria-label={t('brand.language')} className="language-toggle">
      <button type="button" aria-pressed={locale === 'fi'} className={locale === 'fi' ? 'active' : ''} onClick={() => setLocale('fi')}>{t('brand.languageFi')}</button>
      <button type="button" aria-pressed={locale === 'en'} className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>{t('brand.languageEn')}</button>
    </div>
  </fieldset>;
}
