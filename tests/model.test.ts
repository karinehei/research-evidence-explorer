import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../src/model.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixturePath = path.join(__dirname, 'fixtures/schema1-seed.json');
const exportPath = path.join(__dirname, 'fixtures/schema1-export.json');
const seedPath = path.join(__dirname, '../data/research.json');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const schema1 = () => read(fixturePath);
const live = () => read(seedPath);

test('schema 2 seed round-trips and keeps the selected record counts', () => {
  const d = M.validate(live());
  assert.equal(d.schemaVersion, 2);
  assert.equal(d.sources.length, 11);
  assert.equal(d.claims.length, 11);
  assert.equal(d.constructs.length, 9);
  assert.equal(d.criteria.length, 7);
  assert.equal(d.relationships.length, 32);
  assert.equal(d.propositions.length, 4);
  assert.deepEqual(d.cases.map(c => c.id), ['A', 'B', 'C']);
  assert.equal(d.criteria.filter(c => c.id === 'expert').length, 1);
  assert.ok(d.cases.every(c => c.kind === 'constructed'));
  assert.deepEqual(M.validate(d), d);
});

test('migration preserves schema 1 content and stores the original import', () => {
  const raw = schema1();
  const before = JSON.stringify(raw);
  const migrated = M.migrate(raw);
  assert.equal(JSON.stringify(raw), before);
  assert.deepEqual(migrated, M.migrate(raw));
  assert.deepEqual(migrated.legacy.document, M.validateLegacy(raw));
  assert.equal(migrated.legacy.preservedBeforeReplacement, true);
  for (const node of raw.nodes) {
    if (node.kind === 'source') {
      const source = migrated.sources.find(s => s.id === node.id);
      const claim = migrated.claims.find(c => c.id === 'claim_' + node.id);
      assert.equal(source.label, node.label);
      assert.equal(source.citation, node.label);
      assert.equal(source.year, '');
      assert.equal(source.publicationStatus, 'not-recorded');
      assert.equal(source.access, node.access);
      assert.equal(source.notes, node.notes);
      assert.equal(source.url, node.url);
      assert.equal(claim.statement, node.description);
      assert.equal(claim.limitations, node.boundary);
      assert.equal(claim.locator, node.locator);
      assert.equal(claim.basis, node.basis);
      assert.equal(claim.provenance, 'imported-summary');
      assert.equal(claim.appraisal, 'not-appraised');
      assert.equal(claim.epistemicStatus, 'reported');
      assert.equal(claim.reviewState, 'imported');
      assert.equal(claim.notes, '');
    }
    if (node.kind === 'concept') {
      const construct = migrated.constructs.find(c => c.id === node.id);
      assert.equal(construct.definition, node.description);
      assert.equal(construct.boundary, node.boundary);
      assert.equal(construct.unit, node.unit);
      assert.equal(construct.notes, node.notes);
      assert.equal(construct.object, '');
      assert.equal(construct.competingDefinitions, '');
    }
    if (node.kind === 'criterion') {
      const criterion = migrated.criteria.find(c => c.id === node.id);
      assert.equal(criterion.evidenceRequirements, node.description);
      assert.equal(criterion.permittedInference, node.boundary);
      assert.equal(criterion.assessor, '');
      assert.equal(criterion.decisionRule, '');
    }
    if (node.kind === 'question') {
      const proposition = migrated.propositions.find(p => p.id === node.id);
      assert.equal(proposition.statement, node.description);
      assert.equal(proposition.boundary, node.boundary);
    }
  }
  for (const edge of raw.edges) {
    const relationship = migrated.relationships.find(r => r.id === edge.id);
    assert.equal(relationship.source, edge.source);
    assert.equal(relationship.target, edge.target);
    assert.equal(relationship.label, edge.label);
    assert.equal(relationship.rationale, edge.rationale);
    assert.equal(relationship.locator, edge.locator);
    assert.equal(relationship.meaning, edge.relation);
    assert.equal(relationship.reviewState, 'imported');
  }
  for (const item of raw.cases) {
    const kept = migrated.cases.find(c => c.id === item.id);
    for (const key of ['title', 'task', 'interpretation', 'boundary', 'basis', 'kind', 'columns', 'rows']) assert.deepEqual(kept[key], item[key]);
    assert.deepEqual(kept.propositionIds, []);
  }
  const liveCopy = JSON.parse(JSON.stringify(migrated));
  delete liveCopy.legacy;
  const serialised = JSON.stringify(liveCopy);
  assert.equal(serialised.includes('"literature"'), false);
  assert.equal(serialised.includes('"primary-inspection"'), false);
  assert.equal(serialised.includes('"verified"'), false);
  const fullText = migrated.sources.find(s => s.id === 'saukkoriipi26');
  const fullTextClaim = migrated.claims.find(c => c.sourceId === 'saukkoriipi26');
  assert.equal(fullText.access, 'reported-full-text');
  assert.equal(fullText.publicationStatus, 'not-recorded');
  assert.equal(fullTextClaim.provenance, 'imported-summary');
  assert.equal(fullTextClaim.appraisal, 'not-appraised');
  assert.ok(migrated.sources.every(s => s.publicationStatus === 'not-recorded'));
  assert.ok(migrated.sources.filter(s => s.doi).every(s => s.url.includes(s.doi)));
});

test('a schema 1 export keeps notes, layout and the imported summary', () => {
  const exported = read(exportPath);
  const migrated = M.migrate(exported);
  const source = migrated.sources.find(s => s.id === exported.nodes[0].id);
  const claim = migrated.claims.find(c => c.sourceId === source.id);
  assert.equal(source.notes, 'Vientitarkistus: muistiinpano säilyy');
  assert.deepEqual(source.position, { x: 40, y: 80 });
  assert.equal(migrated.relationships[0].label, 'vientitarkistuksen yhteys');
  assert.equal(claim.statement, exported.nodes[0].description);
  assert.equal(claim.provenance, 'imported-summary');
  assert.equal(migrated.legacy.document.nodes[0].notes, source.notes);
});

test('loading schema 2 does not nest another legacy copy', () => {
  const once = M.load(schema1());
  const twice = M.load(once);
  assert.deepEqual(twice, once);
  assert.equal(twice.legacy.document.schemaVersion, 1);
  assert.equal(twice.legacy.document.nodes.length, schema1().nodes.length);
});

test('unsupported versions and failed imports leave the current workspace untouched', () => {
  const current = M.load(schema1());
  current.project.name = 'sentinel';
  for (const version of [3, 9]) {
    const incoming = { schemaVersion: version, project: { name: 'replacement' } };
    const result = M.applyImport(current, incoming);
    assert.equal(result.ok, false);
    assert.equal(result.model, current);
    assert.match(result.error, /ei ole tuettu/);
    assert.equal(current.project.name, 'sentinel');
    assert.equal(incoming.schemaVersion, version);
    assert.throws(() => M.load(incoming), /ei ole tuettu/);
  }
});

test('duplicate ids, dangling references and malformed records roll back', () => {
  const current = M.load(schema1());
  current.project.name = 'sentinel';
  const reject = incoming => {
    const result = M.applyImport(current, incoming);
    assert.equal(result.ok, false);
    assert.equal(result.model, current);
    assert.equal(current.project.name, 'sentinel');
    assert.throws(() => M.validate(incoming));
  };
  const duplicate = M.load(schema1());
  duplicate.claims[0].id = duplicate.sources[0].id;
  reject(duplicate);
  const dangling = M.load(schema1());
  dangling.relationships[0].target = 'absent';
  reject(dangling);
  const missingClaim = M.load(schema1());
  missingClaim.claims[0].sourceId = 'absent';
  reject(missingClaim);
  const missingConstruct = M.load(schema1());
  missingConstruct.criteria[0].constructIds = ['absent'];
  reject(missingConstruct);
  const emptyLabel = M.load(schema1());
  emptyLabel.sources[0].label = ' ';
  reject(emptyLabel);
  const verified = M.load(schema1());
  verified.claims[0].epistemicStatus = 'verified';
  reject(verified);
  const empirical = M.load(schema1());
  empirical.cases[0].kind = 'empirical';
  reject(empirical);
  const script = M.load(schema1());
  script.sources[0].url = 'javascript:alert(1)';
  reject(script);
  const coordinates = M.load(schema1());
  coordinates.sources[0].position = { x: Infinity, y: 1 };
  reject(coordinates);
  const oversized = M.load(schema1());
  oversized.sources[0].notes = 'x'.repeat(8001);
  reject(oversized);
});

test('a claim id that collides with an existing id stops migration without changing the input', () => {
  const raw = schema1();
  const concept = raw.nodes.find(n => n.kind === 'concept');
  raw.nodes.push({ ...concept, id: 'claim_' + raw.nodes[0].id, label: 'Törmäys' });
  const before = JSON.stringify(raw);
  assert.throws(() => M.migrate(raw), /törmäystä/);
  assert.equal(JSON.stringify(raw), before);
});

test('version links must exist and cannot cycle', () => {
  const missing = M.load(schema1());
  missing.sources[1].versionOf = 'absent';
  assert.throws(() => M.validate(missing));
  const self = M.load(schema1());
  self.sources[0].versionOf = self.sources[0].id;
  assert.throws(() => M.validate(self));
  const cycle = M.load(schema1());
  cycle.sources[0].versionOf = cycle.sources[1].id;
  cycle.sources[1].versionOf = cycle.sources[0].id;
  assert.throws(() => M.validate(cycle));
});

test('removal clears references, keeps the source model, and refuses the last graph record', () => {
  const model = M.load(schema1());
  const snapshot = JSON.stringify(model);
  const sourcePlan = M.planRemoval(model, 'jarvelin15');
  assert.equal(JSON.stringify(model), snapshot);
  assert.equal(sourcePlan.needsConfirmation, true);
  assert.equal(sourcePlan.model.sources.some(s => s.id === 'jarvelin15'), false);
  assert.equal(sourcePlan.model.claims.some(c => c.sourceId === 'jarvelin15' || c.id === 'claim_jarvelin15'), false);
  assert.equal(sourcePlan.model.relationships.some(r => r.source === 'jarvelin15' || r.target === 'jarvelin15' || r.claimIds.includes('claim_jarvelin15') || r.sourceIds.includes('jarvelin15')), false);
  assert.doesNotThrow(() => M.validate(sourcePlan.model));
  const criterion = model.criteria.find(c => c.constructIds.length === 1);
  const constructPlan = M.planRemoval(model, criterion.constructIds[0]);
  const updated = constructPlan.model.criteria.find(c => c.id === criterion.id);
  assert.deepEqual(updated.constructIds, []);
  assert.match(updated.validationNeed, /Käsiteviite poistettiin/);
  assert.equal(constructPlan.needsConfirmation, true);
  assert.doesNotThrow(() => M.validate(constructPlan.model));
  const only = M.validate({
    schemaVersion: 2,
    project: { name: 'Test', description: '' },
    sources: [], claims: [], criteria: [], relationships: [], propositions: [], cases: [], decisions: [],
    constructs: [{ id: 'only', label: 'Only', definition: '', object: '', unit: '', scope: '', competingDefinitions: '', boundary: '', epistemicStatus: 'adaptation', reviewState: 'proposed', basis: '', locator: '', notes: '' }]
  });
  assert.throws(() => M.planRemoval(only, 'only'), /Viimeistä kohdetta/);
  assert.equal(only.constructs.length, 1);
});

test('a user-created relationship stays proposed until it is explicitly reviewed', () => {
  assert.equal(M.relationshipDraft({ id: 'e_new', source: 'a', target: 'b', reviewState: 'imported' }).reviewState, 'proposed');
  assert.equal(M.relationshipDraft({ id: 'e_new', source: 'a', target: 'b' }).reviewState, 'proposed');
  assert.equal(M.relationshipDraft({ id: 'e_new', source: 'a', target: 'b', reviewState: 'reviewed' }).reviewState, 'reviewed');
});

test('directed trace and neighbourhood follow relationships without treating a later hop as adjacent', () => {
  const d = M.load(schema1());
  assert.deepEqual(M.path(d, 'blueprint24', 'p1').nodes, ['blueprint24', 'sufficiency', 'facets', 'p1']);
  assert.equal(M.path(d, 'p1', 'blueprint24'), null);
  d.relationships.push({ ...d.relationships[0], id: 'cycle', source: 'p1', target: 'blueprint24' });
  assert.equal(M.path(d, 'blueprint24', 'absent'), null);
  assert.ok(M.path(d, 'p1', 'ranking'));
  const neighbourhood = M.neighbourhood(M.load(schema1()), 'sufficiency');
  assert.ok(neighbourhood.nodes.has('blueprint24'));
  assert.ok(neighbourhood.nodes.has('facets'));
  assert.equal(neighbourhood.nodes.has('p1'), false);
});

test('CSV and DOT keep the new distinctions and the previous escaping rules', () => {
  const d = M.load(schema1());
  d.sources[0].notes = '=2+2';
  d.sources[0].label = 'A "quote"\nand newline';
  const csv = M.csv(d);
  assert.ok(csv.includes('"\'=2+2"'));
  assert.ok(csv.includes('"A ""quote""\nand newline"'));
  assert.ok(csv.includes('imported-summary'));
  assert.ok(csv.includes('not-recorded'));
  const dot = M.dot(d, new Set(['facets', 'p1']));
  assert.ok(dot.includes('"facets" -> "p1"'));
  assert.ok(dot.includes('style="dotted"'));
  assert.equal(dot.includes('"blueprint24"'), false);
});
