# Research Evidence Explorer

An initial research workspace for developing the conceptual model of Finnish healthcare RAG evaluation. It adapts the exploration pattern of [architecture-explorer](https://github.com/karinehei/architecture-explorer) to sources, source claims, constructs, criteria and open propositions. Its implementation is independent; no original repository files were modified.

The interface is Finnish. The curated seed is a **selected starting model**, not a complete conversion of the literature matrix or a completed review. It contains 11 sources, 11 imported source claims, 9 constructs, 7 criteria, 32 relationships, 4 open propositions and 3 constructed cases. The stored workspace is schema 2. A schema 1 export still imports through the migration in `src/model.ts`. The record types, migration rules and fields that still need appraisal are documented in [docs/schema.md](docs/schema.md).

## Run the workspace

The application is a React and TypeScript project built with Vite. React Flow draws the map. Development uses a local server, and the published copy is the built `dist/` directory served by a static server or GitHub Pages. The module build does not open directly from a `file://` address.

Install Node.js 22 or newer, then:

```sh
npm install
npm test
npm run dev
```

`npm run dev` serves the workspace locally. `npm run build` checks the curated seed and writes `dist/` with relative asset paths, so the same build can be hosted under a repository subpath. Open that directory through a static server. Hash routes such as `#graph/sufficiency`, `#map/sufficiency`, `#matrix/ranking`, `#cases/A` and `#questions/p1` restore the view and the selection.

Dependencies are pinned in `package.json` and `package-lock.json`: React 19.2.0, React DOM 19.2.0 and `@xyflow/react` 12.9.3, with Vite 7.3.7 for the build. The Pages workflow installs from the lockfile, runs `npm test` and `npm run build`, and uploads `dist/`.

## Four views

1. **Lähteistä kriteereihin**: a focused chain around the selection, or the explicit full map. Sources, source claims, constructs, criteria and propositions are separate node types. Search, filter epistemic status, drag, zoom, fit and follow one directed chain. The chain is a topological path of recorded links. It is not an evidentially justified argument, and support does not transfer through every ancestor.
2. **Arviointimatriisi**: criteria, their direct conceptual links and two-step source chains from the same model. The selection is the same record as on the map. Missing links mean “not recorded”, not “research gap”.
3. **Rakennetut tapaukset**: compare omission, passage traceability and temporal applicability in cases A–C. The prose stays read-only. Cross-references are edited separately and stay empty until a researcher sets them. No expert ratings or empirical measurements are fabricated.
4. **Oletukset ja kysymykset**: the future propositions and research decisions, separate from reported findings.

One inspector edits the selected record. Long labels stay clamped on the canvas; the full text, rationale and limitations are in the selection. A relationship shows its meaning, rationale, evidence references, epistemic status and limitation. Adding a connection requires an explicit relationship type and can record a rationale. An arrow without that choice is not stored and does not imply a cause. Reported, adaptation and hypothesis links use text, line style and colour together. A claim’s link to its source is labelled as a source reference and has no causal arrowhead.

The literature and evidence inspector keeps bibliographic identity, publication or version links, reported reading level, claim appraisal, source claims, methods or context, limitations, evidence locators and the researcher's own adaptations in separate sections. The full citation stays discoverable. Researcher notes and a next-check field are separate. A bibliography entry is not treated as a full-text appraisal.

A source summary imported from the planning documents is labelled as an imported summary. Claims and locators are entered by the researcher. Automatic extraction from DOCX or PDF is outside this phase. A relationship created in the workspace stays proposed until it is explicitly marked reviewed. The initial records are provisional mappings; they require source-specific appraisal before manuscript use.

Leaving a form with unsaved edits asks whether to save, discard or stay. A failed check stays on the form. If browser storage throws, the status says the local save failed and JSON export remains available.

## Research provenance

Seed content was manually structured from the user-supplied files:

- `Literature_Matrix_RAG_Evaluation(2).docx`
- `Year_1_RAG_Conceptual_Article_Brief (2).docx`, revised 26 October 2026.

The files themselves are not distributed in this project. Original papers were not newly appraised to create this prototype. `reported-full-text` and `reported-abstract` describe access reported in the supplied documents. `not-recorded` requests clarification; it does not imply the source was never read. In particular, the Liu record retains the mixed “abstract and evaluation protocol” description in its locator rather than claiming a full-text appraisal.

Sources, conceptual roles and applications are different record types. A source-to-concept connection is normally an **adaptation**, even if the source record describes reported literature. The diagram's arrows are explanatory links, not estimated causal effects. Solid, dashed and dotted lines, together with their labels, distinguish reported literature, adaptations and hypotheses. The seed's mapping links are adaptations or hypotheses.

No global trust score, validated scale, novelty finding or clinical safety assessment is computed. The five expert dimensions remain separate and are still the single criterion `expert`; they are not scored here. Correctness, support, source currency, perceived verifiability and successful verification are distinct.

## Saving and exchanging work

Edits are saved to this browser's local storage when available, under `research-evidence-explorer-v1`. **Export JSON** for a portable backup, another computer or a versioned research snapshot. Import validates schema, IDs, references, labels, coordinates, allowed types and example metadata before replacement. A failed import preserves current work. Successful imports and editing operations support Undo (last 30 changes in the open session). An import that matches the current workspace does not add an undo entry.

Import is limited to 2 MB. The model permits up to 400 graph records, 400 claims and 1,200 connections. Opening a link uses only HTTP(S). Imported text is rendered as text rather than HTML. CSV exports neutralise leading spreadsheet formula characters. Existing schema 1 JSON still loads through the migration layer.

Structured case tables are edited in the JSON file or an exported workspace. The in-app case control edits only the cross-reference lists. **Tuo Zotero CSL** starts a user-initiated CSL-JSON import with a staging preview: DOI and explicit identifiers match first, title/year only suggests possible duplicates, and the researcher reviews conflicts before accept or cancel. Import may create source records and preserve original bibliographic metadata plus attachment paths as metadata only. It does not invent claims, methods, reading status or appraisals, and it does not upload local files. Malformed author fields are flagged for review. This version does not extract claims from DOCX or PDF, call an external AI service, perform bibliometric analysis or analyse empirical ratings. A tiny metadata-only fixture lives at `tests/fixtures/csl-zotero-test.json` and is labelled as test data.

## Figure and data exports

- **JSON**: complete workspace, including evidence notes and positions.
- **SVG**: visible graph, including current filters and layout. Uses native SVG text; no `foreignObject`, remote icons or embedded web content. The description states that the styles are epistemic, not causal.
- **DOT**: visible graph for Graphviz; automatic Graphviz layout differs from the browser layout. The command is available only after the map has been opened, because the export uses that visible scope.
- **CSV**: the research records, including notes and source locators. Relationships remain in JSON and DOT.
- **Print**: current view; use the browser's PDF destination if desired. For the graph, SVG or DOT is preferable to printing a large map.

Generate reproducible figures from an exported JSON snapshot:

```sh
node --experimental-strip-types scripts/export-graph.ts research-workspace.json research-map.dot
node --experimental-strip-types scripts/export-graph.ts research-workspace.json research-map.svg
node --experimental-strip-types scripts/export-graph.ts research-workspace.json research-map.pdf
```

Only the last two commands need the Graphviz application (`dot`). On Windows, verify `dot -V` after installation. Review figure labels, selection boundaries and the caption for each manuscript. The renderer represents the model; it does not validate its conceptual claims. If `dot` is missing, the script stops with: “Graphviz dot is required for SVG/PDF/PNG. DOT export needs only Node.js.”

## GitHub Pages

Create a separate repository, for example `rag-research-explorer`, and place this project's contents at its root, including `.github/`. In **Settings → Pages**, select **GitHub Actions** as the source. Push to `main` or run the workflow manually. Relative asset paths and hash navigation support a repository subpath.

The included workflow was prepared but was not run in this session. Publishing a static workspace exposes all seed data shipped in `dist/`; browser-local edits remain local until deliberately exported or committed. Choose the repository content accordingly.

## Checks for this port

`npm test` passed 21 tests after the literature inspector and CSL import work. `npm run build` with Vite 7.3.7 wrote `dist/` using relative `./assets` paths. A separate build with base `/research-evidence-explorer/` referenced that prefix and emitted the asset files; that temporary output was removed.

In the browser, against the built `dist/` on a local server, the curated workspace opened on the sufficiency chain. Saving a note and undoing it left the 32 relationships in place. A schema 1 export imported into a usable schema 2 workspace and an invalid file did not replace it. An identical import did not add an undo step. The matrix and the graph kept the same selected record, and reloading `#graph/ranking` restored that view. A dirty form blocked navigation; a failed save stayed on the form. A connection without a chosen meaning was refused. Relationship details showed meaning, rationale, evidence references, epistemic status and limitation. The trace used relationship meanings and stated that support does not transfer through every ancestor. Zoom changed the viewport. Enter selected a focused node. Forcing `localStorage.setItem` to throw reported the failure and left JSON export available.

The literature inspector showed separate bibliographic, publication/version, access, appraisal, claim, method/limitation/locator, adaptation and note/next-check sections for `ragas24`, with publication status still `not-recorded`. Zotero CSL staging previewed a DOI duplicate, a title/year suggestion, a missing DOI, Unicode author names and a malformed-author flag; cancel left storage unchanged; accept created three sources with `access: not-recorded` and did not add claims; invalid JSON was refused in the dialog.

Not checked here: the GitHub Actions workflow, a completed file download in the browser’s download folder, Graphviz SVG/PDF/PNG rendering (`dot` is not installed; the script stopped with its Node-only DOT message), pointer dragging of a canvas card, and opening the module build with `file://`. The module build is served by the Vite development server or by the built files on a local server or GitHub Pages.

## Next research step

Passage-level reconciliation of the two source documents is still open. Names that appear there but not as seed records were not added, and the imported summaries were not checked against the original papers. That comparison is not part of this interface port.

## Files

| Path | Purpose |
|---|---|
| `data/research.json` | Curated schema 2 workspace |
| `src/model.ts` | Validation, migration, directed path search, CSV and DOT |
| `src/` | React workspace, hash routes and React Flow map |
| `scripts/build.ts` | Seed check and Vite build into `dist/` |
| `scripts/export-graph.ts` | CLI DOT, or SVG/PDF/PNG when Graphviz `dot` is installed |
| `scripts/migrate.ts` | Schema 1 or schema 2 JSON to a checked schema 2 file |
| `tests/` | Model integrity, migration, hash routes and trace wording |
| `dist/` | Built deployment, served by a static server or Pages |

## License

Original software in this prototype is available under the MIT license in `LICENSE`. Bibliographic metadata and research summaries retain their scholarly attribution; this license does not grant rights to redistribute the underlying papers or supplied documents.
