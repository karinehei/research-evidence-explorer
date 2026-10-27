import researchEn from '../../data/i18n/research-en.json' with { type: 'json' };
import researchManifest from '../../data/i18n/research-manifest.json' with { type: 'json' };
import { contentHash } from '../snapshots.ts';
import type { Workspace } from '../types.ts';
import type { Locale } from './locale.ts';
import { t } from './catalog.ts';

export type ResearchFieldMap = Record<string, string>;
export type ResearchBundle = {
  constructs?: Record<string, ResearchFieldMap>;
  criteria?: Record<string, ResearchFieldMap>;
  propositions?: Record<string, ResearchFieldMap>;
  protocols?: Record<string, ResearchFieldMap>;
  decisions?: Record<string, ResearchFieldMap>;
  cases?: Record<string, ResearchFieldMap>;
  relationships?: Record<string, ResearchFieldMap>;
  claims?: Record<string, ResearchFieldMap>;
};

export type DisplayText = {
  text: string;
  source: 'original' | 'translation' | 'fallback-original';
  notice: string;
};

const bundle = researchEn as ResearchBundle;
const manifest = researchManifest as {
  locale: 'en';
  resourceVersion: string;
  sourceContentHash: string;
  reviewedAt: string;
};

export function researchTranslationManifest() {
  return manifest;
}

export async function researchTranslationsCurrent(model: Workspace): Promise<boolean> {
  return (await contentHash(model)) === manifest.sourceContentHash;
}

function collectionFor(kind: keyof ResearchBundle): Record<string, ResearchFieldMap> {
  return bundle[kind] || {};
}

export function translateResearchField(
  locale: Locale,
  kind: keyof ResearchBundle,
  id: string,
  field: string,
  original: string,
  options: { hashMatches: boolean } = { hashMatches: true }
): DisplayText {
  if (!original) return { text: '', source: 'original', notice: '' };
  if (locale === 'fi') return { text: original, source: 'original', notice: '' };
  const translated = collectionFor(kind)[id]?.[field];
  if (!translated) {
    return {
      text: original,
      source: 'fallback-original',
      notice: t('en', 'research.missingTranslationFi')
    };
  }
  if (!options.hashMatches) {
    return {
      text: translated,
      source: 'translation',
      notice: t('en', 'research.needsReview')
    };
  }
  return { text: translated, source: 'translation', notice: '' };
}

/** Nested or top-level case field lookup; never mutates the workspace. */
export function caseField(
  locale: Locale,
  caseId: string,
  field: string,
  original: string,
  hashMatches: boolean
): DisplayText {
  return translateResearchField(locale, 'cases', caseId, field, original, { hashMatches });
}

/** Prefer English display label for graph/matrix when available; never mutates the workspace. */
export function displayRecordLabel(
  locale: Locale,
  model: Workspace,
  id: string,
  hashMatches: boolean
): string {
  const hit = [
    ['constructs', model.constructs] as const,
    ['criteria', model.criteria] as const,
    ['propositions', model.propositions] as const,
    ['protocols', model.protocols] as const,
    ['decisions', model.decisions] as const,
    ['cases', model.cases] as const,
    ['claims', model.claims] as const,
    ['sources', model.sources] as const
  ];
  for (const [kind, list] of hit) {
    const record = list.find(item => item.id === id) as { label?: string; title?: string; statement?: string } | undefined;
    if (!record) continue;
    if (kind === 'sources') return record.label || id;
    if (kind === 'cases') {
      return translateResearchField(locale, 'cases', id, 'title', record.title || id, { hashMatches }).text;
    }
    if (kind === 'claims') {
      return translateResearchField(locale, 'claims', id, 'statement', record.statement || id, { hashMatches }).text;
    }
    const field = 'label';
    const original = record.label || id;
    return translateResearchField(locale, kind as keyof ResearchBundle, id, field, original, { hashMatches }).text;
  }
  const edge = model.relationships.find(item => item.id === id);
  if (edge) {
    return translateResearchField(locale, 'relationships', id, 'label', edge.label || id, { hashMatches }).text;
  }
  return id;
}
