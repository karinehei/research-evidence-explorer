import { allIds, relationshipDraft } from './model.ts';
import { failCoded } from './model-errors.ts';
import { meaningLabel } from './labels.ts';
import type { Meaning, Workspace } from './types.ts';

const meanings = ['motivates', 'operationalises', 'complements', 'questions', 'proposes'] as const;

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function newId(model: Workspace, prefix: string): string {
  const taken = new Set<string>(allIds(model));
  let id = '';
  do id = `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  while (taken.has(id));
  return id;
}

export function requireConnection(fields: {
  id: string; meaning: string; source: string; target: string; rationale?: string; locator?: string;
  epistemicStatus?: string; reviewState?: string; claimIds?: string[]; sourceIds?: string[];
}) {
  if (!meanings.includes(fields.meaning as Meaning)) {
    failCoded('pickLinkMeaning', {}, 'Valitse yhteyden merkitys. Nuolelle ei anneta kausaalista oletusmerkitystä.');
  }
  if (!fields.target || fields.target === fields.source) failCoded('pickOtherEndpoint', {}, 'Valitse toinen päätepiste.');
  return relationshipDraft({
    id: fields.id,
    meaning: fields.meaning,
    source: fields.source,
    target: fields.target,
    label: meaningLabel[fields.meaning as Meaning],
    rationale: fields.rationale || '',
    locator: fields.locator || '',
    claimIds: fields.claimIds || [],
    sourceIds: fields.sourceIds || [],
    epistemicStatus: fields.epistemicStatus || 'adaptation',
    reviewState: fields.reviewState === 'reviewed' ? 'reviewed' : 'proposed'
  });
}

export function contentKey(value: unknown): string {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.position;
  return JSON.stringify(copy);
}
