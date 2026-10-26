import { load, validate } from './model.ts';
import { clone, newId } from './edit.ts';
import type {
  EditEventKind, EditLogEntry, RecordRevision, Workspace
} from './types.ts';

export const EDIT_LOG_CAP = 500;
export const CANONICALISATION_VERSION = 1;
export const SNAPSHOT_EXPORT_TYPE = 'research-snapshot' as const;
export const PRE_IMPORT_BACKUP_KEY = 'research-evidence-explorer-pre-import-v1';

export const AUDIT_DISCLAIMER =
  'Muokkaushistoria on selaimen paikallinen, liitettävä päätösloki. Selain-JSON:ia voi muokata ulkopuolelta; tämä ei ole peukaloinnin kestävä auditointijärjestelmä eikä todennettu tunnistautuminen.';

export const HASH_DISCLAIMER =
  'Sisältötiiviste tunnistaa kanonisen tieteellisen sisällön. Se ei validoi tutkimusta, arvioi laatua eikä korvaa lähdearviointia.';

export const LOCAL_SAVE_DISCLAIMER =
  'Selainkohtainen tallennus jää tälle selaimelle/alkuperälle. Siirrettävä kopio syntyy vain eksplisiittisellä viennillä. Varmuuskopioita ei lähetetä palvelimelle tai GitHubiin automaattisesti.';

export const CANONICALISATION_PROCEDURE = [
  '1. Kopioi työtila ja poista kaikki position-kentät (näkymä/layout erotetaan sisällöstä).',
  '2. Poista editLog ja recordRevisions sisältötiivisteestä (historia ja layout eivät kuulu tieteellisen sisällön identiteettiin); ne sisältyvät kuitenkin täyteen tilannekuvaan.',
  '3. Järjestä jokaisen objektin avaimet aakkosjärjestykseen.',
  '4. Järjestä tietuekokoelmat (sources, claims, constructs, criteria, relationships, propositions, protocols, cases, decisions) id-kentän mukaan.',
  '5. Muodosta UTF-8 JSON ilman ylimääräistä välilyöntiä (JSON.stringify).',
  '6. Laske SHA-256 heksana ja merkitse etuliitteellä sha256:.',
  `Canonicalisation version: ${CANONICALISATION_VERSION}.`
].join(' ');

const CONTENT_COLLECTIONS = [
  'sources', 'claims', 'constructs', 'criteria', 'relationships', 'propositions', 'protocols', 'cases', 'decisions'
] as const;

const eventKinds: EditEventKind[] = [
  'create', 'update', 'delete', 'undo', 'import', 'csl-import', 'layout', 'other'
];

export interface ResearchSnapshot {
  exportType: typeof SNAPSHOT_EXPORT_TYPE;
  schemaVersion: 2;
  exportedAt: string;
  project: Workspace['project'];
  contentHash: string;
  layoutHash: string;
  canonicalisation: {
    version: number;
    procedure: string;
    contentExcludes: string[];
    hashValidatesResearch: false;
  };
  disclaimer: string;
  localSaveNote: string;
  workspace: Workspace;
}

export interface ImportPreview {
  ok: boolean;
  error: string;
  model: Workspace | null;
  addedIds: string[];
  removedIds: string[];
  changedDefinitions: { id: string; label: string; before: string; after: string }[];
  changedCriteria: { id: string; label: string; before: string; after: string }[];
  changedEvidenceLinks: { id: string; label: string; before: string; after: string }[];
  changedPropositions: { id: string; label: string; before: string; after: string }[];
  unresolvedVersionOf: string[];
  note: string;
}

export interface SnapshotComparison {
  contentHashEqual: boolean;
  layoutHashEqual: boolean;
  leftContentHash: string;
  rightContentHash: string;
  changedDefinitions: ImportPreview['changedDefinitions'];
  changedCriteria: ImportPreview['changedCriteria'];
  changedEvidenceLinks: ImportPreview['changedEvidenceLinks'];
  changedPropositions: ImportPreview['changedPropositions'];
  addedIds: string[];
  removedIds: string[];
}

export function emptyEditLog(): EditLogEntry[] {
  return [];
}

export function emptyRecordRevisions(): RecordRevision[] {
  return [];
}

export function hydrateHistory(raw: Record<string, unknown>): { recordRevisions: RecordRevision[]; editLog: EditLogEntry[] } {
  const revisions = Array.isArray(raw.recordRevisions)
    ? raw.recordRevisions.map(item => {
      const row = isObj(item) ? item : {};
      return {
        recordId: str(row.recordId),
        revision: Number.isFinite(Number(row.revision)) ? Math.max(0, Math.floor(Number(row.revision))) : 1
      };
    }).filter(item => item.recordId)
    : [];
  const editLog = Array.isArray(raw.editLog)
    ? raw.editLog.map(hydrateEditEntry).filter(item => item.id)
    : [];
  return { recordRevisions: revisions, editLog };
}

export function revisionOf(model: Workspace, recordId: string): number {
  return model.recordRevisions.find(item => item.recordId === recordId)?.revision || 0;
}

export function stripLayout<T>(value: T): T {
  return stripKey(value, 'position') as T;
}

/** Scientific identity for hashing: curated records without layout, edit history or nested legacy import. */
export type ScientificContent = Omit<Workspace, 'editLog' | 'recordRevisions' | 'legacy'>;

export function scientificContent(model: Workspace): ScientificContent {
  const copy = stripLayout(clone(model));
  return {
    schemaVersion: copy.schemaVersion,
    project: copy.project,
    sources: copy.sources,
    claims: copy.claims,
    constructs: copy.constructs,
    criteria: copy.criteria,
    relationships: copy.relationships,
    propositions: copy.propositions,
    protocols: copy.protocols,
    cases: copy.cases,
    decisions: copy.decisions
  };
}

export function layoutMap(model: Workspace): Record<string, { x: number; y: number }> {
  const map: Record<string, { x: number; y: number }> = {};
  for (const key of ['sources', 'claims', 'constructs', 'criteria', 'propositions'] as const) {
    for (const record of model[key]) {
      if (record.position && Number.isFinite(record.position.x) && Number.isFinite(record.position.y)) {
        map[record.id] = { x: record.position.x, y: record.position.y };
      }
    }
  }
  return map;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('SHA-256 ei ole käytettävissä tässä ympäristössä.');
  const digest = await subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function contentHash(model: Workspace): Promise<string> {
  const hex = await sha256Hex(canonicalize(scientificContent(model)));
  return `sha256:${hex}`;
}

export async function layoutHash(model: Workspace): Promise<string> {
  const hex = await sha256Hex(canonicalize(layoutMap(model)));
  return `sha256:${hex}`;
}

export async function createSnapshot(model: Workspace, exportedAt = new Date().toISOString()): Promise<ResearchSnapshot> {
  const workspace = validate(clone(model)) as Workspace;
  return {
    exportType: SNAPSHOT_EXPORT_TYPE,
    schemaVersion: 2,
    exportedAt,
    project: clone(workspace.project),
    contentHash: await contentHash(workspace),
    layoutHash: await layoutHash(workspace),
    canonicalisation: {
      version: CANONICALISATION_VERSION,
      procedure: CANONICALISATION_PROCEDURE,
      contentExcludes: ['position', 'editLog', 'recordRevisions', 'legacy'],
      hashValidatesResearch: false
    },
    disclaimer: `${HASH_DISCLAIMER} ${AUDIT_DISCLAIMER}`,
    localSaveNote: LOCAL_SAVE_DISCLAIMER,
    workspace
  };
}

export function isResearchSnapshot(value: unknown): value is ResearchSnapshot {
  return isObj(value) && value.exportType === SNAPSHOT_EXPORT_TYPE && isObj(value.workspace);
}

export function workspaceFromIncoming(incoming: unknown): unknown {
  if (isResearchSnapshot(incoming)) return incoming.workspace;
  return incoming;
}

export function previewImport(current: Workspace, incoming: unknown): ImportPreview {
  const note = 'Tuonti korvaa työtilan kokonaan tarkastuksen jälkeen. Tunnisteita ei yhdistetä automaattisesti, eikä ratkaisemattomia versionOf-viitteitä poisteta.';
  try {
    const raw = workspaceFromIncoming(incoming);
    const model = load(raw) as Workspace;
    const comparison = compareWorkspaces(current, model);
    return {
      ok: true,
      error: '',
      model,
      ...comparison,
      unresolvedVersionOf: model.sources.filter(source => source.versionOf && !model.sources.some(other => other.id === source.versionOf)).map(source => source.id),
      note
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Tuonti epäonnistui.',
      model: null,
      addedIds: [],
      removedIds: [],
      changedDefinitions: [],
      changedCriteria: [],
      changedEvidenceLinks: [],
      changedPropositions: [],
      unresolvedVersionOf: [],
      note
    };
  }
}

export function applySnapshotImport(current: Workspace, incoming: unknown): {
  ok: boolean;
  model: Workspace;
  error: string;
  preview: ImportPreview;
  backup: Workspace;
} {
  const backup = clone(current);
  const preview = previewImport(current, incoming);
  if (!preview.ok || !preview.model) {
    return { ok: false, model: current, error: preview.error || 'Tuonti hylättiin.', preview, backup };
  }
  // Do not merge identities or drop unresolved version chains — validate already enforces versionOf integrity.
  const withEvent = appendEditEvent(preview.model, {
    kind: 'import',
    summary: 'Työtila korvattiin tuodulla tilannekuvalla tai JSON-tiedostolla.',
    reason: 'Tutkija hyväksyi tuonnin esikatselun jälkeen.',
    actorLabel: '',
    recordIds: [],
    before: { contentSummary: summariseWorkspace(current) },
    after: { contentSummary: summariseWorkspace(preview.model) },
    reversesEventId: '',
    note: AUDIT_DISCLAIMER
  });
  try {
    const model = validate(withEvent) as Workspace;
    return { ok: true, model, error: '', preview, backup };
  } catch (error) {
    return {
      ok: false,
      model: current,
      error: error instanceof Error ? error.message : 'Tuonnin validointi epäonnistui.',
      preview,
      backup
    };
  }
}

export function storePreImportBackup(backup: Workspace): boolean {
  try {
    localStorage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      disclaimer: LOCAL_SAVE_DISCLAIMER,
      workspace: backup
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadPreImportBackup(): { savedAt: string; workspace: Workspace } | null {
  try {
    const raw = localStorage.getItem(PRE_IMPORT_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isObj(parsed) || !parsed.workspace) return null;
    return { savedAt: str(parsed.savedAt), workspace: load(parsed.workspace) as Workspace };
  } catch {
    return null;
  }
}

export async function compareSnapshots(left: Workspace, right: Workspace): Promise<SnapshotComparison> {
  const base = compareWorkspaces(left, right);
  return {
    contentHashEqual: (await contentHash(left)) === (await contentHash(right)),
    layoutHashEqual: (await layoutHash(left)) === (await layoutHash(right)),
    leftContentHash: await contentHash(left),
    rightContentHash: await contentHash(right),
    ...base
  };
}

export function compareWorkspaces(left: Workspace, right: Workspace) {
  const leftIds = new Set(allRecordIds(left));
  const rightIds = new Set(allRecordIds(right));
  const addedIds = [...rightIds].filter(id => !leftIds.has(id)).sort();
  const removedIds = [...leftIds].filter(id => !rightIds.has(id)).sort();
  const changedDefinitions: ImportPreview['changedDefinitions'] = [];
  const changedCriteria: ImportPreview['changedCriteria'] = [];
  const changedEvidenceLinks: ImportPreview['changedEvidenceLinks'] = [];
  const changedPropositions: ImportPreview['changedPropositions'] = [];

  for (const construct of right.constructs) {
    const prev = left.constructs.find(item => item.id === construct.id);
    if (!prev) continue;
    if (prev.definition !== construct.definition) {
      changedDefinitions.push({ id: construct.id, label: construct.label, before: prev.definition, after: construct.definition });
    }
  }
  for (const criterion of right.criteria) {
    const prev = left.criteria.find(item => item.id === criterion.id);
    if (!prev) continue;
    const before = [prev.evidenceRequirements, prev.decisionRule, prev.permittedInference, prev.constructIds.join(',')].join('\n');
    const after = [criterion.evidenceRequirements, criterion.decisionRule, criterion.permittedInference, criterion.constructIds.join(',')].join('\n');
    if (before !== after) {
      changedCriteria.push({ id: criterion.id, label: criterion.label, before, after });
    }
  }
  for (const claim of right.claims) {
    const prev = left.claims.find(item => item.id === claim.id);
    if (!prev) continue;
    const before = [prev.statement, prev.locator, prev.sourceId].join('\n');
    const after = [claim.statement, claim.locator, claim.sourceId].join('\n');
    if (before !== after) {
      changedEvidenceLinks.push({ id: claim.id, label: claim.id, before, after });
    }
  }
  for (const rel of right.relationships) {
    const prev = left.relationships.find(item => item.id === rel.id);
    if (!prev) continue;
    const before = [prev.meaning, prev.source, prev.target, (prev.claimIds || []).join(','), (prev.sourceIds || []).join(',')].join('\n');
    const after = [rel.meaning, rel.source, rel.target, (rel.claimIds || []).join(','), (rel.sourceIds || []).join(',')].join('\n');
    if (before !== after) {
      changedEvidenceLinks.push({ id: rel.id, label: rel.label || rel.id, before, after });
    }
  }
  for (const proposition of right.propositions) {
    const prev = left.propositions.find(item => item.id === proposition.id);
    if (!prev) continue;
    if (prev.statement !== proposition.statement) {
      changedPropositions.push({ id: proposition.id, label: proposition.label, before: prev.statement, after: proposition.statement });
    }
  }
  return { addedIds, removedIds, changedDefinitions, changedCriteria, changedEvidenceLinks, changedPropositions };
}

export function appendEditEvent(
  model: Workspace,
  partial: Omit<EditLogEntry, 'id' | 'at'> & { id?: string; at?: string }
): Workspace {
  const copy = clone(model);
  if (!Array.isArray(copy.editLog)) copy.editLog = [];
  if (!Array.isArray(copy.recordRevisions)) copy.recordRevisions = [];
  const entry: EditLogEntry = {
    id: partial.id || newId(copy, 'edit'),
    at: partial.at || new Date().toISOString(),
    kind: eventKinds.includes(partial.kind) ? partial.kind : 'other',
    summary: partial.summary || '',
    reason: partial.reason || '',
    actorLabel: partial.actorLabel || '',
    recordIds: [...new Set(partial.recordIds || [])],
    before: partial.before ?? null,
    after: partial.after ?? null,
    reversesEventId: partial.reversesEventId || '',
    note: partial.note || ''
  };
  if (entry.kind !== 'undo' && entry.kind !== 'import' && entry.kind !== 'layout') {
    for (const recordId of entry.recordIds) bumpRevision(copy, recordId);
  } else if (entry.kind === 'layout') {
    for (const recordId of entry.recordIds) bumpRevision(copy, recordId);
  } else if (entry.kind === 'import') {
    // Imported workspace keeps its own revision table; do not invent bumps here.
  }
  copy.editLog = copy.editLog.concat([entry]);
  if (copy.editLog.length > EDIT_LOG_CAP) {
    const dropped = copy.editLog.length - EDIT_LOG_CAP;
    copy.editLog = copy.editLog.slice(dropped);
    copy.editLog[0] = {
      ...copy.editLog[0],
      note: `${copy.editLog[0].note ? copy.editLog[0].note + ' ' : ''}[loki katkaistiin: ${dropped} vanhinta tapahtumaa poistettiin tallennusrajasta]`
    };
  }
  return copy;
}

export function prepareCommit(
  before: Workspace,
  after: Workspace,
  options: { reason?: string; actorLabel?: string; summary?: string; kind?: EditEventKind } = {}
): Workspace {
  const beforeContent = canonicalize(scientificContent(before));
  const afterContent = canonicalize(scientificContent(after));
  const beforeLayout = canonicalize(layoutMap(before));
  const afterLayout = canonicalize(layoutMap(after));
  if (beforeContent === afterContent && beforeLayout === afterLayout) {
    // Only history fields may differ; keep caller payload after validate hydration later.
    return after;
  }
  const diff = diffRecords(before, after);
  const layoutOnly = beforeContent === afterContent && beforeLayout !== afterLayout;
  const kind = options.kind || (layoutOnly ? 'layout' : diff.kind);
  return appendEditEvent(after, {
    kind,
    summary: options.summary || diff.summary,
    reason: options.reason || '',
    actorLabel: options.actorLabel || '',
    recordIds: diff.recordIds,
    before: diff.before,
    after: diff.after,
    reversesEventId: '',
    note: AUDIT_DISCLAIMER
  });
}

export function prepareUndo(
  current: Workspace,
  previous: Workspace,
  options: { actorLabel?: string; reason?: string } = {}
): Workspace {
  const last = current.editLog[current.editLog.length - 1];
  // Restore scientific/layout content from previous, but keep the append-only log so the reversed change remains inspectable.
  const restored = clone(previous);
  restored.editLog = clone(current.editLog || []);
  restored.recordRevisions = clone(current.recordRevisions || []);
  return appendEditEvent(restored, {
    kind: 'undo',
    summary: 'Edellinen muutos kumottiin. Kumoaminen säilyttää tiedon siitä, että muutos peruutettiin; historiaa ei kirjoiteta uudelleen.',
    reason: options.reason || 'Käyttöliittymän Kumoa',
    actorLabel: options.actorLabel || '',
    recordIds: last?.recordIds || [],
    before: last ? { reversedEventId: last.id, summary: last.summary, afterSnapshot: last.after } : { reversedEventId: '', summary: 'Tuntematon edellinen muutos' },
    after: { restoredSummary: summariseWorkspace(previous) },
    reversesEventId: last?.id || '',
    note: AUDIT_DISCLAIMER
  });
}

function bumpRevision(model: Workspace, recordId: string) {
  const existing = model.recordRevisions.find(item => item.recordId === recordId);
  if (existing) existing.revision += 1;
  else model.recordRevisions.push({ recordId, revision: 1 });
}

function diffRecords(before: Workspace, after: Workspace) {
  const recordIds: string[] = [];
  const beforeParts: Record<string, unknown> = {};
  const afterParts: Record<string, unknown> = {};
  let created = 0;
  let updated = 0;
  let deleted = 0;
  for (const key of CONTENT_COLLECTIONS) {
    const left = new Map((before[key] as { id: string }[]).map(item => [item.id, item]));
    const right = new Map((after[key] as { id: string }[]).map(item => [item.id, item]));
    for (const [id, row] of right) {
      const prev = left.get(id);
      if (!prev) {
        created += 1;
        recordIds.push(id);
        afterParts[id] = stripLayout(row);
      } else if (canonicalize(stripLayout(prev)) !== canonicalize(stripLayout(row))) {
        updated += 1;
        recordIds.push(id);
        beforeParts[id] = stripLayout(prev);
        afterParts[id] = stripLayout(row);
      }
    }
    for (const [id, row] of left) {
      if (!right.has(id)) {
        deleted += 1;
        recordIds.push(id);
        beforeParts[id] = stripLayout(row);
      }
    }
  }
  const kind: EditEventKind = deleted && !created && !updated ? 'delete' : created && !updated && !deleted ? 'create' : 'update';
  const summary = `Muutos: +${created} / ~${updated} / -${deleted} tietuetta.`;
  return { kind, summary, recordIds: [...new Set(recordIds)], before: beforeParts, after: afterParts };
}

function allRecordIds(model: Workspace): string[] {
  return CONTENT_COLLECTIONS.flatMap(key => (model[key] as { id: string }[]).map(item => item.id));
}

function summariseWorkspace(model: Workspace) {
  return {
    schemaVersion: model.schemaVersion,
    project: model.project,
    counts: Object.fromEntries(CONTENT_COLLECTIONS.map(key => [key, model[key].length]))
  };
}

function hydrateEditEntry(value: unknown): EditLogEntry {
  const item = isObj(value) ? value : {};
  const kind = eventKinds.includes(item.kind as EditEventKind) ? item.kind as EditEventKind : 'other';
  return {
    id: str(item.id),
    at: str(item.at),
    kind,
    summary: str(item.summary),
    reason: str(item.reason),
    actorLabel: str(item.actorLabel),
    recordIds: Array.isArray(item.recordIds) ? item.recordIds.filter((id): id is string => typeof id === 'string') : [],
    before: item.before ?? null,
    after: item.after ?? null,
    reversesEventId: str(item.reversesEventId),
    note: str(item.note)
  };
}

function stripKey(value: unknown, key: string): unknown {
  if (Array.isArray(value)) return value.map(item => stripKey(item, key));
  if (!isObj(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === key) continue;
    out[k] = stripKey(v, key);
  }
  return out;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const mapped = value.map(sortValue);
    if (mapped.every(item => isObj(item) && typeof item.id === 'string')) {
      return [...mapped].sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id)));
    }
    return mapped;
  }
  if (!isObj(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key]);
  return out;
}

function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}
