import { buildFlow, justificationIds, type FlowDisplay } from './graph.ts';
import { locate } from './model.ts';
import { contentHash } from './snapshots.ts';
import { labelsFor } from './labels.ts';
import { t } from './i18n/catalog.ts';
import { researchTranslationManifest, displayRecordLabel } from './i18n/research.ts';
import type { Locale } from './i18n/locale.ts';
import { TRANSLATION_RESOURCE_VERSION } from './i18n/locale.ts';
import type { EpistemicStatus, Workspace } from './types.ts';

export type FigureDisplayOptions = {
  locale?: Locale;
  resolveLabel?: (id: string, fallback: string) => string;
  hashMatches?: boolean;
};

function figureLocale(options?: FigureDisplayOptions): Locale {
  return options?.locale || 'fi';
}

function figureFlowDisplay(model: Workspace, options?: FigureDisplayOptions): FlowDisplay {
  const locale = figureLocale(options);
  const hashMatches = options?.hashMatches !== false;
  const resolveLabel = options?.resolveLabel
    || ((id: string, fallback: string) => displayRecordLabel(locale, model, id, hashMatches) || fallback);
  return { locale, resolveLabel };
}

export const FIGURE_GENERATOR_VERSION = '1.0.0';
export const MANUSCRIPT_WIDTH_PX = 700;
export const DEFAULT_GRAPHVIZ_ENGINE = 'dot';
export const DEFAULT_GRAPHVIZ_SETTINGS = {
  engine: DEFAULT_GRAPHVIZ_ENGINE,
  rankdir: 'LR',
  fontname: 'Arial',
  fontsize: 10,
  overlap: false
} as const;

export type FigurePreset = 'justification' | 'evaluation-model' | 'constructed-case';
export type FigureMode = 'browser-layout' | 'graphviz';

export interface FigureViewFilter {
  preset: FigurePreset | 'custom';
  focusId: string;
  caseId: string;
  query: string;
  epistemicFilter: 'all' | EpistemicStatus;
  scopeNote: string;
}

export interface FigureSelection {
  nodeIds: string[];
  relationshipIds: string[];
  claimIds: string[];
  relationships: {
    id: string;
    meaning: string;
    source: string;
    target: string;
    epistemicStatus: EpistemicStatus;
    label: string;
    locator: string;
  }[];
}

export interface FigureManifest {
  exportType: 'research-figure-manifest';
  generatorVersion: string;
  exportedAt: string;
  snapshotContentHash: string;
  /** Presentation language for labels/legend/caption; does not affect snapshotContentHash. */
  displayLanguage: Locale;
  /** Editorial translation resource version used for presentation labels. */
  translationResourceVersion: string;
  mode: FigureMode;
  viewFilter: FigureViewFilter;
  selectedNodeIds: string[];
  selectedRelationshipIds: string[];
  selectedClaimIds: string[];
  relationships: FigureSelection['relationships'];
  layoutSettings: Record<string, unknown>;
  toolVersions: {
    node: string;
    graphviz: string | null;
    graphvizAvailable: boolean;
    note: string;
  };
  captionDraft: string;
  reproducibilityNote: string;
  renderedOutputs: { path: string; kind: string; claimedRendered: boolean }[];
}

export interface FigureBundle {
  mode: FigureMode;
  svg?: string;
  dot?: string;
  captionDraft: string;
  manifest: FigureManifest;
  selection: FigureSelection;
  graphvizAvailable: boolean;
  graphvizInstallHint: string;
}

const GRAPHVIZ_HINT =
  'Asenna Graphviz ja varmista, että `dot` on PATH-muuttujassa (Windows: `dot -V`). Tätä skriptiä ei muuteta PATH- tai tietoturva-asetuksia automaattisesti. DOT-tiedosto on silti kelvollinen ilman Graphvizia.';

const REPRO_NOTE =
  'Työkalu- ja fonttiversiot kirjataan toistettavuutta varten. Binääritason identtistä renderöintiä eri ympäristöjen välillä ei luvata, jos Graphviz/fontit eivät ole kiinnitettyjä.';

/** Browser builds stay free of Node types; Node export tooling still records its runtime when present. */
function figureRuntimeLabel(): string {
  const runtime = globalThis as { process?: { versions?: { node?: string } } };
  const version = runtime.process?.versions?.node;
  return version ? `node ${version}` : 'browser';
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrap(text: string, max = 26): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of String(text || '').split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function quoteDot(value: string): string {
  return JSON.stringify(String(value ?? ''));
}

export function resolvePresetIds(
  model: Workspace,
  preset: FigurePreset,
  options: { focusId?: string; caseId?: string; locale?: Locale } = {}
): { ids: Set<string>; viewFilter: FigureViewFilter } {
  const locale = options.locale || 'fi';
  if (preset === 'justification') {
    const focusId = options.focusId && locate(model, options.focusId) ? options.focusId : (locate(model, 'sufficiency') ? 'sufficiency' : model.constructs[0]?.id || '');
    const ids = focusId ? justificationIds(model, focusId) : new Set<string>();
    return {
      ids,
      viewFilter: {
        preset,
        focusId,
        caseId: '',
        query: '',
        epistemicFilter: 'all',
        scopeNote: t(locale, 'figure.scopeJustification', { focusId: focusId || '—' })
      }
    };
  }
  if (preset === 'evaluation-model') {
    const ids = new Set<string>();
    for (const criterion of model.criteria) {
      ids.add(criterion.id);
      criterion.constructIds.forEach(id => ids.add(id));
    }
    for (const proposition of model.propositions) {
      if (proposition.criterionIds.some(id => ids.has(id))) {
        ids.add(proposition.id);
        proposition.criterionIds.forEach(id => ids.add(id));
        (proposition.constructIds || []).forEach(id => ids.add(id));
      }
    }
    for (const link of model.relationships) {
      if (ids.has(link.source) || ids.has(link.target)) {
        ids.add(link.source);
        ids.add(link.target);
      }
    }
    for (const claim of model.claims) if (ids.has(claim.sourceId)) ids.add(claim.id);
    for (const claim of model.claims) if (ids.has(claim.id)) ids.add(claim.sourceId);
    return {
      ids,
      viewFilter: {
        preset,
        focusId: '',
        caseId: '',
        query: '',
        epistemicFilter: 'all',
        scopeNote: t(locale, 'figure.scopeEvaluation')
      }
    };
  }
  const caseId = options.caseId && model.cases.some(item => item.id === options.caseId)
    ? options.caseId
    : (model.cases[0]?.id || 'A');
  const item = model.cases.find(entry => entry.id === caseId);
  const ids = new Set<string>();
  if (item) {
    item.propositionIds.forEach(id => ids.add(id));
    item.criterionIds.forEach(id => ids.add(id));
    for (const proposition of model.propositions) {
      if (!ids.has(proposition.id)) continue;
      proposition.criterionIds.forEach(id => ids.add(id));
      (proposition.constructIds || []).forEach(id => ids.add(id));
    }
    for (const criterion of model.criteria) {
      if (!ids.has(criterion.id)) continue;
      criterion.constructIds.forEach(id => ids.add(id));
    }
    for (const link of model.relationships) {
      if (ids.has(link.source) && ids.has(link.target)) continue;
      if (ids.has(link.source) || ids.has(link.target)) {
        // Keep endpoints needed to show preserved epistemic links among selected case anchors.
        if (ids.has(link.source)) ids.add(link.target);
        if (ids.has(link.target)) ids.add(link.source);
      }
    }
  }
  return {
    ids,
    viewFilter: {
      preset,
      focusId: '',
      caseId,
      query: '',
      epistemicFilter: 'all',
      scopeNote: t(locale, 'figure.scopeCase', { caseId })
    }
  };
}

export function buildFigureSelection(
  model: Workspace,
  ids: Set<string>,
  options: FigureDisplayOptions = {}
): FigureSelection {
  const locale = figureLocale(options);
  const L = labelsFor(locale);
  const display = figureFlowDisplay(model, options);
  const nodeIds = [...ids].filter(id => {
    const found = locate(model, id);
    return found && ['source', 'claim', 'construct', 'criterion', 'proposition'].includes(found.kind);
  }).sort();
  const claimIds = model.claims.filter(claim => ids.has(claim.id)).map(claim => claim.id).sort();
  const relationships = model.relationships
    .filter(link => ids.has(link.source) && ids.has(link.target))
    .map(link => ({
      id: link.id,
      meaning: link.meaning,
      source: link.source,
      target: link.target,
      epistemicStatus: link.epistemicStatus,
      label: display.resolveLabel(link.id, (link.label || '').trim() || L.meaningLabel[link.meaning]),
      locator: link.locator || ''
    }));
  // Selection never strips epistemicStatus: every included relationship keeps its recorded status.
  return {
    nodeIds,
    relationshipIds: relationships.map(item => item.id).sort(),
    claimIds,
    relationships
  };
}

export function draftFigureCaption(
  model: Workspace,
  selection: FigureSelection,
  viewFilter: FigureViewFilter,
  mode: FigureMode,
  locale: Locale = 'fi'
): string {
  const proposed = selection.relationships.filter(item => item.epistemicStatus === 'hypothesis').length;
  const adaptations = selection.relationships.filter(item => item.epistemicStatus === 'adaptation').length;
  const reported = selection.relationships.filter(item => item.epistemicStatus === 'reported').length;
  const locators = selection.relationships.map(item => item.locator).filter(Boolean);
  const modeLabel = mode === 'browser-layout'
    ? t(locale, 'figure.captionModeBrowser')
    : t(locale, 'figure.captionModeGraphviz');
  const lines = [
    t(locale, 'figure.captionScope', { note: viewFilter.scopeNote }),
    t(locale, 'figure.captionState', { name: model.project.name, mode: modeLabel }),
    t(locale, 'figure.captionSelection', {
      nodes: selection.nodeIds.length,
      edges: selection.relationshipIds.length,
      claims: selection.claimIds.length
    }),
    t(locale, 'figure.captionEpistemic', { reported, adaptations, proposed }),
    proposed || adaptations
      ? t(locale, 'figure.captionMixed')
      : t(locale, 'figure.captionReportedOnly'),
    locators.length
      ? t(locale, 'figure.captionLocators', { count: locators.length })
      : t(locale, 'figure.captionNoLocators'),
    t(locale, 'figure.captionDraftNote')
  ];
  if (viewFilter.preset === 'constructed-case' || viewFilter.caseId) {
    lines.push(t(locale, 'research.constructedShort'));
  }
  return lines.join(' ');
}

export function figureBrowserSvg(
  model: Workspace,
  ids: Set<string>,
  options: { selectedId?: string; caption?: string; title?: string } & FigureDisplayOptions = {}
): string {
  const locale = figureLocale(options);
  const display = figureFlowDisplay(model, options);
  const { nodes, edges } = buildFlow(model, ids, options.selectedId || '', '', display);
  const legendH = 54;
  const captionLines = wrap(options.caption || '', 92);
  const captionH = 18 + captionLines.length * 14;
  const width = Math.min(
    Math.max(MANUSCRIPT_WIDTH_PX, ...nodes.map(node => node.position.x + 250), MANUSCRIPT_WIDTH_PX),
    Math.max(MANUSCRIPT_WIDTH_PX, ...nodes.map(node => node.position.x + 250))
  );
  const contentBottom = Math.max(320, ...nodes.map(node => node.position.y + 110), 320);
  const height = contentBottom + legendH + captionH + 24;
  const fills: Record<string, string> = {
    source: '#eaf0fb', claim: '#e7f3f7', construct: '#e9f2ed', criterion: '#f6efdf', proposition: '#eee9f6'
  };
  const title = options.title || t(locale, 'figure.titleBrowser');
  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${escapeXml(title)}</title>`,
    `<desc>${escapeXml('Native SVG text and shapes only; HTML-in-SVG embeds are not used. Solid/dashed/dotted strokes plus colour and text labels mark reported / adaptation / hypothesis. Grey membership line is claim-to-source reference, not a research relationship. Selection preserves each relationship epistemic status. No causal inference; no scientific conclusion asserted by the exporter. Unicode text is preserved.')}</desc>`,
    '<style>text{font-family:Arial,Helvetica,sans-serif}</style>',
    `<rect width="${width}" height="${height}" fill="white"/>`,
    `<clipPath id="figure-clip"><rect x="0" y="0" width="${width}" height="${contentBottom}"/></clipPath>`,
    '<g clip-path="url(#figure-clip)">'
  ];
  for (const edge of edges) {
    const source = nodes.find(node => node.id === edge.source);
    const target = nodes.find(node => node.id === edge.target);
    if (!source || !target || !edge.data) continue;
    const x1 = source.position.x + 230;
    const y1 = source.position.y + 46;
    const x2 = target.position.x;
    const y2 = target.position.y + 46;
    const dash = edge.data.pattern === 'dotted' ? '2 5' : edge.data.pattern === 'dashed' ? '6 4' : edge.data.pattern === 'membership' ? '2 3' : 'none';
    parts.push(`<path d="M${x1},${y1} C${x1 + 48},${y1} ${x2 - 48},${y2} ${x2},${y2}" fill="none" stroke="${edge.data.color}" stroke-width="1.4" stroke-dasharray="${dash}"/>`);
    if (edge.data.pattern !== 'membership') {
      parts.push(`<path d="M${x2 - 8},${y2 - 4} L${x2},${y2} L${x2 - 8},${y2 + 4}" fill="none" stroke="${edge.data.color}" stroke-width="1.4"/>`);
    }
    parts.push(`<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="9" fill="#637188">${escapeXml(edge.data.text)}</text>`);
  }
  for (const node of nodes) {
    const lines = wrap(node.data.label);
    parts.push(`<rect x="${node.position.x}" y="${node.position.y}" width="230" height="92" rx="8" fill="${fills[node.data.kind]}" stroke="#d3dce8"/>`);
    parts.push(`<text x="${node.position.x + 12}" y="${node.position.y + 20}" font-size="10" fill="#637188">${escapeXml(node.data.badge)}</text>`);
    lines.forEach((line, index) => {
      const more = index === 2 && node.data.label.length > lines.join(' ').length;
      parts.push(`<text x="${node.position.x + 12}" y="${node.position.y + 40 + index * 16}" font-size="12" fill="#203047">${escapeXml(line)}${more ? '…' : ''}</text>`);
    });
  }
  if (!nodes.length) parts.push(`<text x="24" y="40" font-size="13" fill="#637188">${escapeXml(t(locale, 'figure.emptySelection'))}</text>`);
  parts.push('</g>');
  const legendY = contentBottom + 18;
  parts.push(`<text x="24" y="${legendY}" font-size="11" fill="#203047">${escapeXml(t(locale, 'figure.legendTitle'))}</text>`);
  parts.push(`<line x1="24" y1="${legendY + 14}" x2="64" y2="${legendY + 14}" stroke="#315cd7" stroke-width="1.6"/>`);
  parts.push(`<text x="70" y="${legendY + 18}" font-size="10" fill="#637188">${escapeXml(t(locale, 'figure.legendReportedShort'))}</text>`);
  parts.push(`<line x1="150" y1="${legendY + 14}" x2="190" y2="${legendY + 14}" stroke="#2f6f4f" stroke-width="1.6" stroke-dasharray="6 4"/>`);
  parts.push(`<text x="196" y="${legendY + 18}" font-size="10" fill="#637188">${escapeXml(t(locale, 'figure.legendAdaptationShort'))}</text>`);
  parts.push(`<line x1="300" y1="${legendY + 14}" x2="340" y2="${legendY + 14}" stroke="#6b4c9a" stroke-width="1.6" stroke-dasharray="2 5"/>`);
  parts.push(`<text x="346" y="${legendY + 18}" font-size="10" fill="#637188">${escapeXml(t(locale, 'figure.legendHypothesisShort'))}</text>`);
  parts.push(`<line x1="460" y1="${legendY + 14}" x2="500" y2="${legendY + 14}" stroke="#7d8da3" stroke-width="1.4" stroke-dasharray="2 3"/>`);
  parts.push(`<text x="506" y="${legendY + 18}" font-size="10" fill="#637188">${escapeXml(t(locale, 'figure.legendMembershipShort'))}</text>`);
  let cy = legendY + 36;
  for (const line of captionLines) {
    parts.push(`<text x="24" y="${cy}" font-size="10" fill="#4b5e78">${escapeXml(line)}</text>`);
    cy += 14;
  }
  parts.push('</svg>');
  return parts.join('\n');
}

export function figureGraphvizDot(
  model: Workspace,
  ids: Set<string>,
  options: { title?: string; settings?: Partial<typeof DEFAULT_GRAPHVIZ_SETTINGS> } & FigureDisplayOptions = {}
): string {
  const locale = figureLocale(options);
  const L = labelsFor(locale);
  const display = figureFlowDisplay(model, options);
  const settings = { ...DEFAULT_GRAPHVIZ_SETTINGS, ...options.settings };
  const selection = buildFigureSelection(model, ids, options);
  const idSet = new Set(selection.nodeIds.filter(id => {
    const found = locate(model, id);
    return found && found.kind !== 'claim';
  }));
  const colors: Record<string, string> = {
    source: '#e8eef8', construct: '#e6f1ec', criterion: '#f5eddc', proposition: '#eee8f6'
  };
  const edgeColor: Record<EpistemicStatus, string> = {
    reported: '#315cd7', adaptation: '#2f6f4f', hypothesis: '#6b4c9a'
  };
  const noStatus = locale === 'en' ? 'no status' : 'ei tilaa';
  const lines = [
    'digraph ResearchFigure {',
    `graph [rankdir=${quoteDot(settings.rankdir)}, bgcolor="white", fontname=${quoteDot(settings.fontname)}, fontsize=${settings.fontsize}, label=${quoteDot(options.title || t(locale, 'figure.titleGraphviz'))}, labelloc=t, charset="UTF-8"];`,
    `node [shape=box, style="rounded,filled", fontname=${quoteDot(settings.fontname)}, fontsize=${settings.fontsize}];`,
    `edge [fontname=${quoteDot(settings.fontname)}, fontsize=${settings.fontsize}];`
  ];
  for (const id of [...idSet].sort()) {
    const found = locate(model, id);
    if (!found || found.kind === 'claim' || found.kind === 'relationship' || found.kind === 'case' || found.kind === 'decision' || found.kind === 'protocol') continue;
    const record = found.record as { label?: string; statement?: string; epistemicStatus?: EpistemicStatus };
    const shown = display.resolveLabel(id, record.label || record.statement || id);
    const label = `${shown}\n[${L.epistemicShort[record.epistemicStatus || 'hypothesis'] || noStatus}]`;
    const kind = found.kind === 'source' ? 'source' : found.kind;
    lines.push(`${quoteDot(id)} [label=${quoteDot(label)}, fillcolor=${quoteDot(colors[kind] || '#ffffff')}];`);
  }
  for (const rel of selection.relationships) {
    if (!idSet.has(rel.source) || !idSet.has(rel.target)) continue;
    const style = rel.epistemicStatus === 'hypothesis' ? 'dotted' : rel.epistemicStatus === 'adaptation' ? 'dashed' : 'solid';
    const label = `${rel.label} · ${L.epistemicShort[rel.epistemicStatus]}${rel.locator ? ` · ${rel.locator}` : ''}`;
    lines.push(`${quoteDot(rel.source)} -> ${quoteDot(rel.target)} [label=${quoteDot(label)}, style=${quoteDot(style)}, color=${quoteDot(edgeColor[rel.epistemicStatus])}];`);
  }
  lines.push('}');
  return lines.join('\n');
}

export async function buildFigureBundle(
  model: Workspace,
  options: {
    mode: FigureMode;
    preset?: FigurePreset;
    ids?: Set<string>;
    focusId?: string;
    caseId?: string;
    selectedId?: string;
    snapshotContentHash?: string;
    layoutSettings?: Record<string, unknown>;
    graphviz?: { available: boolean; version: string | null };
    locale?: Locale;
    resolveLabel?: (id: string, fallback: string) => string;
    hashMatches?: boolean;
  }
): Promise<FigureBundle> {
  const locale = options.locale || 'fi';
  const display: FigureDisplayOptions = {
    locale,
    resolveLabel: options.resolveLabel,
    hashMatches: options.hashMatches
  };
  const preset = options.preset || 'justification';
  const resolved = options.ids
    ? {
      ids: options.ids,
      viewFilter: {
        preset: 'custom' as const,
        focusId: options.focusId || '',
        caseId: options.caseId || '',
        query: '',
        epistemicFilter: 'all' as const,
        scopeNote: t(locale, 'figure.scopeCustom')
      }
    }
    : resolvePresetIds(model, preset, { focusId: options.focusId, caseId: options.caseId, locale });
  const selection = buildFigureSelection(model, resolved.ids, display);
  const captionDraft = draftFigureCaption(model, selection, resolved.viewFilter, options.mode, locale);
  const graphviz = options.graphviz || { available: false, version: null };
  const hash = options.snapshotContentHash || await contentHash(model);
  const layoutSettings = options.mode === 'browser-layout'
    ? { kind: 'browser-saved-positions', manuscriptWidthPx: MANUSCRIPT_WIDTH_PX, foreignObject: false, ...(options.layoutSettings || {}) }
    : { ...DEFAULT_GRAPHVIZ_SETTINGS, ...(options.layoutSettings || {}) };
  const nodeVersion = figureRuntimeLabel();
  const translationResourceVersion = researchTranslationManifest().resourceVersion || TRANSLATION_RESOURCE_VERSION;
  const scopedTitle = t(locale, 'figure.titleScoped', { preset: resolved.viewFilter.preset });
  const manifest: FigureManifest = {
    exportType: 'research-figure-manifest',
    generatorVersion: FIGURE_GENERATOR_VERSION,
    exportedAt: new Date().toISOString(),
    snapshotContentHash: hash,
    displayLanguage: locale,
    translationResourceVersion,
    mode: options.mode,
    viewFilter: resolved.viewFilter,
    selectedNodeIds: selection.nodeIds,
    selectedRelationshipIds: selection.relationshipIds,
    selectedClaimIds: selection.claimIds,
    relationships: selection.relationships,
    layoutSettings,
    toolVersions: {
      node: nodeVersion,
      graphviz: graphviz.version,
      graphvizAvailable: graphviz.available,
      note: REPRO_NOTE
    },
    captionDraft,
    reproducibilityNote: REPRO_NOTE,
    renderedOutputs: []
  };
  if (options.mode === 'browser-layout') {
    return {
      mode: options.mode,
      svg: figureBrowserSvg(model, resolved.ids, {
        selectedId: options.selectedId,
        caption: captionDraft,
        title: scopedTitle,
        ...display
      }),
      captionDraft,
      manifest,
      selection,
      graphvizAvailable: graphviz.available,
      graphvizInstallHint: GRAPHVIZ_HINT
    };
  }
  return {
    mode: options.mode,
    dot: figureGraphvizDot(model, resolved.ids, { title: scopedTitle, ...display }),
    captionDraft,
    manifest,
    selection,
    graphvizAvailable: graphviz.available,
    graphvizInstallHint: GRAPHVIZ_HINT
  };
}

export function selectionMatchesManifest(selection: FigureSelection, manifest: FigureManifest): boolean {
  const same = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (!same(selection.nodeIds, manifest.selectedNodeIds)) return false;
  if (!same(selection.relationshipIds, manifest.selectedRelationshipIds)) return false;
  if (!same(selection.claimIds, manifest.selectedClaimIds)) return false;
  return selection.relationships.every(rel => {
    const row = manifest.relationships.find(item => item.id === rel.id);
    return !!row && row.epistemicStatus === rel.epistemicStatus;
  });
}
