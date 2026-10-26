import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, locate, validate } from '../src/model.ts';
import { buildCriterionRows, filterCriterionRows, emptyFilters } from '../src/matrix.ts';
import { createSnapshot, prepareCommit, prepareUndo, previewImport, workspaceFromIncoming } from '../src/snapshots.ts';
import { buildFigureBundle } from '../src/figures.ts';
import { clone, newId } from '../src/edit.ts';
import type { Workspace } from '../src/types.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const seed = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8'))) as Workspace;

test('curated open → claim edit → justified relationship → matrix → case → proposition → snapshot/undo/SVG', async () => {
  let model = clone(seed);
  assert.equal(model.schemaVersion, 2);
  assert.ok(model.sources.length >= 1);
  assert.ok(locate(model, 'sufficiency'));

  const claim = model.claims.find(item => item.sourceId === 'blueprint24') || model.claims[0];
  assert.ok(claim, 'seed has a source claim to edit');
  const claimBefore = claim.statement;
  model = prepareCommit(model, (() => {
    const next = clone(model);
    const row = next.claims.find(item => item.id === claim.id)!;
    row.statement = `${row.statement} [journey-edit]`.trim();
    row.locator = row.locator || 'journey-locator';
    row.appraisal = 'not-appraised';
    return next;
  })(), { reason: 'Muokattiin lähdeväitettä', kind: 'update' });
  assert.match(model.claims.find(item => item.id === claim.id)!.statement, /journey-edit/);
  assert.notEqual(model.claims.find(item => item.id === claim.id)!.statement, claimBefore);

  const relId = newId(model, 'e');
  model = prepareCommit(model, (() => {
    const next = clone(model);
    next.relationships.push({
      id: relId,
      meaning: 'motivates',
      source: claim.sourceId,
      target: 'sufficiency',
      label: 'journey justified link',
      rationale: 'Explicit meaning chosen in journey test',
      locator: 'journey-rel-locator',
      claimIds: [claim.id],
      sourceIds: [],
      epistemicStatus: 'adaptation',
      reviewState: 'proposed',
      reviewNote: ''
    });
    return next;
  })(), { reason: 'Lisättiin perusteltu yhteys', kind: 'create' });
  const edge = model.relationships.find(item => item.id === relId)!;
  assert.equal(edge.epistemicStatus, 'adaptation');
  assert.equal(edge.reviewState, 'proposed');
  assert.ok(edge.claimIds.includes(claim.id));

  const matrixRows = filterCriterionRows(buildCriterionRows(model), emptyFilters());
  assert.ok(matrixRows.some(row => row.constructs.some(item => item.id === 'sufficiency')), 'matrix still exposes the sufficiency construct');
  assert.ok(
    model.relationships.some(item => item.id === relId && item.target === 'sufficiency'),
    'new justified relationship remains in the workspace the matrix reads'
  );

  const caseA = model.cases.find(item => item.id === 'A');
  assert.ok(caseA);
  model = prepareCommit(model, (() => {
    const next = clone(model);
    const row = next.cases.find(item => item.id === 'A')!;
    row.taskReference = {
      ...row.taskReference,
      statement: `${row.taskReference.statement} [case-edit]`
    };
    row.kind = 'constructed';
    return next;
  })(), { reason: 'Muokattiin rakennettua tapausta', kind: 'update' });
  assert.match(model.cases.find(item => item.id === 'A')!.taskReference.statement, /case-edit/);

  const proposition = model.propositions.find(item => item.id === 'p1');
  assert.ok(proposition);
  const protocol = model.protocols.find(item => item.propositionIds.includes('p1') || proposition!.protocolIds.includes(item.id))
    || model.protocols[0];
  assert.ok(protocol);
  assert.equal(protocol.dimensions.length, 5);

  const beforeUndo = clone(model);
  const snapshot = await createSnapshot(model);
  assert.match(snapshot.contentHash, /^sha256:/);
  assert.equal(snapshot.workspace.schemaVersion, 2);
  const preview = previewImport(seed, snapshot);
  assert.equal(preview.ok, true);
  const roundTrip = load(workspaceFromIncoming(snapshot)) as Workspace;
  assert.ok(roundTrip.relationships.some(item => item.id === relId));

  const undone = validate(prepareUndo(model, seed, {
    reason: 'Journey undo to curated seed',
    actorLabel: 'journey-test'
  })) as Workspace;
  assert.ok(undone.editLog.some(event => event.kind === 'undo' || event.reversesEventId));
  assert.equal(undone.claims.find(item => item.id === claim.id)?.statement, seed.claims.find(item => item.id === claim.id)?.statement);

  const restored = beforeUndo;
  const figure = await buildFigureBundle(restored, {
    mode: 'browser-layout',
    preset: 'justification',
    focusId: 'sufficiency',
    snapshotContentHash: snapshot.contentHash
  });
  assert.ok(figure.svg);
  assert.match(figure.svg!, /<svg/);
  assert.doesNotMatch(figure.svg!, /<foreignObject\b/i);
  assert.ok(figure.manifest.relationships.every(item => item.epistemicStatus));
});
