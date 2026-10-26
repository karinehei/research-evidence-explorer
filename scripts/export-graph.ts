import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { dot, load } from '../src/model.ts';

const args = process.argv.slice(2);
const input = args[0] || 'data/research.json';
const output = args[1] || 'research-map.dot';
const model = load(JSON.parse(fs.readFileSync(input, 'utf8')));
const extension = path.extname(output).toLowerCase();
if (!['.dot', '.svg', '.pdf', '.png'].includes(extension)) throw new Error('Use a .dot, .svg, .pdf or .png output path.');
const source = dot(model);
if (extension === '.dot') fs.writeFileSync(output, source);
else {
  const rendered = spawnSync('dot', ['-T' + extension.slice(1), '-o', output], { input: source, encoding: 'utf8' });
  if (rendered.error) { console.error('Graphviz dot is required for SVG/PDF/PNG. DOT export needs only Node.js.'); process.exit(1); }
  if (rendered.status !== 0) { console.error(rendered.stderr); process.exit(rendered.status || 1); }
}
console.log(output);
