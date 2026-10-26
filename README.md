# Research Evidence Explorer

An initial research workspace for developing the conceptual model of Finnish healthcare RAG evaluation. It adapts the exploration pattern of [architecture-explorer](https://github.com/karinehei/architecture-explorer) to sources, constructs, criteria and open propositions. Its implementation is independent; no original repository files were modified.

The interface is Finnish. The curated seed is a **selected starting model**, not a complete conversion of the literature matrix or a completed review. It contains 11 source records, 9 constructs, 7 criteria, 4 open questions and 3 constructed cases.

## Open the first version

Open `dist/index.html` directly in a modern browser. All code and seed data are included locally; the prototype makes no network requests and needs no paid API, account, Node.js or Graphviz to run.

For development, install Node.js 22 or newer and run:

```sh
npm test
npm run build
```

There are no npm dependencies to install. After changing source files, rebuild and reopen or reload `dist/index.html`. Local storage for `file:` URLs can vary by browser; JSON exports are the portable backup. A static server or GitHub Pages gives the workspace a consistent origin.

## Four views

1. **Lähteistä kriteereihin**: inspect a focused source–concept–criterion graph, expand to the full map, search, filter epistemic status, follow one directed chain, drag nodes, edit records, add or delete nodes and connections.
2. **Arviointimatriisi**: see criteria, their direct conceptual links and two-step source chains from the same model. Missing links mean “not recorded”, not “research gap”.
3. **Rakennetut tapaukset**: compare omission, passage traceability and temporal applicability in cases A–C. No expert ratings or empirical measurements are fabricated.
4. **Oletukset ja kysymykset**: inspect the future propositions separately from reported findings.

The inspector records a definition, inference boundary, unit, evidence basis, locator, reported reading level and the researcher's own notes. Select an edge to edit its meaning, status, rationale and locator. The initial edge records are provisional mappings; they require source-specific appraisal before manuscript use.

## Research provenance

Seed content was manually structured from the user-supplied files:

- `Literature_Matrix_RAG_Evaluation(2).docx`
- `Year_1_RAG_Conceptual_Article_Brief (2).docx`, revised 26 October 2026.

The files themselves are not distributed in this project. Original papers were not newly appraised to create this prototype. `reported-full-text` and `reported-abstract` describe access reported in the supplied documents. `not-recorded` requests clarification; it does not imply the source was never read. In particular, the Liu record retains the mixed “abstract and evaluation protocol” description in its locator rather than claiming a full-text appraisal.

Sources, conceptual roles and applications are different record types. A source-to-concept connection is normally an **adaptation**, even if the source record describes reported literature. The diagram's arrows are explanatory links, not estimated causal effects. Solid, dashed and dotted lines distinguish reported literature, adaptations and hypotheses; the seed's mapping links are adaptations or hypotheses.

No global trust score, validated scale, novelty finding or clinical safety assessment is computed. The five expert dimensions remain separate. Correctness, support, source currency, perceived verifiability and successful verification are distinct.

## Saving and exchanging work

Edits are saved to this browser's local storage when available. **Export JSON** for a portable backup, another computer or a versioned research snapshot. Import validates schema, IDs, references, labels, coordinates, allowed types and example metadata before replacement. A failed import preserves current work; successful imports and editing operations support Undo (last 30 changes in the open session).

Import is limited to 2 MB; the model permits up to 400 nodes and 1,200 connections. Opening a link uses only HTTP(S). Imported text is rendered as text rather than HTML. CSV exports neutralise leading spreadsheet formula characters.

The graph editor changes sources, constructs, criteria, questions and edges. Structured case tables are edited in the JSON file or an exported workspace; an in-app case editor is not included. This version does not import DOCX or Zotero automatically, perform bibliometric analysis or analyse empirical ratings.

## Figure and data exports

- **JSON**: complete workspace, including evidence notes and positions.
- **SVG**: visible graph, including current filters and layout. Uses native SVG text; no `foreignObject`, remote icons or embedded web content.
- **DOT**: visible graph for Graphviz; automatic Graphviz layout differs from the browser layout.
- **CSV**: all node records, including notes and source locators. Relationships are preserved in JSON/DOT, not duplicated in this node CSV.
- **Print**: current view; use the browser's PDF destination if desired. For the graph, SVG/DOT is preferable to printing a large map.

Generate reproducible figures from an exported JSON snapshot:

```sh
node scripts/export-graph.js research-workspace.json research-map.dot
node scripts/export-graph.js research-workspace.json research-map.svg
node scripts/export-graph.js research-workspace.json research-map.pdf
```

Only the last two commands need the Graphviz application (`dot`). On Windows, verify `dot -V` after installation. Review figure labels, selection boundaries and the caption for each manuscript. The renderer represents the model; it does not validate its conceptual claims.

## GitHub Pages

Create a separate repository, for example `rag-research-explorer`, and place this project's contents at its root, including `.github/`. In **Settings → Pages**, select **GitHub Actions** as the source. Push to `main` or run the workflow manually. Relative asset paths and hash navigation support a repository subpath.

The included workflow was prepared but was not run in the user's GitHub account. Publishing a static workspace exposes all seed data shipped in `dist/`; browser-local edits remain local until deliberately exported or committed. Choose the repository content accordingly.

## Suggested next implementation

The dependency-free prototype demonstrates the research model. For an extensive editor, React + TypeScript + React Flow can reuse the approach already familiar from architecture-explorer. Cytoscape.js is an alternative if network layouts and graph queries become central; adopting both initially is unnecessary. Keep Graphviz for scripted figures. Add Plotly or a Python plotting pipeline only once empirical results and a justified analysis plan exist.

For a research-grade next step, add an append-only decision log, separate source-claim records with exact evidence locations, Zotero identifiers, independent version/status per relationship, and a documented adjudication workflow. Do not replace these with a visually impressive graph.

## Files

| Path | Purpose |
|---|---|
| `data/research.json` | Curated, versionable source model |
| `web/model.js` | Validation, directed path search, CSV and DOT export |
| `web/app.js` | Local editing and research views |
| `web/styles.css` | Responsive interface and print styling |
| `scripts/build.js` | Reproducible dependency-free static build |
| `scripts/export-graph.js` | CLI export from a JSON snapshot |
| `tests/model.test.js` | Import integrity and export checks |
| `dist/` | Ready-to-open browser version |

## Verification of this first version

The static build and all 11 model tests passed. Browser checks covered all four views, editing a research note, undoing the edit and reloading the saved state. SVG export was triggered without a browser console error, but automated download-completion verification timed out. Native Graphviz was unavailable, so actual Graphviz SVG/PDF/PNG rendering remains unverified. The DOT generator was exercised. The GitHub Pages workflow has not been deployed in the user's account.

## License

Original software in this prototype is available under the MIT license in `LICENSE`. Bibliographic metadata and research summaries retain their scholarly attribution; this license does not grant rights to redistribute the underlying papers or supplied documents.
