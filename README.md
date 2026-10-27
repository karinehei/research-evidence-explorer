# Research Evidence Explorer

An initial research workspace for developing the conceptual model of Finnish healthcare RAG evaluation. It adapts the exploration pattern of [architecture-explorer](https://github.com/karinehei/architecture-explorer) to sources, source claims, constructs, criteria and open propositions. Its implementation is independent; no original repository files were modified.

The interface supports Finnish and English (default Finnish; see [docs/i18n.md](docs/i18n.md)). The curated seed is a **selected starting model**, not a complete conversion of the literature matrix or a completed review. It contains 11 sources, 11 imported source claims, 9 constructs, 7 criteria, 32 relationships, 4 open propositions, 4 provisional assessment protocols and 3 constructed cases. The stored workspace is schema 2. A schema 1 export still imports through the migration in `src/model.ts`. The record types, migration rules and fields that still need appraisal are documented in [docs/schema.md](docs/schema.md). Portable snapshots, content hashes and the local decision log are documented in [docs/snapshots.md](docs/snapshots.md).

- [User guide (English)](docs/user-guide.en.md)
- [Käyttöohje (suomi)](docs/user-guide.fi.md)

## Run the workspace

The application is a React and TypeScript project built with Vite. React Flow draws the map. Development uses a local server, and the published copy is the built `dist/` directory served by a static server or GitHub Pages. The module build does not open directly from a `file://` address.

Install Node.js 22 or newer, then:

```sh
npm install
npm run typecheck
npm test
npm run build
npm run test:smoke
npm run dev
```

`npm run dev` serves the workspace locally. Supported deployment is **HTTP** (local static server or GitHub Pages) with relative asset paths under a repository subpath. The module build is not supported from a `file://` address. Hash routes such as `#graph/sufficiency`, `#map/sufficiency`, `#matrix/ranking`, `#cases/A` and `#questions/p1` restore the view and the selection.

Dependencies are pinned in `package.json` and `package-lock.json`: React 19.2.0, React DOM 19.2.0, `@xyflow/react` 12.9.3, Vite 7.3.7, Playwright 1.64.1 and `@types/node` 24.5.2 (Node tooling only). `npm run typecheck` checks the browser app and the Node tooling projects separately. `npm test` checks the data model. `npm run test:smoke` runs the browser suite against the built `dist/`. Graphviz SVG/PDF/PNG rendering is an optional CLI capability (`dot` on PATH); it is documented separately and is not part of the browser acceptance path until exercised on a machine that has Graphviz.

## Four views

1. **Lähteistä kriteereihin**: a focused chain around the selection, or the explicit full map. Sources, source claims, constructs, criteria and propositions are separate node types. Search, filter epistemic status, drag, zoom, fit and follow one directed chain. The chain is a topological path of recorded links. It is not an evidentially justified argument, and support does not transfer through every ancestor.
2. **Arviointimatriisi**: criterion-oriented and source-oriented projections of the same canonical records as the graph, plus a focused argument view for a selected research decision. Criterion rows show construct and definition, supporting or motivating claims, the researcher's adaptation, evidence/assessor/unit, decision rule, permitted inference and validation need. Source rows distinguish conceptual, technical, empirical and tool/workflow roles without ranking them. Filters cover research strand (construct), epistemic status, appraisal and (on the source view) research role. Multi-step source→construct→criterion paths are labelled conceptual ancestry, not direct empirical support. Competing definitions stay visible. Blank cells mean “not recorded” / “not assessed” / “requires checking”, not a research gap, and no coverage or quality scores colour the matrix. Cell and claim selection opens the shared inspector; matrix JSON export keeps stable ids, filters, selection, claims and relationships.
3. **Rakennetut tapaukset**: task-to-evidence view and editor for constructed analytical cases A–C. The task reference records required facets, essential qualifications, temporal scope and acceptable source versions. Collection coverage, supplied-context sufficiency and answer coverage are shown separately; claim support and displayed citation are linked audits, not interchangeable stages. Facet states are full, partial, absent, conflicting or unresolved, with evidence refs and a reason; missing essential facets are listed prominently. Descriptive coverage ratios use an explicit denominator and never hide an essential omission behind an average. No clinical safety score is computed. Case records hold source snapshots, passages, saved context, answer variants, claim annotations, display conditions and interpretation boundaries, all labelled constructed-analytical-example on screen and in export. Cross-references stay in the inspector. Expert ratings and verification outcomes remain `not-measured`.
4. **Oletukset ja kysymykset**: future propositions with linked provisional assessment protocols and research decisions, separate from reported findings. P1 is a planned association (context coverage × expert-rated sufficiency), P2 a controlled presentation comparison with answer/evidence held constant, and P3 paired meaning-equivalent coverage changes — none are stored as established positive effects. The five expert dimensions stay separate; correctness and successful verification are separate audits; exports carry no invented observations or composite trust score.
5. **Historia ja tilannekuvat**: append-only local decision log (what changed, before/after, timestamp, linked records, reason, optional researcher-entered actor label) and versioned snapshot export/import with content vs layout hashes. Undo records a reversal event instead of silently rewriting history. Browser-local JSON is not a tamper-proof audit trail; explicit export is the portable copy and nothing is uploaded automatically.

One inspector edits the selected record. Long labels stay clamped on the canvas; the full text, rationale and limitations are in the selection. A relationship shows its meaning, rationale, evidence references, epistemic status and limitation. Adding a connection requires an explicit relationship type and can record a rationale. An arrow without that choice is not stored and does not imply a cause. Reported, adaptation and hypothesis links use text, line style and colour together. A claim’s link to its source is labelled as a source reference and has no causal arrowhead.

The literature and evidence inspector keeps bibliographic identity, publication or version links, reported reading level, claim appraisal, source claims, methods or context, limitations, evidence locators and the researcher's own adaptations in separate sections. The full citation stays discoverable. Researcher notes and a next-check field are separate. A bibliography entry is not treated as a full-text appraisal.

A source summary imported from the planning documents is labelled as an imported summary. Claims and locators are entered by the researcher. Automatic extraction from DOCX or PDF is outside this phase. A relationship created in the workspace stays proposed until it is explicitly marked reviewed. The initial records are provisional mappings; they require source-specific appraisal before manuscript use.

Leaving a form with unsaved edits, including a constructed-case draft, asks whether to save, discard or stay. Save checks the draft and writes it before navigation continues. Discard continues without saving. Cancel keeps the draft and the current location. A failed check stays on the form and does not report a successful save. Reload or closing the tab uses the browser beforeunload prompt while a draft is dirty. If browser storage throws, the message says the changes are only in memory and that local save failed; JSON export remains available. A constructed case stays a constructed analytical example.

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

Constructed cases are edited in the cases view (facets, source versions, variants) and remain labelled constructed analytical examples in workspace JSON and case export. Cross-reference lists stay in the inspector. **Tuo Zotero CSL** starts a user-initiated CSL-JSON import with a staging preview: DOI and explicit identifiers match first, title/year only suggests possible duplicates, and the researcher reviews conflicts before accept or cancel. Import may create source records and preserve original bibliographic metadata plus attachment paths as metadata only. It does not invent claims, methods, reading status or appraisals, and it does not upload local files. Malformed author fields are flagged for review. This version does not extract claims from DOCX or PDF, call an external AI service, perform bibliometric analysis or analyse empirical ratings. A tiny metadata-only fixture lives at `tests/fixtures/csl-zotero-test.json` and is labelled as test data.

## Figure and data exports

- **JSON / tilannekuva**: complete workspace or versioned snapshot with content hash.
- **Toistettava kuvio**: focused presets (justification, evaluation model, one constructed case) with browser-layout SVG or Graphviz DOT, plus a sidecar manifest and caption draft. See [docs/figures.md](docs/figures.md).
- **Pikainen SVG/DOT**: current visible graph (after the map has been opened for DOT scope).
- **CSV / print**: records or the current view.

```sh
node --experimental-strip-types scripts/export-graph.ts data/research.json out/justification.dot --preset=justification
node --experimental-strip-types scripts/export-graph.ts data/research.json out/justification.svg --preset=justification --mode=browser-layout
node --experimental-strip-types scripts/export-graph.ts research-snapshot.json out/eval.pdf --preset=evaluation-model --format=pdf
```

Graphviz SVG/PDF needs a local `dot` on PATH (`dot -V`). If it is missing, the CLI still writes valid DOT and the manifest; it does **not** claim a PDF was rendered and does not alter PATH. Reported / adaptation / hypothesis remain visible through labels, line styles and colour. Caption drafts state scope and proposed links; they do not invent a scientific conclusion. Byte-identical rendering across unpinned environments is not promised.

## GitHub Pages

Create a separate repository and place this project's contents at its root, including `.github/`. In **Settings → Pages**, select **GitHub Actions** as the source. Relative asset paths and hash navigation support a repository subpath such as `/research-evidence-explorer/`.

Checks and deployment are separate:

- `.github/workflows/check.yml` runs on pull requests and on pushes to `main`. It uses `contents: read`, installs from the lockfile, and runs `npm run typecheck`, `npm test`, `npm run build` and `npm run test:smoke`.
- `.github/workflows/pages.yml` runs only when started by hand (`workflow_dispatch`). It re-runs the same required checks on the exact checked-out revision, then uploads `dist/`. Permissions are `contents: read`, `pages: write` and `id-token: write`. A push to `main` does not publish. A successful check on an earlier commit is not used as a substitute.

`npm run build` validates `data/research.json` as schema 2, runs Vite with `base: './'`, and writes an explicit publication projection to `dist/published-seed.json` plus `dist/published-seed.manifest.json` (see [docs/published-seed.md](docs/published-seed.md)). The projection clears `editLog` and `recordRevisions` and keeps curated records, including the decision record and nested legacy import. Basis strings may name DOCX files; DOCX bytes, browser localStorage, actor labels and import backups are never copied into `dist/`. The browser bundle must not contain `node:child_process` / Graphviz spawn tooling.

## Checks

Verified locally on 26 October 2026 against git commit `6926223` **with uncommitted hardening changes** present in the working tree (this pass). GitHub Actions was not run.

- `npm run typecheck`: exit 0 (`tsconfig.json` browser app; `tsconfig.node.json` for `figures-graphviz` and scripts).
- `npm test`: 53 passed, 0 failed.
- `npm run build`: succeeded with Vite 7.3.7. Published counts: sources 11, claims 11, constructs 9, criteria 7, propositions 4, relationships 32, cases 3, protocols 4, decisions 1, editLog 0. Browser JS bundle contained no `node:child_process` / `spawnSync`.
- `npm run test:smoke`: 11 passed against `http://127.0.0.1:4173/research-evidence-explorer/`.
- `where.exe dot`: Graphviz `dot` is not on PATH. Graphviz SVG/PDF/PNG rendering remains unverified on this machine.

Not run: GitHub Actions workflows, Pages deployment, `file://` opening of the build.

### Manual release

1. Commit the intended revision. Leave the workspace DOCX files unstaged.
2. Confirm `npm run typecheck`, `npm test`, `npm run build` and `npm run test:smoke` on that revision.
3. In GitHub, start **Deploy GitHub Pages** (`workflow_dispatch`). The workflow re-runs those checks on the deployed SHA before upload. This task did not publish.

## Next research step

Passage-level reconciliation of the two source documents is still open. Names that appear there but not as seed records were not added, and the imported summaries were not checked against the original papers. That comparison is not part of this interface port.

## Files

| Path | Purpose |
|---|---|
| `data/research.json` | Curated schema 2 workspace |
| `src/model.ts` | Validation, migration, directed path search, CSV and DOT |
| `src/` | React workspace, hash routes and React Flow map |
| `scripts/build.ts` | Schema 2 check, Vite build, and explicit `published-seed.json` |
| `src/publish.ts` | Publication projection rules for the Pages seed |
| `docs/published-seed.md` | Public-seed selection rules and review checklist |
| `tsconfig.json` / `tsconfig.node.json` | Browser app vs Node tooling typecheck |
| `src/figures-graphviz.ts` | Optional Node-only Graphviz detect/render (excluded from browser project) |
| `scripts/preview-subpath.ts` | Serves `dist/` under `/research-evidence-explorer/` for browser tests |
| `playwright.config.ts` | Playwright smoke configuration |
| `tests/browser/` | Browser smoke tests |
| `src/Modal.tsx` | Native `<dialog>` modal used by the workspace dialogs |
| `.github/workflows/check.yml` | Pull-request and `main` validation |
| `.github/workflows/pages.yml` | Manual Pages deployment |
| `scripts/export-graph.ts` | Snapshot-aware figure CLI (browser SVG / Graphviz DOT±render) |
| `scripts/migrate.ts` | Schema 1 or schema 2 JSON to a checked schema 2 file |
| `src/matrix.ts` | Criterion/source/argument projections and matrix JSON export |
| `src/cases.ts` | Constructed-case hydration, coverage layers and case export |
| `src/protocols.ts` | Proposition/protocol hydration, anchor revision and protocol export |
| `src/snapshots.ts` | Edit log, canonical content/layout hashes, snapshot export/import/compare |
| `src/figures.ts` | Focused figure presets, browser SVG, Graphviz DOT, manifest and caption |
| `docs/snapshots.md` | Canonicalisation procedure and audit disclaimers |
| `docs/figures.md` | Reproducible figure modes, presets and CLI |
| `scripts/seed-protocols.ts` | Seed P1–P3 protocols without inventing observations |
| `tests/` | Model integrity, migration, matrix/cases/protocols/snapshots provenance, hash routes and trace wording |
| `dist/` | Built deployment, served by a static server or Pages |

## License

Original software in this prototype is available under the MIT license in `LICENSE`. Bibliographic metadata and research summaries retain their scholarly attribution; this license does not grant rights to redistribute the underlying papers or supplied documents.
