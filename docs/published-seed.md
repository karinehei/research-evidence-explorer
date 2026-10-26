# Published seed boundary

The Pages/`dist` artifact carries an **explicit publication projection** of `data/research.json`, written by `scripts/build.ts` through `projectPublishedSeed` in `src/publish.ts`.

## Selection rules

| Included in `published-seed.json` | Cleared or never copied |
|---|---|
| Curated schema 2 sources, claims, constructs, criteria, relationships, propositions, protocols, constructed cases | `editLog` (always `[]` in the projection) |
| The decision record(s), including `decision_schema1_import` | `recordRevisions` (always `[]` in the projection) |
| Nested `legacy` schema 1 import document when present in the curated seed | Browser `localStorage` key `research-evidence-explorer-v1` |
| `basis` / `locator` strings (may **name** DOCX files) | Actor labels entered only in the browser |
| Empty or curated `notes` fields | Pre-import backup key `research-evidence-explorer-pre-import-v1` |
| | DOCX or other attachment **bytes** |

Clearing `editLog` and emptying DOCX from `dist/` is necessary and insufficient by itself: the curated scientific records that remain must still be reviewed before a public release.

## Researcher review checklist

Before treating a Pages build as a public research surface, review:

1. **Decision record** — currently documents the schema 1 import policy; keep or revise deliberately.
2. **`legacy.document`** — full nested schema 1 workspace retained for provenance; confirm it is intended for the public site.
3. **`basis` strings** — dozens of entries name `Literature_Matrix_RAG_Evaluation…docx` / `Year_1_RAG_Conceptual_Article_Brief…docx` without shipping those files.
4. **Locators and notes** — confirm no private file paths or unpublished researcher notes have been committed into `data/research.json`.
5. **Constructed cases** — remain labelled constructed analytical examples, not empirical results.

## Runtime embedding

The SPA imports `data/research.json` for first load. That is the same curated dataset the projection describes. Browser edits after load stay in local storage until the researcher exports JSON or a snapshot. They do not rewrite `published-seed.json` or the GitHub Pages artifact automatically.

See also `dist/published-seed.manifest.json` after `npm run build` for the machine-readable copy of these rules.
