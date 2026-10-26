import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { load } from '../src/model.ts';
import { contentHash } from '../src/snapshots.ts';

const root = path.resolve(import.meta.dirname, '..');
const seedPath = path.join(root, 'data/research.json');
const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const data = load(raw);
if (data.schemaVersion !== 2) throw new Error('The curated seed did not validate as schema 2.');

await build({ configFile: path.join(root, 'vite.config.ts') });

const dist = path.join(root, 'dist');
const published = structuredClone(data) as typeof data & { editLog?: unknown[]; recordRevisions?: unknown };
// Explicit published export: curated model only — strip local decision history if present.
published.editLog = [];
published.recordRevisions = published.recordRevisions && typeof published.recordRevisions === 'object'
  ? {}
  : published.recordRevisions;
fs.writeFileSync(path.join(dist, 'published-seed.json'), `${JSON.stringify(published, null, 2)}\n`);
const hash = await contentHash(data);
const manifest = {
  exportType: 'research-published-seed',
  schemaVersion: 2,
  source: 'data/research.json',
  builtAt: new Date().toISOString(),
  contentHash: hash,
  contentNote:
    'This file is the curated schema 2 seed shipped with the static Pages build. It is not a researcher localStorage workspace, not a private attachment store, and not an automatic dump of unpublished notes.',
  runtimeNote:
    'The SPA embeds the same curated seed for first load. Browser-local edits stay in this browser until deliberately exported. Attachments are metadata-only when imported via CSL.'
};
fs.writeFileSync(path.join(dist, 'published-seed.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Built dist/ with relative asset paths and explicit published-seed.json.');
