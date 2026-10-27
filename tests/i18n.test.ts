import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uiEn, uiFi, t } from '../src/i18n/catalog.ts';
import {
  LOCALE_STORAGE_KEY, detectBrowserLocale, readStoredLocale, resolveInitialLocale, writeStoredLocale
} from '../src/i18n/locale.ts';
import {
  caseField, displayRecordLabel, researchTranslationManifest, translateResearchField
} from '../src/i18n/research.ts';
import { TRANSLATION_RESOURCE_VERSION } from '../src/i18n/locale.ts';
import { figureBrowserSvg, resolvePresetIds } from '../src/figures.ts';
import { load } from '../src/model.ts';
import { contentHash } from '../src/snapshots.ts';
import researchEn from '../data/i18n/research-en.json' with { type: 'json' };

const root = path.dirname(fileURLToPath(import.meta.url));
const model = load(JSON.parse(fs.readFileSync(path.join(root, '../data/research.json'), 'utf8')));

type Tree = { [key: string]: string | Tree };

function leafPaths(node: string | Tree, prefix = ''): string[] {
  if (typeof node === 'string') return prefix ? [prefix] : [];
  return Object.entries(node).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return leafPaths(value as string | Tree, next);
  });
}

function installLocalStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
    writable: true
  });
  return store;
}

test('uiFi and uiEn expose the same leaf message paths', () => {
  const fi = leafPaths(uiFi as Tree).sort();
  const en = leafPaths(uiEn as Tree).sort();
  assert.deepEqual(en, fi);
  assert.ok(fi.includes('graph.filterStatus'));
  assert.ok(fi.includes('brand.language'));
});

test('detectBrowserLocale prefers Finnish or English and defaults to Finnish', () => {
  assert.equal(detectBrowserLocale(['en-US']), 'en');
  assert.equal(detectBrowserLocale(['de']), 'fi');
  assert.equal(detectBrowserLocale(['fi-FI', 'en']), 'fi');
  assert.equal(detectBrowserLocale(['fr-FR', 'de-DE']), 'fi');
  assert.equal(detectBrowserLocale(['en']), 'en');
  assert.equal(detectBrowserLocale(['fi']), 'fi');
});

test('locale storage write/read restores preference and resolveInitialLocale prefers storage', () => {
  installLocalStorage();
  assert.equal(readStoredLocale(), null);
  writeStoredLocale('en');
  assert.equal(readStoredLocale(), 'en');
  assert.equal(resolveInitialLocale(), 'en');
  writeStoredLocale('fi');
  assert.equal(readStoredLocale(), 'fi');
  assert.equal(resolveInitialLocale(), 'fi');
  assert.equal(globalThis.localStorage.getItem(LOCALE_STORAGE_KEY), 'fi');
});

test('translateResearchField returns original for Finnish and overlays English when present', () => {
  const original = model.constructs.find(item => item.id === 'sufficiency')!.label;
  const fi = translateResearchField('fi', 'constructs', 'sufficiency', 'label', original);
  assert.equal(fi.text, original);
  assert.equal(fi.source, 'original');
  assert.equal(fi.notice, '');

  const en = translateResearchField('en', 'constructs', 'sufficiency', 'label', original, { hashMatches: true });
  assert.equal(en.source, 'translation');
  assert.equal(en.text, 'Evidence sufficiency');
  assert.equal(en.notice, '');
  assert.notEqual(en.text, original);
});

test('translateResearchField falls back and flags needs-review when hash mismatches', () => {
  const original = model.constructs.find(item => item.id === 'sufficiency')!.label;
  const missing = translateResearchField('en', 'constructs', 'sufficiency', 'notes-missing-field', original, {
    hashMatches: true
  });
  assert.equal(missing.source, 'fallback-original');
  assert.equal(missing.text, original);
  assert.equal(missing.notice, t('en', 'research.missingTranslationFi'));
  assert.match(missing.notice, /Original Finnish|English translation unavailable/i);

  const unknownClaim = translateResearchField('en', 'claims', 'claim_does_not_exist', 'statement', 'Tuntematon väite', {
    hashMatches: true
  });
  assert.equal(unknownClaim.source, 'fallback-original');
  assert.equal(unknownClaim.text, 'Tuntematon väite');
  assert.equal(unknownClaim.notice, t('en', 'research.missingTranslationFi'));

  const stale = translateResearchField('en', 'constructs', 'sufficiency', 'label', original, {
    hashMatches: false
  });
  assert.equal(stale.source, 'translation');
  assert.equal(stale.text, 'Evidence sufficiency');
  assert.match(stale.notice, /needs review|original changed/i);
});

test('displayRecordLabel differs by locale without mutating the model', () => {
  const before = JSON.stringify(model);
  const fi = displayRecordLabel('fi', model, 'sufficiency', true);
  const en = displayRecordLabel('en', model, 'sufficiency', true);
  assert.equal(fi, 'Näytön riittävyys');
  assert.equal(en, 'Evidence sufficiency');
  assert.notEqual(fi, en);
  assert.equal(JSON.stringify(model), before);
});

test('contentHash is stable across a locale-switch simulation and matches research-manifest', async () => {
  const manifest = researchTranslationManifest();
  const before = await contentHash(model);
  // Locale preference is presentation-only: no model mutation.
  const labelFi = displayRecordLabel('fi', model, 'sufficiency', true);
  const labelEn = displayRecordLabel('en', model, 'sufficiency', true);
  assert.notEqual(labelFi, labelEn);
  const after = await contentHash(model);
  assert.equal(after, before);
  assert.equal(before, manifest.sourceContentHash);
  assert.equal(manifest.resourceVersion, '1.1.0');
  assert.equal(TRANSLATION_RESOURCE_VERSION, manifest.resourceVersion);
});

test('nested case English fields and curated claim statements are present', () => {
  const caseA = model.cases.find(item => item.id === 'A')!;
  const facet = caseA.facets.find(item => item.id === 'A_f1')!;
  const answer = caseA.answerVariants.find(item => item.id === 'A_ans')!;
  const facetLabel = caseField('en', 'A', 'facet.A_f1.label', facet.label, true);
  assert.equal(facetLabel.source, 'translation');
  assert.equal(facetLabel.text, 'F1 · Ordinary channel X');
  assert.notEqual(facetLabel.text, facet.label);

  const answerText = caseField('en', 'A', 'answer.A_ans.text', answer.text, true);
  assert.equal(answerText.source, 'translation');
  assert.equal(answerText.text, 'The contact channel is X.');

  const column = caseField('en', 'A', 'column.0', caseA.columns[0], true);
  assert.equal(column.source, 'translation');
  assert.equal(column.text, 'Information facet');

  const cell = caseField('en', 'A', 'row.0.1', caseA.rows[0][1], true);
  assert.equal(cell.source, 'translation');
  assert.equal(cell.text, 'Available');

  const claim = model.claims.find(item => item.id === 'claim_jarvelin15')!;
  const statement = translateResearchField('en', 'claims', 'claim_jarvelin15', 'statement', claim.statement, {
    hashMatches: true
  });
  assert.equal(statement.source, 'translation');
  assert.match(statement.text, /Tasks, information activities/i);
  assert.notEqual(statement.text, claim.statement);

  const limitations = translateResearchField('en', 'claims', 'claim_jarvelin15', 'limitations', claim.limitations, {
    hashMatches: true
  });
  assert.equal(limitations.source, 'translation');
  assert.match(limitations.text, /answer rating does not show success/i);

  assert.ok(researchEn.claims?.claim_jarvelin15?.statement);
  assert.equal(Object.keys(researchEn.claims || {}).length, 11);
});

test('English figure SVG uses Legend and English epistemic short labels', () => {
  const { ids } = resolvePresetIds(model, 'justification', { focusId: 'sufficiency', locale: 'en' });
  const svg = figureBrowserSvg(model, ids, { locale: 'en', caption: 'Scoped English figure.' });
  assert.match(svg, /Legend/);
  assert.match(svg, /reported|own adaptation|proposal/i);
  assert.doesNotMatch(svg, />Selite</);
});

test('catalog t() interpolates graph.filterStatus', () => {
  assert.equal(t('fi', 'graph.filterStatus', { count: 4 }), 'Kartan suodatus: 4 näkyvää kohdetta.');
  assert.equal(t('en', 'graph.filterStatus', { count: 4 }), 'Map filter: 4 visible records.');
});

test('English source and claim inspector catalogue keys exist', () => {
  assert.match(t('en', 'inspector.biblioSection'), /Bibliographic identity/i);
  assert.match(t('en', 'inspector.claimImportedNote'), /imported summary/i);
  assert.match(t('en', 'inspector.addClaimManual'), /Add source claim manually/i);
  assert.match(t('fi', 'inspector.biblioSection'), /Bibliografinen identiteetti/i);
  assert.notEqual(t('en', 'inspector.biblioSection'), t('fi', 'inspector.biblioSection'));
});
