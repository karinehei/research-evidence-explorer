import { figureBrowserSvg } from './figures.ts';
import type { Locale } from './i18n/locale.ts';
import { t } from './i18n/catalog.ts';
import type { Workspace } from './types.ts';

/** Quick browser-layout SVG for the current visible selection. Prefer buildFigureBundle for reproducible manuscript exports with manifest. */
export function graphSvg(
  model: Workspace,
  ids: Set<string>,
  selectedId = '',
  locale: Locale = 'fi',
  options: { resolveLabel?: (id: string, fallback: string) => string; hashMatches?: boolean } = {}
): string {
  return figureBrowserSvg(model, ids, {
    selectedId,
    locale,
    resolveLabel: options.resolveLabel,
    hashMatches: options.hashMatches,
    title: t(locale, 'figure.quickTitle'),
    caption: t(locale, 'figure.quickCaption')
  });
}
