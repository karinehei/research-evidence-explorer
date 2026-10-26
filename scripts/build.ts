import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { load } from '../src/model.ts';

const root = path.resolve(import.meta.dirname, '..');
const data = load(JSON.parse(fs.readFileSync(path.join(root, 'data/research.json'), 'utf8')));
if (data.schemaVersion !== 2) throw new Error('The curated seed did not validate as schema 2.');
await build({ configFile: path.join(root, 'vite.config.ts') });
console.log('Built dist/ with relative asset paths.');
