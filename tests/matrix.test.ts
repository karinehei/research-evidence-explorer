import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csv, load, locate, validate } from '../src/model.ts';
import {
  buildArgumentView, buildCriterionRows, buildSourceRows, emptyFilters, exportMatrixBundle,
  filterCriterionRows
} from '../src/matrix.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));

test('a criterion row follows a source claim locator and marks conceptual ancestry', () => {
  const support = buildCriterionRows(model).find(row => row.criterion.id === 'support');
  assert.ok(support);
  const ragas = support.claims.find(claim => claim.sourceId === 'ragas24');
  assert.ok(ragas);
  assert.equal(ragas.claimId, 'claim_ragas24');
  assert.match(ragas.locator, /C1|Corrected source/i);
  assert.equal(ragas.chainKind, 'conceptual-ancestry');
  assert.equal(ragas.pathLabels.includes('RAGAs 2024'), true);
  assert.equal(ragas.pathLabels.includes(support.criterion.label), true);
  assert.ok(support.adaptations.some(link => link.epistemicStatus === 'adaptation' || link.meaning === 'operationalises'));
  assert.doesNotMatch(ragas.chainKind, /empirical/);
});

test('adaptation steps stay visible beside competing definitions and blank cells stay not recorded', () => {
  const ranking = buildCriterionRows(model).find(row => row.criterion.id === 'ranking');
  assert.ok(ranking);
  assert.ok(ranking.adaptations.some(link => link.meaning === 'operationalises' || link.epistemicStatus === 'adaptation'));
  assert.equal(ranking.criterion.assessor, '');
  assert.equal(ranking.criterion.decisionRule, '');
  const copy = JSON.parse(JSON.stringify(model));
  const retrieval = copy.constructs.find((item: { id: string }) => item.id === 'retrieval');
  retrieval.competingDefinitions = 'Vaihtoehtoinen relevanssin rajaus säilytetään.';
  const withCompeting = buildCriterionRows(validate(copy)).find(row => row.criterion.id === 'ranking');
  assert.ok(withCompeting?.competingDefinitions.some(text => text.includes('Vaihtoehtoinen relevanssin rajaus')));
});

test('missing construct and claim references are flagged for checking', () => {
  const copy = JSON.parse(JSON.stringify(model));
  copy.criteria.find((item: { id: string }) => item.id === 'ranking').constructIds.push('missing_construct');
  copy.relationships.find((item: { id: string }) => item.id === 'e_6').claimIds = ['missing_claim'];
  const rows = buildCriterionRows(copy);
  const ranking = rows.find(row => row.criterion.id === 'ranking');
  const support = rows.find(row => row.criterion.id === 'support');
  assert.deepEqual(ranking?.missingConstructIds, ['missing_construct']);
  assert.ok(support?.claims.some(claim => claim.missing && claim.claimId === 'missing_claim'));
});

test('filters and matrix export keep stable ids with relationship and claim provenance', () => {
  const filtered = filterCriterionRows(buildCriterionRows(model), { ...emptyFilters(), constructId: 'groundedness' });
  assert.ok(filtered.every(row => row.criterion.constructIds.includes('groundedness')));
  const bundle = exportMatrixBundle(model, {
    orientation: 'criterion',
    filters: { ...emptyFilters(), constructId: 'groundedness' },
    selectedId: 'support'
  });
  assert.equal(bundle.exportType, 'research-matrix');
  assert.equal(bundle.selectedId, 'support');
  assert.equal(bundle.filters.constructId, 'groundedness');
  assert.ok(bundle.claims.some(claim => claim.id === 'claim_ragas24'));
  assert.ok(bundle.relationships.some(link => link.id === 'e_6' && link.meaning === 'motivates' && link.claimIds.includes('claim_ragas24')));
  assert.match(bundle.blankCellPolicy, /not recorded|Ei kirjattu|research gap/i);
  const text = csv(model);
  assert.match(text, /meaning/);
  assert.match(text, /claimIds/);
  assert.match(text, /sourceIds/);
  assert.match(text, /motivates/);
  assert.match(text, /claim_ragas24/);
});

test('source rows do not rank roles and argument view handles missing decision records', () => {
  const sources = buildSourceRows(model);
  assert.ok(sources.every(row => row.researchRole === 'not-recorded'));
  const ragas = sources.find(row => row.source.id === 'ragas24');
  assert.ok(ragas?.appearances.some(item => item.criterionId === 'support'));
  assert.equal(buildArgumentView(model, 'missing_decision'), null);
  const argument = buildArgumentView(model, 'decision_schema1_import');
  assert.ok(argument);
  assert.equal(argument.decision.id, 'decision_schema1_import');
  assert.deepEqual(argument.missingRecordIds, []);
  const broken = JSON.parse(JSON.stringify(model));
  broken.decisions[0].recordIds = ['missing_record', 'claim_ragas24'];
  const withMissing = buildArgumentView(broken, 'decision_schema1_import');
  assert.deepEqual(withMissing?.missingRecordIds, ['missing_record']);
  assert.ok(withMissing?.relatedClaims.some(claim => claim.claimId === 'claim_ragas24'));
});

test('matrix selection ids resolve in the shared locator used by graph and inspector', () => {
  const support = buildCriterionRows(model).find(row => row.criterion.id === 'support');
  const claimId = support?.claims.find(claim => claim.sourceId === 'ragas24')?.claimId;
  assert.equal(locate(model, 'support')?.kind, 'criterion');
  assert.equal(locate(model, claimId || '')?.kind, 'claim');
  assert.equal(locate(model, 'ragas24')?.kind, 'source');
  assert.equal(locate(model, 'e_6')?.kind, 'relationship');
});
