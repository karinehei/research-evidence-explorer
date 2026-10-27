import type { Edge, Node } from '@xyflow/react';
import { locate } from './model.ts';
import type { Locale } from './i18n/locale.ts';
import { labelsFor } from './labels.ts';
import type { EpistemicStatus, Position, Workspace } from './types.ts';

export type FlowDisplay = {
  locale: Locale;
  resolveLabel: (id: string, fallback: string) => string;
};

export interface RecordData extends Record<string, unknown> {
  kind: 'source' | 'claim' | 'construct' | 'criterion' | 'proposition';
  label: string;
  badge: string;
  dim?: boolean;
}
export interface LinkData extends Record<string, unknown> {
  text: string;
  pattern: 'solid' | 'dashed' | 'dotted' | 'membership';
  color: string;
  aria: string;
}
export type RecordNode = Node<RecordData, 'record'>;
export type LinkEdge = Edge<LinkData, 'epistemic'>;

const column: Record<RecordData['kind'], number> = { source: 0, claim: 1, construct: 2, criterion: 3, proposition: 4 };
const epistemicColor: Record<EpistemicStatus, string> = { reported: '#315cd7', adaptation: '#2f6f4f', hypothesis: '#6b4c9a' };

export function justificationIds(model: Workspace, id: string): Set<string> {
  const found = locate(model, id);
  const start = found?.kind === 'claim' ? found.record.sourceId : id;
  const ids = new Set<string>([start]);
  for (const backwards of [true, false]) {
    const queue = [start];
    const seen = new Set<string>([start]);
    for (let index = 0; index < queue.length; index++) {
      for (const edge of model.relationships) {
        const from = backwards ? edge.target : edge.source;
        const to = backwards ? edge.source : edge.target;
        if (from === queue[index] && !seen.has(to)) { seen.add(to); ids.add(to); queue.push(to); }
      }
    }
  }
  if (found?.kind === 'claim') ids.add(id);
  for (const claim of model.claims) if (ids.has(claim.sourceId)) ids.add(claim.id);
  return ids;
}

function searchable(model: Workspace, id: string): string {
  const found = locate(model, id);
  if (!found) return id;
  const record = found.record;
  return [record.label, record.statement, record.definition, record.evidenceRequirements, record.boundary, record.permittedInference, record.limitations, record.notes, record.locator, record.citation, record.basis, record.doi].filter(Boolean).join(' ').toLocaleLowerCase('fi');
}

function statusOf(model: Workspace, id: string): EpistemicStatus | '' {
  const found = locate(model, id);
  if (!found) return '';
  if (found.kind === 'source') return model.claims.find(claim => claim.sourceId === id)?.epistemicStatus || '';
  if (found.kind === 'claim' || found.kind === 'construct' || found.kind === 'criterion' || found.kind === 'proposition') return found.record.epistemicStatus;
  return '';
}

export function visibleIds(model: Workspace, focus: boolean, focusId: string, query: string, status: string): Set<string> {
  const visual = [
    ...model.sources.map(record => record.id), ...model.claims.map(record => record.id),
    ...model.constructs.map(record => record.id), ...model.criteria.map(record => record.id), ...model.propositions.map(record => record.id)
  ];
  const scope = focus && focusId ? justificationIds(model, focusId) : new Set(visual);
  const needle = query.trim().toLocaleLowerCase('fi');
  const passes = (id: string) => scope.has(id) && (!needle || searchable(model, id).includes(needle)) && (status === 'all' || statusOf(model, id) === status);
  const ids = new Set(visual.filter(passes));
  for (const claim of model.claims) {
    if (!scope.has(claim.id)) continue;
    if (ids.has(claim.id)) ids.add(claim.sourceId);
    if (ids.has(claim.sourceId) && (status === 'all' || claim.epistemicStatus === status)) ids.add(claim.id);
  }
  if (focus && focusId && locate(model, focusId)) ids.add(focusId);
  return ids;
}

function place(kind: RecordData['kind'], index: number, saved?: Position, anchorY?: number): Position {
  if (saved) return { x: saved.x, y: saved.y };
  return { x: 28 + column[kind] * 292, y: kind === 'claim' && anchorY !== undefined ? anchorY : 28 + index * 132 };
}

export function buildFlow(
  model: Workspace,
  ids: Set<string>,
  selectedId: string,
  selectedEdge: string,
  display?: FlowDisplay
): { nodes: RecordNode[]; edges: LinkEdge[] } {
  const locale = display?.locale || 'fi';
  const L = labelsFor(locale);
  const resolve = display?.resolveLabel || ((_, fallback: string) => fallback);
  const nodes: RecordNode[] = [];
  const counts = { source: 0, claim: 0, construct: 0, criterion: 0, proposition: 0 };
  const sourceY = new Map<string, number>();
  const noClaim = locale === 'en' ? 'no claim' : 'ei väitettä';
  const sourceRef = locale === 'en' ? 'Source ref' : 'Lähdeviite';
  const sourceRefAria = (a: string, b: string) => locale === 'en'
    ? `Source reference: ${a} and ${b}. Not a research relationship and not a causal arrow.`
    : `Lähdeviite: ${a} ja ${b}. Ei tutkimuksellinen yhteys eikä kausaalinuoli.`;
  const noCausal = locale === 'en' ? 'Not causation.' : 'Ei kausaalisuutta.';
  const push = (id: string, kind: RecordData['kind'], label: string, badge: string, saved?: Position, anchorY?: number) => {
    if (!ids.has(id)) return;
    const position = place(kind, counts[kind], saved, anchorY);
    counts[kind] += 1;
    if (kind === 'source') sourceY.set(id, position.y);
    const shown = resolve(id, label);
    nodes.push({
      id, type: 'record', position, selected: id === selectedId, draggable: true,
      ariaLabel: `${L.kindLabel[kind]}: ${shown}. ${badge}.`,
      data: { kind, label: shown, badge }, style: { width: 230 }
    });
  };
  model.sources.forEach(record => push(record.id, 'source', record.label, L.epistemicShort[statusOf(model, record.id) as EpistemicStatus] || noClaim, record.position));
  model.claims.forEach((record, index) => push(record.id, 'claim', record.statement || record.id, L.epistemicShort[record.epistemicStatus], record.position, (sourceY.get(record.sourceId) ?? 28) + model.claims.filter((claim, claimIndex) => claim.sourceId === record.sourceId && claimIndex < index).length * 132));
  model.constructs.forEach(record => push(record.id, 'construct', record.label, L.epistemicShort[record.epistemicStatus], record.position));
  model.criteria.forEach(record => push(record.id, 'criterion', record.label, L.epistemicShort[record.epistemicStatus], record.position));
  model.propositions.forEach(record => push(record.id, 'proposition', record.label, L.epistemicShort[record.epistemicStatus], record.position));
  const labelOf = (id: string) => nodes.find(node => node.id === id)?.data.label || id;
  const edges: LinkEdge[] = [];
  for (const claim of model.claims) {
    if (!ids.has(claim.id) || !ids.has(claim.sourceId)) continue;
    const id = `link:${claim.id}`;
    const aria = sourceRefAria(labelOf(claim.sourceId), labelOf(claim.id));
    edges.push({
      id, type: 'epistemic', source: claim.sourceId, target: claim.id, selected: selectedEdge === id,
      ariaLabel: aria,
      data: { text: sourceRef, pattern: 'membership', color: '#7d8da3', aria }
    });
  }
  for (const link of model.relationships) {
    if (!ids.has(link.source) || !ids.has(link.target)) continue;
    const linkLabel = resolve(link.id, (link.label || '').trim() || L.meaningLabel[link.meaning]);
    const text = `${linkLabel} · ${L.epistemicShort[link.epistemicStatus]}`;
    const aria = `${L.meaningLabel[link.meaning]}: ${labelOf(link.source)} → ${labelOf(link.target)}. ${L.epistemicLabel[link.epistemicStatus]}. ${noCausal}`;
    edges.push({
      id: link.id, type: 'epistemic', source: link.source, target: link.target, selected: selectedEdge === link.id,
      ariaLabel: aria,
      data: {
        text, color: epistemicColor[link.epistemicStatus],
        pattern: link.epistemicStatus === 'hypothesis' ? 'dotted' : link.epistemicStatus === 'adaptation' ? 'dashed' : 'solid',
        aria
      }
    });
  }
  return { nodes, edges };
}
