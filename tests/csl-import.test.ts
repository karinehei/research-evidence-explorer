import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, validate } from '../src/model.ts';
import { applyCslImport, normalizeDoi, parseCslJson, stageCslImport } from '../src/cslImport.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));
const fixtureText = fs.readFileSync(path.join(root, 'fixtures/csl-zotero-test.json'), 'utf8');

test('the CSL test fixture is labelled as metadata-only test data', () => {
  assert.match(fixtureText, /TEST DATA ONLY/);
  assert.match(fixtureText, /Metadata-only/);
  assert.doesNotMatch(fixtureText, /base64/i);
});

test('DOI normalisation and CSL parsing keep Unicode authors and flag bad names', () => {
  assert.equal(normalizeDoi('https://doi.org/10.1145/3675162'), '10.1145/3675162');
  assert.equal(normalizeDoi('DOI: 10.1145/3675162'), '10.1145/3675162');
  assert.equal(normalizeDoi(''), '');
  const items = parseCslJson(fixtureText);
  assert.equal(items.length, 5);
  const unicode = items.find(item => item.itemKey === 'TESTNEW1');
  assert.ok(unicode);
  assert.match(unicode.citation, /Łajewska/);
  assert.match(unicode.citation, /Åström/);
  assert.equal(unicode.doi, '');
  const bad = items.find(item => item.itemKey === 'TESTBAD1');
  assert.ok(bad);
  assert.ok(bad.flags.some(flag => /tarkistuksen/i.test(flag)));
  const withAttachment = items.find(item => item.itemKey === 'TESTDOI1');
  assert.ok(withAttachment);
  assert.equal(withAttachment.attachments[0]?.path.includes('paper.pdf'), true);
  assert.equal(JSON.stringify(withAttachment.raw).includes('fileData'), false);
});

test('staging previews DOI duplicates, title suggestions, missing DOI and invalid JSON', () => {
  assert.equal(stageCslImport(model, '{').error.length > 0, true);
  assert.match(stageCslImport(model, '{"title":"x"}').error, /taulukko|items/i);
  const staged = stageCslImport(model, fixtureText);
  assert.equal(staged.error, '');
  const doiHit = staged.items.find(item => item.item.itemKey === 'TESTDOI1');
  assert.equal(doiHit?.matchKind, 'doi');
  assert.equal(doiHit?.matchedSourceId, 'blueprint24');
  assert.equal(doiHit?.action, 'skip');
  const titleHit = staged.items.find(item => item.item.itemKey === 'TESTTITLE1');
  assert.equal(titleHit?.matchKind, 'title-year');
  assert.ok(titleHit?.candidates.some(candidate => candidate.id === 'ragas24'));
  assert.equal(titleHit?.action, 'skip');
  const missing = staged.items.find(item => item.item.itemKey === 'TESTNODOL');
  assert.equal(missing?.item.doi, '');
  assert.equal(missing?.matchKind, 'new');
  assert.equal(missing?.action, 'create');
});

test('accepting a staged import creates sources without inventing claims or reading status', () => {
  const staged = stageCslImport(model, fixtureText);
  const notesBefore = model.sources.find(source => source.id === 'blueprint24')?.notes;
  const next = applyCslImport(model, staged.items.map(item => (
    item.item.itemKey === 'TESTDOI1'
      ? { ...item, action: 'link' as const, linkTargetId: 'blueprint24', takeFields: { citation: true } }
      : item.item.itemKey === 'TESTTITLE1'
        ? { ...item, action: 'skip' as const }
        : item
  )), '2026-10-26T12:00:00.000Z');
  const checked = validate(next);
  assert.equal(checked.claims.length, model.claims.length);
  const created = checked.sources.filter(source => source.bibliographicImport?.provider === 'zotero-csl-json' && source.id !== 'blueprint24');
  assert.ok(created.length >= 2);
  for (const source of created) {
    assert.equal(source.access, 'not-recorded');
    assert.equal(source.publicationStatus, 'not-recorded');
    assert.equal(checked.claims.some(claim => claim.sourceId === source.id), false);
  }
  const linked = checked.sources.find(source => source.id === 'blueprint24');
  assert.ok(linked?.bibliographicImport);
  assert.equal(linked?.notes, notesBefore);
  assert.match(linked?.citation || '', /Järvelin/);
  assert.equal(linked?.bibliographicImport?.attachments[0]?.path.includes('paper.pdf'), true);
});

test('optional nextCheck and bibliographicImport stay inside schema 2', () => {
  const copy = JSON.parse(JSON.stringify(model));
  copy.sources[0].nextCheck = 'Tarkista sivunumero alkuperäisestä.';
  copy.sources[0].bibliographicImport = {
    importedAt: '2026-10-26T12:00:00.000Z',
    provider: 'zotero-csl-json',
    itemKey: 'MANUAL',
    citationKey: '',
    original: { title: 'Manual probe', type: 'article' },
    attachments: [{ title: 'note', path: 'D:\\local\\only.metadata', linkMode: 'linked_file', contentType: 'text/plain' }],
    flags: ['Testilippu']
  };
  assert.equal(validate(copy).sources[0].nextCheck, 'Tarkista sivunumero alkuperäisestä.');
  copy.sources[0].bibliographicImport.provider = 'other';
  assert.throws(() => validate(copy), /tuonnin lähde/);
});
