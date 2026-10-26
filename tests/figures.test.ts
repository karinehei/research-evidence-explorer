import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from '../src/model.ts';
import {
  buildFigureBundle, buildFigureSelection, figureBrowserSvg, figureGraphvizDot,
  resolvePresetIds, selectionMatchesManifest
} from '../src/figures.ts';
import { detectGraphviz } from '../src/figures-graphviz.ts';
import { createSnapshot } from '../src/snapshots.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));

function parseSvg(svg: string) {
  assert.match(svg, /^<\?xml/);
  assert.match(svg, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.doesNotMatch(svg, /<foreignObject\b/i);
  assert.match(svg, /<\/svg>\s*$/);
}

test('justification preset exports parseable browser SVG with epistemic legend and no foreignObject', async () => {
  const { ids, viewFilter } = resolvePresetIds(model, 'justification', { focusId: 'sufficiency' });
  assert.ok(ids.has('sufficiency'));
  assert.match(viewFilter.scopeNote, /perustelu/i);
  const selection = buildFigureSelection(model, ids);
  assert.ok(selection.relationships.every(item => item.epistemicStatus));
  const bundle = await buildFigureBundle(model, { mode: 'browser-layout', preset: 'justification', focusId: 'sufficiency' });
  assert.ok(bundle.svg);
  parseSvg(bundle.svg!);
  assert.match(bundle.svg!, /Selite/);
  assert.match(bundle.svg!, /raportoitu|oma sovellus|ehdotus/);
  assert.match(bundle.captionDraft, /ei kirjoita automaattisesti tieteellistä johtopäätöstä/i);
  assert.equal(bundle.manifest.exportType, 'research-figure-manifest');
  assert.ok(selectionMatchesManifest(bundle.selection, bundle.manifest));
  assert.deepEqual(bundle.manifest.selectedRelationshipIds, selection.relationshipIds);
});

test('Graphviz DOT keeps epistemic status in labels and styles; missing dot does not claim PDF', async () => {
  const bundle = await buildFigureBundle(model, {
    mode: 'graphviz',
    preset: 'evaluation-model',
    graphviz: { available: false, version: null }
  });
  assert.ok(bundle.dot);
  assert.match(bundle.dot!, /digraph ResearchFigure/);
  assert.match(bundle.dot!, /style="dotted"|style="dashed"|style="solid"/);
  assert.match(bundle.dot!, /raportoitu|sovellus|ehdotus/i);
  assert.equal(bundle.manifest.toolVersions.graphvizAvailable, false);
  assert.match(bundle.graphvizInstallHint, /dot -V|Graphviz/i);
  assert.doesNotMatch(bundle.captionDraft, /PDF renderöitiin|PDF was rendered/i);
});

test('constructed-case preset stays focused and selection preserves relationship epistemic fields', async () => {
  const { ids } = resolvePresetIds(model, 'constructed-case', { caseId: 'B' });
  const selection = buildFigureSelection(model, ids);
  for (const rel of selection.relationships) {
    const source = model.relationships.find(item => item.id === rel.id);
    assert.ok(source);
    assert.equal(rel.epistemicStatus, source!.epistemicStatus);
  }
  const svg = figureBrowserSvg(model, ids, { caption: 'Tapaus B -rajaus.' });
  parseSvg(svg);
  const dot = figureGraphvizDot(model, ids);
  assert.match(dot, /digraph/);
});

test('snapshot-backed figure manifest records content hash and matches exported record set', async () => {
  const snapshot = await createSnapshot(model);
  const bundle = await buildFigureBundle(model, {
    mode: 'browser-layout',
    preset: 'justification',
    focusId: 'sufficiency',
    snapshotContentHash: snapshot.contentHash
  });
  assert.equal(bundle.manifest.snapshotContentHash, snapshot.contentHash);
  assert.ok(selectionMatchesManifest(bundle.selection, bundle.manifest));
  assert.equal(bundle.manifest.layoutSettings.foreignObject, false);
});

test('detectGraphviz reports availability without mutating PATH', () => {
  const before = process.env.PATH;
  const detected = detectGraphviz();
  assert.equal(process.env.PATH, before);
  assert.equal(typeof detected.available, 'boolean');
  assert.match(detected.hint, /PATH|dot -V/i);
});
