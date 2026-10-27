import { isModelError } from '../model-errors.ts';
import { t, type MessageKey } from './catalog.ts';
import type { Locale } from './locale.ts';

/** Finnish field labels from validate() → English display names. */
const FIELD_EN: Record<string, string> = {
  'Projektin nimi': 'Project name',
  'Projektin kuvaus': 'Project description',
  'Lähteen nimi': 'Source name',
  Viite: 'Citation',
  Vuosi: 'Year',
  Versio: 'Version',
  DOI: 'DOI',
  URL: 'URL',
  Lukemistiedon: 'Access note',
  'Lukemistiedon tarkenne': 'Access note',
  Muistiinpanot: 'Notes',
  'Seuraava tarkistus': 'Next check',
  'Lähteen rooli': 'Source role',
  'Julkaisun tila': 'Publication status',
  Lukemistieto: 'Access',
  Lähde: 'Source',
  Lähdeväite: 'Source claim',
  Väite: 'Claim statement',
  'Menetelmä ja konteksti': 'Method and context',
  Lähdekohta: 'Locator',
  Rajaus: 'Boundary',
  Perusta: 'Basis',
  'Väitteen alkuperä': 'Claim provenance',
  Arviointi: 'Appraisal',
  'Tiedollinen tila': 'Epistemic status',
  'Arvioinnin tila': 'Review state',
  Käsite: 'Construct',
  'Käsitteen nimi': 'Construct name',
  Määritelmä: 'Definition',
  Kohde: 'Object',
  Yksikkö: 'Unit',
  Ala: 'Scope',
  'Kilpailevat määritelmät': 'Competing definitions',
  Kriteeri: 'Criterion',
  'Kriteerin nimi': 'Criterion name',
  Käsiteviite: 'Construct reference',
  Näyttövaatimus: 'Evidence requirement',
  Arvioija: 'Assessor',
  Päätössääntö: 'Decision rule',
  'Sallittu päättely': 'Permitted inference',
  Validointitarve: 'Validation need',
  Propositio: 'Proposition',
  'Proposition nimi': 'Proposition name',
  Kriteeriviite: 'Criterion reference',
  Yhteys: 'Relationship',
  'Yhteyden merkitys': 'Link meaning',
  'Yhteyden nimi': 'Link label',
  Perustelu: 'Rationale',
  'Arvioinnin muistiinpano': 'Review note',
  Väiteviite: 'Claim reference',
  Lähdeviite: 'Source reference',
  Työtila: 'Workspace',
  Projekti: 'Project',
  Solu: 'Cell',
  Sarake: 'Column',
  Sijainti: 'Position',
  Menettely: 'Procedure'
};

/** Exact Finnish Error.message → stable code for obscure unmigrated fails. */
const FI_MESSAGE_FALLBACK: Record<string, { code: string; params?: Record<string, string | number> }> = {
  'Tuettu schemaVersion on 1.': { code: 'schemaVersionUnsupported', params: { version: 1 } },
  'Projektin tiedot puuttuvat.': { code: 'invalidRecord', params: { field: 'Projekti' } },
  'Virheellinen sijainti.': { code: 'invalidPosition', params: { field: 'Sijainti' } }
};

export type RemovalEffectLike = {
  id: string;
  label?: string;
  reason: string;
  code?: string;
  kind?: string;
};

function localiseParams(locale: Locale, params: Record<string, string | number>): Record<string, string | number> {
  if (locale === 'fi') return params;
  const next: Record<string, string | number> = { ...params };
  if (typeof next.field === 'string' && FIELD_EN[next.field]) next.field = FIELD_EN[next.field];
  if (typeof next.what === 'string') {
    const whatEn: Record<string, string> = {
      lähteeseen: 'a source',
      protokolla: 'a protocol'
    };
    if (whatEn[next.what]) next.what = whatEn[next.what];
  }
  return next;
}

function lookupError(locale: Locale, code: string, params: Record<string, string | number> = {}): string | undefined {
  const key = `errors.${code}` as MessageKey;
  const template = t(locale, key, localiseParams(locale, params));
  if (template === key || template === `errors.${code}`) return undefined;
  return template;
}

export function formatUserError(locale: Locale, error: unknown): string {
  if (isModelError(error)) {
    return lookupError(locale, error.code, error.params) || error.message;
  }
  if (error && typeof error === 'object' && 'code' in error && typeof (error as RemovalEffectLike).code === 'string'
    && 'reason' in error) {
    return formatRemovalEffect(locale, error as RemovalEffectLike);
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (message) {
    const mapped = FI_MESSAGE_FALLBACK[message];
    if (mapped) {
      const formatted = lookupError(locale, mapped.code, mapped.params || {});
      if (formatted) return formatted;
    }
    return message;
  }
  return lookupError(locale, 'unknown') || 'Error';
}

export function formatRemovalEffect(locale: Locale, effect: RemovalEffectLike): string {
  if (effect.code) {
    const key = effect.code as MessageKey;
    const formatted = t(locale, key);
    if (formatted !== key && formatted !== effect.code) return formatted;
  }
  return effect.reason;
}
