import type { Locale } from './locale.ts';

/**
 * Display-only short citation: replaces Finnish "ym." / "ym" with "et al." for EN.
 * Never mutates the stored label; does not change graph node IDs.
 */
export function formatShortCitation(locale: Locale, label: string): string {
  if (locale !== 'en' || !label) return label;
  return label
    .replace(/\sym\.(?=[\s.,;:]|$)/g, ' et al.')
    .replace(/\sym(?=[\s.,;:]|$)/g, ' et al.');
}
