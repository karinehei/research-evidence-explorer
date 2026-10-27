import { locate } from './model.ts';
import { labelsFor, traceLimitation } from './labels.ts';
import type { Locale } from './i18n/locale.ts';
import { t } from './i18n/catalog.ts';
import type { Workspace } from './types.ts';

export { traceLimitation };

export function formatTrace(
  model: Workspace,
  result: { nodes: string[]; edges: string[] } | null,
  locale: Locale = 'fi'
): string {
  if (!result) return t(locale, 'graphExtra.traceMissing');
  const L = labelsFor(locale);
  const name = (id: string) => locate(model, id)?.record.label || id;
  let text = name(result.nodes[0]);
  result.edges.forEach((edgeId, index) => {
    const edge = model.relationships.find(item => item.id === edgeId);
    const meaning = edge ? ((edge.label || '').trim() || L.meaningLabel[edge.meaning]) : t(locale, 'graphExtra.traceLinkFallback');
    text += ` —[${meaning}]→ ${name(result.nodes[index + 1])}`;
  });
  return text;
}
