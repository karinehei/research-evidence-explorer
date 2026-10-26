# Baseline — 26 October 2026

The current application is a React 19.2.0 and TypeScript 5.9.3 workspace built with Vite 7.3.7. The map uses `@xyflow/react` 12.9.3. The interface is Finnish. Record ids stay in English. Hash routes such as `#graph/sufficiency`, `#matrix`, `#cases/A`, `#questions` and `#history` select the view. Browser edits use `localStorage` key `research-evidence-explorer-v1`. There is no `AGENTS.md`.

## Current data model

`data/research.json` is the curated schema 2 workspace. `npm run build` loads it through `src/model.ts` and refuses anything that is not schema 2. A schema 1 file still imports through the migration in `src/model.ts`. Rules that still need appraisal are in `docs/schema.md`.

The seed checked by the build on 26 October 2026 contains 11 sources, 11 claims, 9 constructs, 7 criteria, 4 propositions, 32 relationships, 3 constructed cases, 4 protocols and 1 decision. Its edit log is empty. `sufficiency` is a construct labelled “Näytön riittävyys”, not a criterion. Constructed cases stay `kind: "constructed"` with analytic label `constructed-analytical-example`.

## Current build

Supported hosting is HTTP or GitHub Pages with `base: './'`. `npm run build` runs Vite and writes `dist/`, plus `dist/published-seed.json` and `dist/published-seed.manifest.json` from `projectPublishedSeed`. That projection clears `editLog` and `recordRevisions` and retains curated records (including the decision record and nested `legacy` when present). Selection rules and review items are in `docs/published-seed.md`. The SPA imports `data/research.json` for first load. Browser localStorage, actor labels, import backups and DOCX bytes are not copied into `dist/`.

TypeScript is split: `tsconfig.json` typechecks the browser app and excludes `src/figures-graphviz.ts`. `tsconfig.node.json` typechecks Node scripts and Graphviz tooling with `@types/node`. `npm run typecheck` runs both. The browser bundle must not embed `node:child_process`.

Graphviz SVG/PDF/PNG remains an optional CLI path (`src/figures-graphviz.ts`, `npm run export-graph`) until `dot` is present and exercised on the release machine.

## What was verified (release-hardening pass)

Base commit: `6926223`. Uncommitted changes from this hardening pass were present in the working tree during the commands below. GitHub Actions was not executed.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 53 passed, 0 failed |
| `npm run build` | Succeeded. Vite 7.3.7. Published counts as listed above, `editLog` 0. Bundle had no Node Graphviz spawn. |
| `npm run test:smoke` | 11 passed against the subpath preview of `dist/` |
| `where.exe dot` | Graphviz `dot` is not on PATH. Graphviz render was not run. |

Earlier in the same day: a release-readiness pass reported 51 unit tests after fixing a journey assertion that treated `sufficiency` as a criterion, plus 11 smoke tests. Those results are historical relative to the 53-test count above (two new snapshot/publish regressions).

Nothing was published or pushed.

## Release split

`.github/workflows/check.yml` runs on pull requests and pushes to `main` with `contents: read`, and requires typecheck, tests, build and smoke. `.github/workflows/pages.yml` deploys only on `workflow_dispatch`, re-runs those checks on the exact revision, then uploads `dist/` (`contents: read`, `pages: write`, `id-token: write`).

## Historical observation — schema 1 static prototype

The rest of this file is the audit of the dependency-free prototype before the schema 2 migration and before the React application. It is not the current stored shape, the current interface, or the current build. Schema 2 rules are in `docs/schema.md`. `architecture-explorer` was not opened, copied or modified.

## Historical canonical data and entry points

`data/research.json` is the only curated source. `npm run build` validates it and writes `dist/`. The build copies `web/index.html`, `web/app.js`, `web/model.js` and `web/styles.css`, then generates `dist/seed.js` as `window.RESEARCH_SEED`. Editing `dist/` does not change the source. `web/index.html` references `./seed.js`, which exists only after the build, so the browser entry is `dist/index.html`.

| Entry | Role |
|---|---|
| `data/research.json` | Canonical workspace |
| `web/model.js` | Validation, directed trace, CSV, DOT |
| `web/app.js` | Finnish UI, local save, undo, import, graph |
| `dist/index.html` | Static page after build |
| `scripts/export-graph.js` | CLI DOT, or SVG/PDF/PNG when Graphviz `dot` is installed |
| `npm test` | `node --test tests/*.test.js` |
| `.github/workflows/pages.yml` | On push to `main` or manual run: `npm test`, `npm run build`, deploy `dist/` |

The Pages workflow uses `ubuntu-24.04`, Node.js 24, and the Node 24 action majors (`checkout` v7, `setup-node` v7, `configure-pages` v6, `upload-pages-artifact` v5, `deploy-pages` v5). This audit did not run GitHub Actions and did not publish the site.

## Schema 1

`schemaVersion` is 1. A record is a `source`, `concept`, `criterion` or `question`. Its epistemic status is `literature`, `adaptation` or `hypothesis`. Access is separate: `reported-full-text`, `reported-abstract`, `not-recorded` or `not-applicable`. A connection is `motivates`, `operationalises`, `complements`, `questions` or `proposes`, with the same epistemic status. Cases must have `kind: "constructed"`. Import rejects another schema, duplicate or dangling ids, non-HTTP links, malformed case rows, and text over the field limits. The UI also refuses files over 2 MB.

There is no field for publication status or methodological appraisal. Those are not implied by access. The relation value `questions` is allowed and unused in the seed.

## Record counts

The seed is a manually selected starting model. It is not a conversion of the literature matrix and not a completed review.

| Kind | Count |
|---|---|
| Sources | 11 |
| Concepts | 9 |
| Criteria | 7 |
| Questions | 4 |
| Connections | 32 |
| Constructed cases | 3 (A, B, C) |

Node status: 11 `literature`, 16 `adaptation`, 4 `hypothesis`. Access: 1 `reported-full-text` (Saukkoriipi ym. 2026), 4 `reported-abstract`, 6 `not-recorded`, 20 `not-applicable`. Connections: 13 `motivates`, 9 `operationalises`, 1 `complements`, 9 `proposes`. Thirty of 32 connection locators are empty. No node has a saved position. No node is unconnected.

The matrix walks one step from each criterion to its direct predecessors, then one step further and keeps predecessors whose kind is `source`. Every current criterion has at least one such source. A longer path, or a source connected directly to a criterion, is not shown in that source cell.

## What was run

```text
node --test tests/*.test.js
npm run build
node scripts/export-graph.js data/research.json %TEMP%\research-map.dot
node scripts/export-graph.js data/research.json %TEMP%\research-map.svg
```

`node --test` passed 12 tests, including the curated count check. The build printed `Built dist/ — no external assets or runtime dependencies.` The DOT file was written (5072 bytes) and starts with `digraph Research`. Graphviz `dot` is not on PATH, so the SVG/PDF/PNG CLI path exited 1 with `Graphviz dot is required for SVG/PDF/PNG. DOT export needs only Node.js.`

The built page was opened from a local static server at `http://127.0.0.1:8777/`. That server is not a deployment.

## Browser checks

Checked in the page, then rechecked after the fixes below:

- The seed loads. Undo starts disabled. The first graph is the neighbourhood of `sufficiency`.
- Saving a note writes `localStorage` key `research-evidence-explorer-v1`. Undo restores the note and the stored copy. After a full reload of `#matrix`, the matrix is shown, undo is disabled again, and the saved note is still in storage. Hash routes `#matrix`, `#cases`, `#questions` and `#graph` survive reload.
- Invalid JSON is rejected and the open workspace stays. An import identical to the current workspace no longer says that undo can restore it.
- An empty new record is rejected with `label: virheellinen teksti.` The next full render still shows the previously selected record.
- The directed trace Järvelin & Sormunen 2024 → Näytön riittävyys → Tietoasialle tehtävä kattavuustarkastus → P1 matches the model test.
- The matrix lists 7 criteria. Cases A–C open as constructed examples, including the statement that expert ratings were not collected. All four questions are listed. “Tutki perusteluketjua” returns to the graph for P1.
- From the full graph, Graafi SVG created a well-formed `research-map.svg` (viewBox width 1100, 94 text nodes, including “Näytön riittävyys”) and clicked an anchor with `download="research-map.svg"`. DOT and CSV from that same graph produced `research-map.dot` and `research-records.csv` with the expected headers. A fresh `#matrix` load, before the graph has been drawn, now refuses DOT instead of downloading an empty graph. SVG from a non-graph view does not download a file.

The browser’s download folder was not inspected. Chrome DevTools download commands are blocked in this session, which is the same class of limit as the earlier report that an SVG click produced no console error while waiting for a completed download timed out. The file contents above were read from the blob the page created. The accessibility snapshot also marks every `aria-current="false"` control as current; the DOM values are `page` for the active view and `false` for the others. The operating-system file picker was not opened. Import was tested by giving the page’s file input a `File`.

## Fixes in this phase

- Edge labels that shared one coordinate are nudged apart. On the full map, 32 labels had 5 exact overlaps before the change and 0 box overlaps after it.
- Column headings sit inside the scrolling graph and take the graph width (1100px against a 647px canvas in this window), so they move with the columns.
- DOT export before the graph has been drawn shows an error and does not save an empty file.
- A no-op import says that nothing changed. A failed save no longer follows itself with a success message, and a rejected new record does not leave the selection on an id that does not exist.
- The full-map button now reads “Näytä valitun kohteen ketjut”.

`data/research.json` was not edited.

## Limits that remain

- The questions introduction names propositions P1–P3. The fourth record, “Miten kriteerit validoidaan?”, is listed with them and is also a hypothesis.
- The status line stays “Paikallinen työtila” after a reload until the next edit, even when the model came from this browser.
- Undo lasts for the open session only, up to 30 changes. Cases are not editable in the page. Touch dragging is off so the canvas can scroll.
- Node labels in the seed fit their boxes. Edge labels can still cross a curve; they no longer share one box.
- Six sources still have access `not-recorded`. Most connection locators are empty, and many rationales repeat the same adaptation wording.
- The two workspace documents were not checked passage by passage against every field. The matrix file present here is `Literature_Matrix_RAG_Evaluation.docx`, not a file named `Literature_Matrix_RAG_Evaluation(2).docx`. The brief is `Year_1_RAG_Conceptual_Article_Brief (2).docx`. Original papers were not read. Their openings name further sources, including Ceresa, Salemi and Zamani, InspectorRAGet, Rana, Snyder and Jaakkola, which are not separate seed records.
- The five expert dimensions remain one criterion, “Viisi erillistä asiantuntija-arviota”. The app does not compute a trust score. Cases A–C stay labelled constructed.

## Ordered checklist

1. Done: baseline audit, the bounded defects above, and this report.
2. Done: schema 2 is in the same static app. Schema 1 files migrate, the original import is kept, and rejected imports leave the workspace unchanged. Publication status, access and appraisal stay independent. The five expert dimensions remain the single criterion `expert`; splitting them would invent records the seed does not contain. See `docs/schema.md`.
3. After that migration: reconcile the seed with the two workspace documents, field by field, and record every original-paper check that is still unresolved. Do not describe the result as a complete review.
4. Only then add interaction that the reconciled model actually needs. Do not add a backend, account, paid API or external model call unless a later phase requires it.
