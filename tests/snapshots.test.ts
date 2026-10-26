import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, migrate, validate } from '../src/model.ts';
import { clone } from '../src/edit.ts';
import {
  CANONICALISATION_PROCEDURE, HASH_DISCLAIMER, applySnapshotImport, compareSnapshots,
  contentHash, createSnapshot, layoutHash, prepareCommit, prepareUndo, previewImport,
  scientificContent
} from '../src/snapshots.ts';
import { projectPublishedSeed } from '../src/publish.ts';
import type { Workspace } from '../src/types.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const seed = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8'))) as Workspace;
const schema1 = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/schema1-seed.json'), 'utf8'));

test('content hash is stable, layout-independent and documented as non-validating', async () => {
  const a = validate(clone(seed)) as Workspace;
  const b = clone(a);
  b.sources[0].position = { x: 1234, y: 5678 };
  assert.equal(await contentHash(a), await contentHash(b));
  assert.notEqual(await layoutHash(a), await layoutHash(b));
  const again = await contentHash(a);
  assert.match(again, /^sha256:[a-f0-9]{64}$/);
  assert.match(CANONICALISATION_PROCEDURE, /SHA-256/);
  assert.match(HASH_DISCLAIMER, /ei validoi tutkimusta/i);
});

test('scientific content keeps decisions and omits history, revisions and legacy', async () => {
  const withHistory = validate(clone(seed)) as Workspace;
  withHistory.editLog = [{
    id: 'evt_test',
    at: '2026-10-26T00:00:00.000Z',
    kind: 'update',
    summary: 'test',
    reason: 'test',
    actorLabel: 'local-actor',
    recordIds: ['sufficiency'],
    before: null,
    after: null,
    reversesEventId: '',
    note: 'browser-local'
  }];
  withHistory.recordRevisions = [{ recordId: 'sufficiency', revision: 3 }];
  assert.ok(withHistory.legacy || withHistory.decisions.length >= 1);
  const scientific = scientificContent(withHistory);
  assert.equal('editLog' in scientific, false);
  assert.equal('recordRevisions' in scientific, false);
  assert.equal('legacy' in scientific, false);
  assert.ok(Array.isArray(scientific.decisions));
  assert.equal(scientific.decisions.length, withHistory.decisions.length);
  assert.equal(scientific.sources.length, withHistory.sources.length);
  assert.equal(await contentHash(withHistory), await contentHash(seed));
});

test('published-seed projection clears history and keeps the decision record', () => {
  const withHistory = validate(clone(seed)) as Workspace;
  withHistory.editLog = [{
    id: 'evt_publish',
    at: '2026-10-26T00:00:00.000Z',
    kind: 'update',
    summary: 'local',
    reason: 'local',
    actorLabel: 'must-not-publish',
    recordIds: [],
    before: null,
    after: null,
    reversesEventId: '',
    note: ''
  }];
  withHistory.recordRevisions = [{ recordId: 'sufficiency', revision: 9 }];
  const projection = projectPublishedSeed(withHistory);
  assert.deepEqual(projection.workspace.editLog, []);
  assert.deepEqual(projection.workspace.recordRevisions, []);
  assert.equal(projection.workspace.decisions.length, withHistory.decisions.length);
  assert.ok(projection.workspace.decisions.some(item => item.id === 'decision_schema1_import'));
  assert.equal(withHistory.editLog.length, 1);
  assert.ok(projection.excludedAutomatically.some(item => /localStorage/i.test(item)));
  assert.ok(projection.retainedForReview.some(item => /decision/i.test(item)));
});

test('snapshot export/import round-trips without loss of relationships', async () => {
  const snapshot = await createSnapshot(seed);
  assert.equal(snapshot.exportType, 'research-snapshot');
  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.canonicalisation.hashValidatesResearch, false);
  assert.equal(snapshot.contentHash, await contentHash(seed));
  const result = applySnapshotImport(seed, snapshot);
  assert.equal(result.ok, true);
  assert.equal(result.model.relationships.length, seed.relationships.length);
  assert.deepEqual(
    result.model.relationships.map(item => item.id).sort(),
    seed.relationships.map(item => item.id).sort()
  );
  assert.equal(await contentHash(result.model), snapshot.contentHash);
  assert.ok(result.model.editLog.some(entry => entry.kind === 'import'));
});

test('failed import preserves the last valid workspace', () => {
  const current = validate(clone(seed));
  const broken = previewImport(current, { schemaVersion: 2, not: 'a workspace' });
  assert.equal(broken.ok, false);
  const applied = applySnapshotImport(current, { schemaVersion: 99 });
  assert.equal(applied.ok, false);
  assert.equal(applied.model, current);
  assert.equal(JSON.stringify(current.relationships), JSON.stringify(seed.relationships));
});

test('prepareCommit and prepareUndo keep append-only history with inspectable undo', () => {
  const base = validate(clone(seed));
  const edited = clone(base);
  edited.constructs = edited.constructs.map(item => item.id === 'sufficiency'
    ? { ...item, definition: item.definition + ' [luonnosmuutos]' }
    : item);
  const committed = validate(prepareCommit(base, edited, { reason: 'Testimuutos', actorLabel: '' }));
  assert.ok(committed.editLog.length >= 1);
  const last = committed.editLog[committed.editLog.length - 1];
  assert.equal(last.kind, 'update');
  assert.ok(last.recordIds.includes('sufficiency'));
  assert.match(String(last.after && (last.after as Record<string, { definition?: string }>).sufficiency?.definition || ''), /luonnosmuutos/);
  const undone = validate(prepareUndo(committed, base, { reason: 'Testikumous' }));
  assert.equal(undone.constructs.find(item => item.id === 'sufficiency')?.definition, base.constructs.find(item => item.id === 'sufficiency')?.definition);
  const undoEvent = undone.editLog[undone.editLog.length - 1];
  assert.equal(undoEvent.kind, 'undo');
  assert.equal(undoEvent.reversesEventId, last.id);
  assert.ok(undone.editLog.some(entry => entry.id === last.id), 'reversed event remains inspectable');
});

test('snapshot comparison highlights definition, criterion, evidence and proposition wording', async () => {
  const left = validate(clone(seed));
  const right = clone(left);
  right.constructs = right.constructs.map(item => item.id === 'sufficiency' ? { ...item, definition: 'Muuttunut määritelmä' } : item);
  right.criteria = right.criteria.map(item => item.id === 'expert' ? { ...item, evidenceRequirements: 'Muuttunut kriteeri' } : item);
  right.claims = right.claims.map((item, index) => index === 0 ? { ...item, statement: 'Muuttunut väite' } : item);
  right.propositions = right.propositions.map(item => item.id === 'p1' ? { ...item, statement: 'Muuttunut propositio' } : item);
  const comparison = await compareSnapshots(left, validate(right));
  assert.equal(comparison.contentHashEqual, false);
  assert.ok(comparison.changedDefinitions.some(item => item.id === 'sufficiency'));
  assert.ok(comparison.changedCriteria.some(item => item.id === 'expert'));
  assert.ok(comparison.changedEvidenceLinks.length >= 1);
  assert.ok(comparison.changedPropositions.some(item => item.id === 'p1'));
});

test('schema 1 migration keeps relationship integrity through snapshot hashing', async () => {
  const migrated = migrate(schema1);
  assert.ok(migrated.relationships.length > 0);
  for (const rel of migrated.relationships) {
    const ids = new Set([...migrated.sources, ...migrated.constructs, ...migrated.criteria, ...migrated.propositions].map(item => item.id));
    assert.ok(ids.has(rel.source));
    assert.ok(ids.has(rel.target));
  }
  const snapshot = await createSnapshot(migrated);
  const round = applySnapshotImport(migrated, snapshot);
  assert.equal(round.ok, true);
  assert.equal(round.model.relationships.length, migrated.relationships.length);
  assert.equal(await contentHash(round.model), snapshot.contentHash);
});
