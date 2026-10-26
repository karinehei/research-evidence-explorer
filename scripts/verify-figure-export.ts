import { readFileSync } from 'node:fs'
import { load } from '../src/model.ts'
import { createSnapshot } from '../src/snapshots.ts'
import {
  buildFigureBundle,
  selectionMatchesManifest,
  FIGURE_GENERATOR_VERSION,
  type FigureManifest,
} from '../src/figures.ts'

const ws = load(JSON.parse(readFileSync('data/research.json', 'utf8')))
const snap = await createSnapshot(ws)
const bundle = await buildFigureBundle(ws, {
  mode: 'browser-layout',
  preset: 'justification',
  focusId: 'sufficiency',
  snapshotContentHash: snap.contentHash,
})
const svg = readFileSync('out/justification.svg', 'utf8')
const man = JSON.parse(readFileSync('out/justification.figure-manifest.json', 'utf8')) as FigureManifest
const caption = readFileSync('out/justification.caption.txt', 'utf8')
const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
const titleMatch = svg.match(/<title>([^<]*)<\/title>/)
const report = {
  parseOk: svg.includes('<svg') && svg.includes('</svg>') && !/<foreignObject\b/i.test(svg),
  parity: selectionMatchesManifest(bundle.selection, man),
  generatorVersion: man.generatorVersion,
  expectedGenerator: FIGURE_GENERATOR_VERSION,
  snapshotHashMatch: man.snapshotContentHash === snap.contentHash,
  mode: man.mode,
  nodeCount: man.selectedNodeIds.length,
  relCount: man.selectedRelationshipIds.length,
  captionHasProposed: /proposed|ehdotet/i.test(caption),
  captionHasAutoConclusion: /therefore we conclude|scientific conclusion|tieteellinen johtopäätös/i.test(
    caption,
  ),
  hasLegend: /Selite|raportoitu|ehdotus\/oletus|oma sovellus/i.test(svg),
  hasEpistemicInRels: man.relationships.every((r) => Boolean(r.epistemicStatus)),
  svgBytes: svg.length,
  viewBox: viewBoxMatch?.[1] ?? null,
  firstTitle: titleMatch?.[1] ?? null,
  graphvizClaimed: Boolean(man.toolVersions?.graphvizAvailable && man.mode === 'graphviz'),
}
console.log(JSON.stringify(report, null, 2))
if (
  !report.parseOk ||
  !report.parity ||
  !report.snapshotHashMatch ||
  !report.hasEpistemicInRels ||
  !report.hasLegend ||
  man.mode !== 'browser-layout'
) {
  process.exitCode = 1
}
