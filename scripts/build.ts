import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { load } from '../src/model.ts';
import { projectPublishedSeed } from '../src/publish.ts';
import { contentHash } from '../src/snapshots.ts';
import type { Workspace } from '../src/types.ts';

const root = path.resolve(import.meta.dirname, '..');
const seedPath = path.join(root, 'data/research.json');
const raw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const data = load(raw) as Workspace;
if (data.schemaVersion !== 2) throw new Error('The curated seed did not validate as schema 2.');

await build({ configFile: path.join(root, 'vite.config.ts') });

const dist = path.join(root, 'dist');
const projection = projectPublishedSeed(data);
const published = projection.workspace;
fs.writeFileSync(path.join(dist, 'published-seed.json'), `${JSON.stringify(published, null, 2)}\n`);
const hash = await contentHash(data);
const manifest = {
  exportType: 'research-published-seed',
  schemaVersion: 2,
  source: 'data/research.json',
  builtAt: new Date().toISOString(),
  contentHash: hash,
  clearedFields: projection.clearedFields,
  retainedForReview: projection.retainedForReview,
  excludedAutomatically: projection.excludedAutomatically,
  contentNote:
    'Explicit publication projection of the curated schema 2 seed. Completeness of the working dataset is preserved in data/research.json; this file clears only editLog and recordRevisions. It is not a browser localStorage dump.',
  runtimeNote:
    'The SPA embeds data/research.json for first load (same curated records). Browser-local edits, actor labels and import backups stay in this browser until deliberately exported. DOCX bytes are never copied into dist/.'
};
fs.writeFileSync(path.join(dist, 'published-seed.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
const publishedFiles = walk(dist);
const docx = publishedFiles.filter(file => file.toLowerCase().endsWith('.docx'));
if (docx.length) throw new Error(`Published dist must not contain DOCX files: ${docx.join(', ')}`);
const publishedSeed = JSON.parse(fs.readFileSync(path.join(dist, 'published-seed.json'), 'utf8'));
if (!Array.isArray(publishedSeed.editLog) || publishedSeed.editLog.length !== 0) {
  throw new Error('Published seed must not carry a private editLog.');
}
const counts = {
  sources: data.sources.length,
  claims: data.claims.length,
  constructs: data.constructs.length,
  criteria: data.criteria.length,
  propositions: data.propositions.length,
  relationships: data.relationships.length,
  cases: data.cases.length,
  protocols: data.protocols.length,
  decisions: data.decisions.length,
  editLog: Array.isArray(data.editLog) ? data.editLog.length : 0
};
console.log(`Published seed is data/research.json only (${JSON.stringify(counts)}). Basis strings may name source documents; DOCX bytes, browser localStorage and import backups are not copied.`);
console.log('Built dist/ with relative asset paths and explicit published-seed.json.');
