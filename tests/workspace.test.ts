import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, validate } from '../src/model.ts';
import { formatHash, parseHash } from '../src/hash.ts';
import { justificationIds } from '../src/graph.ts';
import { formatTrace, traceLimitation } from '../src/trace.ts';
import { requireConnection } from '../src/edit.ts';
import { graphSvg } from '../src/svg.ts';
import { path as tracePath } from '../src/model.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));

test('a claim position is optional and stays inside the existing schema', () => {
  const copy = JSON.parse(JSON.stringify(model));
  assert.equal(copy.claims[0].position, undefined);
  assert.equal(validate(copy).claims[0].id, copy.claims[0].id);
  copy.claims[0].position = { x: 12, y: 24 };
  assert.deepEqual(validate(copy).claims[0].position, { x: 12, y: 24 });
  copy.claims[0].position = { x: 20001, y: 0 };
  assert.throws(() => validate(copy), /sijainti/);
});

test('hash routes keep the view, the full map and the selection', () => {
  assert.deepEqual(parseHash('#graph'), { view: 'graph', scope: 'focus', id: '' });
  assert.deepEqual(parseHash('#graph/sufficiency'), { view: 'graph', scope: 'focus', id: 'sufficiency' });
  assert.deepEqual(parseHash('#graph/focus/sufficiency'), { view: 'graph', scope: 'focus', id: 'sufficiency' });
  assert.deepEqual(parseHash('#map'), { view: 'graph', scope: 'map', id: '' });
  assert.deepEqual(parseHash('#map/sufficiency'), { view: 'graph', scope: 'map', id: 'sufficiency' });
  assert.deepEqual(parseHash('#graph/map/ranking'), { view: 'graph', scope: 'map', id: 'ranking' });
  assert.deepEqual(parseHash('#matrix/ranking'), { view: 'matrix', scope: 'focus', id: 'ranking' });
  assert.deepEqual(parseHash('#cases/A'), { view: 'cases', scope: 'focus', id: 'A' });
  assert.deepEqual(parseHash('#questions/p1'), { view: 'questions', scope: 'focus', id: 'p1' });
  assert.deepEqual(parseHash('#unknown'), { view: 'graph', scope: 'focus', id: '' });
  assert.equal(formatHash('graph', 'sufficiency', 'focus'), '#graph/sufficiency');
  assert.equal(formatHash('graph', 'sufficiency', 'map'), '#map/sufficiency');
  assert.equal(formatHash('matrix', 'ranking'), '#matrix/ranking');
});

test('the focused chain follows recorded links and keeps a source with its claim', () => {
  const ids = justificationIds(model, 'sufficiency');
  assert.equal(ids.has('blueprint24'), true);
  assert.equal(ids.has('facets'), true);
  assert.equal(ids.has('p1'), true);
  assert.equal(ids.has('claim_blueprint24'), true);
  const outsider = model.claims.find(claim => !ids.has(claim.sourceId));
  if (outsider) assert.equal(ids.has(outsider.id), false);
  const fromClaim = justificationIds(model, 'claim_blueprint24');
  assert.equal(fromClaim.has('blueprint24'), true);
  assert.equal(fromClaim.has('claim_blueprint24'), true);
});

test('a new connection requires an explicit meaning and a trace does not transfer support', () => {
  assert.throws(() => requireConnection({ id: 'e', meaning: '', source: 'a', target: 'b' }), /kausaalista/);
  const draft = requireConnection({ id: 'e', meaning: 'questions', source: 'a', target: 'b', rationale: 'Rajaus kirjataan tähän.' });
  assert.equal(draft.meaning, 'questions');
  assert.equal(draft.reviewState, 'proposed');
  assert.equal(draft.rationale, 'Rajaus kirjataan tähän.');
  const chain = tracePath(model, 'blueprint24', 'p1');
  const text = formatTrace(model, chain);
  assert.match(text, /—\[.+\]→/);
  assert.match(traceLimitation, /topologinen/);
  assert.match(traceLimitation, /ei siirry/);
  const svg = graphSvg(model, new Set(['facets', 'p1', 'blueprint24']), 'p1');
  assert.equal(svg.includes('foreignObject'), false);
  assert.match(svg, /stroke-dasharray="2 5"/);
  assert.match(svg, /No causal inference/);
});
