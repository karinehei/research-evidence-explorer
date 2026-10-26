# Publication content review — 26 October 2026

Content-only review of the explicit publication projection (`projectPublishedSeed` → `dist/published-seed.json` and `dist/published-seed.manifest.json`), against `docs/published-seed.md`. Working dataset `data/research.json` was compared: with empty `editLog` / `recordRevisions` it is identical to the generated projection.

Recursive string scan of the published artifact (2667 string values): no Windows/Unix home paths, no `file://` URLs, no email addresses, no actor-label values, no DOCX **bytes**. Filenames appearing in `basis` are treated as provenance references, not as confidential filesystem locations.

No projection-code change was applied in this review. Policy already clears only `editLog` and `recordRevisions`. Ambiguous public-surface items stay **researcher decision required** with a concrete proposed treatment.

Git commit base for the technical tree: `6926223` with uncommitted tooling/docs changes present locally. This review does **not** claim researcher approval, GitHub checks or deployment.

## Review table

| Record ID / scope | Field path | Contents | Recommended treatment | Reason / exact decision needed |
|---|---|---|---|---|
| `decision_schema1_import` | `decisions[0].label` | Finnish label “Schema 1 -tuonti” | **Retain** (default) or revise wording | Method label for an import policy decision, not a research finding. Decide: keep label as-is for Pages, or rename for a public audience. |
| `decision_schema1_import` | `decisions[0].statement` | States that each schema 1 literature entry was split into a source plus an explicitly marked imported summary, and that the summary was not treated as a claim checked against the original paper | **Retain** | Documents epistemic caution. Do not rewrite as a validated claim. Decision: confirm this policy text may appear on the public site. |
| `decision_schema1_import` | `decisions[0].scope` | “Säilytetty lähtöaineisto” | **Retain** | Scope of the preserved import, not private annotation. |
| `decision_schema1_import` | `decisions[0].rationale` | Publication status was not inferred from preprint/URL/year; reading level was not treated as methodological quality; original document kept in `legacy.document` | **Retain** (default) | Methodological rationale; points at `legacy.document`. Decision: keep pointing at nested legacy, or after a legacy transform update this sentence to name the chosen provenance stub. |
| `decision_schema1_import` | `decisions[0].epistemicStatus` / `reviewState` | `adaptation` / `imported` | **Retain** | Accurate status markers; must not be changed to imply reviewed/validated research. |
| `decision_schema1_import` | `decisions[0].recordIds` | Empty array | **Retain** | No silent link invention. |
| workspace | `legacy.schemaVersion` / `legacy.preservedBeforeReplacement` | `1` / `true` | **Retain** | Stable provenance flags for the schema 1 import. |
| workspace | `legacy.document` (entire nested schema 1 workspace: project, 31 nodes, 32 edges, 3 cases) | Full pre-migration model; duplicates curated content in schema 1 shape; node `basis` strings also name the planning DOCX files; notes empty; no filesystem paths | **Researcher decision required** | Current policy retains the nested document for provenance. It is not private path data, but it **doubles** public payload and repeats unfinished schema 1 wording. Proposed treatment if Pages should stay lean: in the **publication projection only**, replace `legacy.document` with a stub `{ schemaVersion: 1, preservedBeforeReplacement: true, contentHash: "<hash of omitted document>", recordIds: [...stable ids...] }` while leaving `data/research.json` unchanged. Exact decision: **(A)** retain full `legacy.document` on Pages, or **(B)** adopt the stub projection (requires a deliberate code change and regression after this review). |
| many claims, constructs, criteria, relationships, cases, protocols, propositions | `*.basis` (72 published fields; 10 distinct strings) | Filenames such as `Year_1_RAG_Conceptual_Article_Brief (2).docx` and `Literature_Matrix_RAG_Evaluation(2).docx`, often with short Finnish provenance notes (“yhteenvetoa täydennetty matriisista”, case tags) | **Retain** | These are bibliographic / planning-document **references**, not embedded DOCX content and not identifying filesystem paths. Policy already allows naming source documents without shipping bytes. Decision only if the researcher wants public wording without the literal `.docx` filename (optional transform: map to a stable document id + human title in the projection). |
| same set inside legacy | `legacy.document.nodes[*].basis` (34 strings) | Same DOCX filename references as above | Follows `legacy.document` decision | If full legacy is retained, keep; if stubbed, these leave the public artifact with the omitted document. |
| `protocol_p1` … `protocol_validation` (ids as in seed) | `protocols[0..3].notes` | Method notes: provisional rubric; no invented observations; links to case B / paired coverage / validation checks | **Retain** | Curated methodological notes, not private researcher diary text. Aligns with “no invented observations”. |
| all other curated records | `*.notes` | Empty strings | **Retain** | No unpublished note text present. |
| claims / constructs / criteria (etc.) | `*.locator` | Section-style locators (e.g. “Conceptual foundations and model structure”, “Working constructs…”) | **Retain** | Document section references, not filesystem paths. |
| cases `A`–`C` | case body (`kind`, `analyticLabel`, facets, passages, …) | Constructed analytical examples with `constructed-analytical-example` | **Retain** | Already labelled non-empirical; do not present as measured results. |
| workspace | `editLog`, `recordRevisions` | Empty arrays in working seed and projection | **Transform in publication projection** (already applied) | Cleared by policy even if a future working copy accumulates browser history. |
| — (not in JSON) | browser `localStorage`, actor labels, pre-import backups, DOCX bytes | Absent from `published-seed.json` and from the Vite seed embed of curated JSON | **Excluded automatically** (already) | Confirmed absent from the publication artifact in this scan. |

## Summary

| Area | Result |
|---|---|
| Private filesystem paths / emails / actor labels | None found in working seed or publication artifact |
| DOCX | Filenames in `basis` only; no embedded document content |
| Decision record | Safe to retain as import-policy provenance; confirm public wording |
| `legacy.document` | Only material item that may warrant a **projection** change; left unresolved pending researcher choice A/B above |
| Protocol notes | Retain as curated method text |

## Precise researcher decisions still needed

1. **Decision record text** — Confirm `decision_schema1_import` statement/rationale may appear on the public Pages site unchanged, or supply alternate public wording (working dataset can keep the current text).
2. **`legacy.document` on Pages** — Choose **(A) retain full nested schema 1 document** or **(B) stub it in the publication projection** with hash + stable ids, keeping the full document only in `data/research.json`.
3. **Optional** — Whether public `basis` strings should keep literal `.docx` filenames or use stable document titles/ids in the projection only.

No approval is recorded here.

## Release sequence (after decisions)

1. **Selective commit** of intended code/docs only; leave both untracked DOCX files and unrelated research material unstaged.
2. **Push** the commit to the GitHub repository that hosts Pages.
3. Wait for **GitHub Check** workflow success on that exact SHA (`typecheck`, tests, build, smoke).
4. Start **Deploy GitHub Pages** manually (`workflow_dispatch`) so deploy re-checks that same revision before upload.

This review did not stage, commit, push or deploy. GitHub checks and deployment have not been run as part of this review.
