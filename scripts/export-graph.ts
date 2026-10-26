import fs from 'node:fs';
import path from 'node:path';
import { load } from '../src/model.ts';
import { contentHash, isResearchSnapshot, workspaceFromIncoming } from '../src/snapshots.ts';
import {
  buildFigureBundle, selectionMatchesManifest, type FigureMode, type FigurePreset
} from '../src/figures.ts';
import { detectGraphviz, renderDotWithGraphviz } from '../src/figures-graphviz.ts';

function usage(): never {
  console.error(`Usage:
  node --experimental-strip-types scripts/export-graph.ts [input] [output]
       [--preset=justification|evaluation-model|constructed-case]
       [--mode=browser-layout|graphviz]
       [--focus=id] [--case=A]
       [--format=dot|svg|pdf|png]

Consumes a schema 2 workspace or research-snapshot JSON.
Writes the figure and a sidecar *.figure-manifest.json.
If Graphviz is missing, Graphviz SVG/PDF/PNG is not claimed; DOT is still written.`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) usage();

const positional: string[] = [];
const flags: Record<string, string> = {};
for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, ...rest] = arg.slice(2).split('=');
    flags[key] = rest.join('=') || 'true';
  } else positional.push(arg);
}

const input = positional[0] || 'data/research.json';
const output = positional[1] || 'research-figure.dot';
const preset = (flags.preset || 'justification') as FigurePreset;
const mode = (flags.mode || (path.extname(output).toLowerCase() === '.svg' && flags.engine === 'browser' ? 'browser-layout' : 'graphviz')) as FigureMode;
const focusId = flags.focus || '';
const caseId = flags.case || 'A';
const formatFlag = flags.format || path.extname(output).toLowerCase().replace('.', '') || 'dot';

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const workspaceRaw = workspaceFromIncoming(raw);
const model = load(workspaceRaw);
const snapshotHash = isResearchSnapshot(raw) && typeof raw.contentHash === 'string'
  ? raw.contentHash
  : await contentHash(model);
const graphviz = detectGraphviz();

const outExt = path.extname(output).toLowerCase();
const base = outExt ? output.slice(0, -outExt.length) : output;
const manifestPath = `${base}.figure-manifest.json`;
const captionPath = `${base}.caption.txt`;

if (mode === 'browser-layout' || formatFlag === 'browser-svg') {
  const bundle = await buildFigureBundle(model, {
    mode: 'browser-layout',
    preset,
    focusId: focusId || undefined,
    caseId,
    snapshotContentHash: snapshotHash,
    graphviz
  });
  if (!bundle.svg) throw new Error('Selainasettelun SVG:tä ei muodostunut.');
  const svgPath = outExt === '.svg' ? output : `${base}.browser.svg`;
  fs.writeFileSync(svgPath, bundle.svg);
  bundle.manifest.renderedOutputs.push({ path: svgPath, kind: 'browser-layout-svg', claimedRendered: true });
  fs.writeFileSync(manifestPath, JSON.stringify(bundle.manifest, null, 2));
  fs.writeFileSync(captionPath, bundle.captionDraft + '\n');
  if (!selectionMatchesManifest(bundle.selection, bundle.manifest)) {
    throw new Error('Manifestin valinta ei vastaa vientijoukkoa.');
  }
  console.log(svgPath);
  console.log(manifestPath);
  console.log(captionPath);
  process.exit(0);
}

const bundle = await buildFigureBundle(model, {
  mode: 'graphviz',
  preset,
  focusId: focusId || undefined,
  caseId,
  snapshotContentHash: snapshotHash,
  graphviz
});
if (!bundle.dot) throw new Error('DOT:ia ei muodostunut.');

const dotPath = outExt === '.dot' || !['.svg', '.pdf', '.png'].includes(outExt) ? (outExt === '.dot' ? output : `${base}.dot`) : `${base}.dot`;
fs.writeFileSync(dotPath, bundle.dot);
bundle.manifest.renderedOutputs.push({ path: dotPath, kind: 'graphviz-dot', claimedRendered: true });

const wantRender = ['svg', 'pdf', 'png'].includes(formatFlag) || ['.svg', '.pdf', '.png'].includes(outExt);
if (wantRender) {
  const format = (formatFlag === 'dot' ? outExt.slice(1) : formatFlag) as 'svg' | 'pdf' | 'png';
  const renderPath = ['.svg', '.pdf', '.png'].includes(outExt) ? output : `${base}.${format}`;
  const rendered = renderDotWithGraphviz(bundle.dot, renderPath, format);
  if (!rendered.ok) {
    bundle.manifest.toolVersions.graphvizAvailable = false;
    bundle.manifest.toolVersions.graphviz = null;
    bundle.manifest.renderedOutputs.push({ path: renderPath, kind: `graphviz-${format}`, claimedRendered: false });
    fs.writeFileSync(manifestPath, JSON.stringify(bundle.manifest, null, 2));
    fs.writeFileSync(captionPath, bundle.captionDraft + '\n');
    console.log(dotPath);
    console.log(manifestPath);
    console.error(rendered.error);
    console.error('Valid DOT was written; rendered PDF/SVG was NOT claimed.');
    process.exit(1);
  }
  bundle.manifest.toolVersions.graphviz = rendered.version;
  bundle.manifest.toolVersions.graphvizAvailable = true;
  bundle.manifest.renderedOutputs.push({ path: renderPath, kind: `graphviz-${format}`, claimedRendered: true });
  console.log(renderPath);
}

if (!selectionMatchesManifest(bundle.selection, bundle.manifest)) {
  throw new Error('Manifestin valinta ei vastaa vientijoukkoa.');
}
fs.writeFileSync(manifestPath, JSON.stringify(bundle.manifest, null, 2));
fs.writeFileSync(captionPath, bundle.captionDraft + '\n');
console.log(dotPath);
console.log(manifestPath);
console.log(captionPath);
if (!graphviz.available && wantRender) {
  // already exited above
}
