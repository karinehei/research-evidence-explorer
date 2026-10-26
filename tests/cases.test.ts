import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CASE_VIEW_DISCLAIMER, exportConstructedCase, hydrateConstructedCase, layerCoverage,
  missingEssentialFacets
} from '../src/cases.ts';
import { load, validate } from '../src/model.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));

test('case A keeps supported claim with incomplete task answer and separate coverage layers', () => {
  const item = model.cases.find(entry => entry.id === 'A');
  assert.ok(item);
  assert.equal(item.kind, 'constructed');
  assert.equal(item.analyticLabel, 'constructed-analytical-example');
  const collection = layerCoverage(item.facets, 'collection');
  const context = layerCoverage(item.facets, 'context');
  const answer = layerCoverage(item.facets, 'answer');
  assert.equal(collection.fullRatioLabel, '3/3');
  assert.equal(context.fullRatioLabel, '1/3');
  assert.equal(answer.fullRatioLabel, '1/3');
  assert.ok(missingEssentialFacets(item.facets).some(facet => facet.id === 'A_f2'));
  assert.equal(item.claimAnnotations[0]?.support, 'full');
  assert.match(item.claimAnnotations[0]?.reason || '', /tuettu \(S\)/i);
  assert.match(item.facets.find(facet => facet.id === 'A_f2')?.reason || '', /kokoelman ja kontekstin/i);
  assert.doesNotMatch(item.boundary, /kliinisen turvallisuuden piste/i);
});

test('case B shares claim support across display variants and leaves verification unmeasured', () => {
  const item = model.cases.find(entry => entry.id === 'B');
  assert.ok(item);
  assert.equal(item.answerVariants.length, 2);
  assert.equal(item.displayConditions.length, 2);
  assert.ok(item.displayConditions.some(display => display.passageLocatorVisible === false));
  assert.ok(item.displayConditions.some(display => display.passageLocatorVisible === true));
  const claim = item.claimAnnotations.find(entry => entry.id === 'B_claim');
  assert.equal(claim?.support, 'full');
  assert.deepEqual(claim?.answerVariantIds.sort(), ['B_ans_doc', 'B_ans_pass']);
  assert.equal(item.unmeasured.verificationSuccess, 'not-measured');
  assert.equal(item.unmeasured.verificationTime, 'not-measured');
  assert.equal(item.unmeasured.expertRatings, 'not-measured');
});

test('case C separates historical support from present-time task and source audit', () => {
  const item = model.cases.find(entry => entry.id === 'C');
  assert.ok(item);
  assert.deepEqual(item.taskReference.acceptableSourceVersionIds, ['C_d3_2026']);
  assert.ok(item.sourceSnapshots.some(snap => snap.id === 'C_d3_2024' && snap.version === '2024'));
  assert.ok(item.sourceSnapshots.some(snap => snap.id === 'C_d3_2026' && snap.version === '2026'));
  assert.equal(item.claimAnnotations.find(entry => entry.id === 'C_claim_a3a')?.support, 'full');
  assert.equal(item.claimAnnotations.find(entry => entry.id === 'C_claim_a3b')?.support, 'absent');
  assert.match(item.taskReference.temporalScope, /Nykyhetki/i);
  assert.match(item.boundary, /kliinisestä turvallisuudesta/i);
});

test('coverage ratio policy never treats partial as full and export keeps constructed label', () => {
  const item = model.cases.find(entry => entry.id === 'A')!;
  const context = layerCoverage(item.facets, 'context');
  assert.equal(context.counts.full, 1);
  assert.equal(context.counts.absent, 2);
  assert.match(context.policy, /Nimittäjä/);
  assert.match(CASE_VIEW_DISCLAIMER, /ei ole validoitu kausaalimalli/i);
  const bundle = exportConstructedCase(model, 'B');
  assert.equal(bundle?.exportType, 'constructed-analytical-case');
  assert.equal(bundle?.analyticLabel, 'constructed-analytical-example');
  assert.equal(bundle?.constructedAnalyticalExample, true);
  assert.equal(bundle?.case.id, 'B');
  assert.ok(bundle?.case.answerVariants.length === 2);
});

test('legacy flat cases hydrate and remain constructed; empirical kind stays rejected', () => {
  const flat = hydrateConstructedCase({
    id: 'legacy_case',
    kind: 'constructed',
    title: 'Legacy',
    task: 'Task',
    columns: ['A'],
    rows: [['1']],
    interpretation: '',
    boundary: '',
    basis: '',
    propositionIds: [],
    criterionIds: [],
    decisionIds: []
  });
  assert.equal(flat.analyticLabel, 'constructed-analytical-example');
  assert.equal(flat.unmeasured.expertRatings, 'not-measured');
  const copy = JSON.parse(JSON.stringify(model));
  copy.cases = [flat];
  assert.equal(validate(copy).cases[0].facets.length, 0);
  const empirical = JSON.parse(JSON.stringify(model));
  empirical.cases[0].kind = 'empirical';
  assert.throws(() => validate(empirical), /rakennetuksi|empiirinen/i);
});

test('editing a facet and source version round-trips through validate', () => {
  const copy = JSON.parse(JSON.stringify(model));
  const item = copy.cases.find((entry: { id: string }) => entry.id === 'A');
  item.facets.find((facet: { id: string }) => facet.id === 'A_f2').context = 'partial';
  item.facets.find((facet: { id: string }) => facet.id === 'A_f2').reason = 'Muokattu: konteksti osittainen.';
  item.sourceSnapshots[0].version = 'constructed-v2';
  const next = validate(copy);
  const saved = next.cases.find(entry => entry.id === 'A')!;
  assert.equal(saved.facets.find(facet => facet.id === 'A_f2')?.context, 'partial');
  assert.equal(saved.sourceSnapshots[0].version, 'constructed-v2');
  assert.equal(saved.analyticLabel, 'constructed-analytical-example');
});
