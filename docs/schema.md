# Schema 2

Schema 2 is the stored shape of the research workspace. `src/model.ts` validates it for the browser and for Node. There is no database server. A workspace lives in `data/research.json`, in browser `localStorage` under `research-evidence-explorer-v1`, or in a JSON export.

`node --experimental-strip-types scripts/migrate.ts <input.json> [output.json]` accepts schema 1 or schema 2. Schema 1 is migrated. Schema 2 is checked and written unchanged. `npm test` and `npm run build` use the same module. The build rejects an invalid seed before it writes `dist/`.

## Record collections

Identifiers match `^[a-zA-Z0-9_-]{1,120}$` and are unique across every collection. Schema 1 allowed 80 characters and kept node, edge and case identifiers in separate sets. Schema 2 uses one set, so a schema 1 file whose node and edge identifiers collide is rejected instead of being merged.

A workspace needs 1–400 graph records in total. Graph records are sources, constructs, criteria and propositions. Claims are capped at 400, relationships at 1,200, assessment protocols at 40, cases at 20 and research decisions at 40. Protocols are not graph nodes. Long text fields allow 8,000 characters. Labels allow 160. Coordinates must be finite and within ±20,000. URLs must be empty or start with `http://` or `https://`.

### Source

Bibliographic identity: `id`, `label`, `citation`, `year`, `publicationStatus`, `versionOf`, `doi`, `url`.

Reported access: `access`, `accessNote`. Researcher note fields: `notes` and optional `nextCheck`. Optional layout: `position`.

Optional `researchRole` records how the source is used in this workspace: `not-recorded`, `conceptual`, `technical`, `empirical` or `tool-workflow`. Roles are descriptive and are not ranked as interchangeable frameworks. A missing or `not-recorded` value means the role was not written down; it is not a quality score. Seed sources leave the field unset so the matrix shows “Ei kirjattu” until a researcher sets it.

Optional `bibliographicImport` stores a Zotero CSL-JSON import provenance without changing `schemaVersion`. It records `importedAt`, `provider` (`zotero-csl-json`), `itemKey`, `citationKey`, the sanitized `original` CSL object, `attachments` as metadata only (`title`, `path`, `linkMode`, `contentType`), and `flags` for review (for example a malformed author string). Attachment file contents are not stored. A missing `nextCheck` or `bibliographicImport` remains valid, as with claim `position`.

`publicationStatus` is `not-recorded`, `preprint`, `published`, `in-press`, `manuscript` or `not-applicable`. `access` remains `reported-full-text`, `reported-abstract`, `not-recorded` or `not-applicable`. `versionOf` is empty or the id of another source, and the chain cannot cycle.

Bibliographic CSL import may create source records. It does not create claims, invent methods, set reading status, or mark appraisal. DOI and explicit item identifiers are primary duplicate matches. Title and year only suggest a possible duplicate for review. Publication metadata stays separate from evidence appraisal.

### Source claim

What a source is reported to establish: `statement`, `methodContext`, `locator`, `limitations`, `basis` and `notes`.

`provenance` is `imported-summary` or `primary-inspection`. `appraisal` is `not-appraised` or `appraised`. `epistemicStatus` and `reviewState` are the shared enumerations below. `sourceId` must name a source.

A claim may also store an optional `position`. The coordinate rule is the same as for the other visual records, and a missing position stays valid. This does not change `schemaVersion`. A schema 1 export and a schema 2 export without claim positions still load. Resetting the column layout removes a saved claim position.

`primary-inspection` is available only when a researcher selects it. Migration never writes it.

### Construct

`definition`, `object`, `unit`, `scope`, `competingDefinitions` and `boundary`. `boundary` is the selected boundary. The other definition fields can stay empty until they are appraised. A construct also has `epistemicStatus`, `reviewState`, `basis`, `locator`, `notes` and an optional `position`.

### Criterion

`constructIds`, `evidenceRequirements`, `assessor`, `decisionRule`, `permittedInference`, `validationNeed` and `unit`, plus the shared epistemic, review, basis, locator, notes and position fields.

`constructIds` may be empty. That is an unresolved reference, not a validation error. An id in the list must name a construct. `permittedInference` is the boundary of what the criterion licenses. `validationNeed` is the remaining check, not a result.

The seed criterion `expert` is still one criterion, “Viisi erillistä asiantuntija-arviota”. Its construct references are `credibility` and `verification`. The five dimensions were not split into new records, because the seed does not contain those records or any ratings.

### Relationship

`meaning` is `motivates`, `operationalises`, `complements`, `questions` or `proposes`. `source` and `target` are graph-record ids. `claimIds` and `sourceIds` are additional references, not endpoints. `rationale`, `locator`, `epistemicStatus`, `reviewState` and `reviewNote` belong to the relationship itself.

`relationshipDraft()` creates a user relationship as `proposed`. The only way that helper stores `reviewed` is when the caller passes `reviewed`. Passing `imported` still returns `proposed`. Saving an existing relationship does not change its review state unless the review field is changed.

### Proposition, assessment protocol, constructed case and research decision

A proposition has `statement`, `boundary`, `unit`, `criterionIds`, `constructIds`, conceptual design fields (`conceptualRationale`, `intendedClaimKind`, `intendedClaim`, `proposedDesign`, `counterexamples`, `evidenceNeeded`), `protocolIds` and `statementRevisions`. Changing the statement requires a logged rationale. P1–P3 keep their seed wording unless a revision is explicitly justified and logged. `intendedClaimKind` distinguishes `association`, `controlled-comparison`, `paired-coverage` and `other`; these are planned claims, not established positive effects.

An assessment protocol (`protocols`, kind `assessment-protocol`) is a provisional plan, not a result set. It links propositions, criteria and constructs; stores five separate expert dimensions (draft wording, ordinal anchors, assessor instructions, and “cannot assess” with a reason outside the numeric scale); keeps correctness and successful verification as `separateAudits`; names future rating targets as saved answer + display condition; preserves question / information-need / query-variant / rater identities; records blinding, randomisation, repeated observations and disagreement handling; and links open validation questions to concrete checks (`construct-interpretation`, `finnish-wording`, `annotation-consistency`, `evaluator-errors`, `task-applicability`). Status stays `provisional-draft` until validation evidence supports stronger language. `observations` must be empty and `compositeTrustScore` must be `not-computed`. Inter-rater agreement is not treated as construct validity. Protocol JSON export repeats the provisional disclaimer and does not invent observations.

A case stays `kind: "constructed"` with fixed `analyticLabel: "constructed-analytical-example"`. `empirical` is rejected: a future empirical case needs a distinct record type and explicit run provenance. Beside the summary `columns`/`rows` table, a case stores a task-to-evidence structure:

- `taskReference`: statement, essential qualifications, temporal scope, acceptable source-version ids
- `facets`: per-facet `collection` / `context` / `answer` states (`full`, `partial`, `absent`, `conflicting`, `unresolved`), essential flag, evidence refs, reason
- `sourceSnapshots`, `passages`, `savedContexts`
- `answerVariants`, `claimAnnotations`, `displayConditions` (claim support and citation display are separate audits)
- `unmeasured`: verification success/time and expert ratings stay `not-measured` (values are not invented)

Schema 1 cases and older flat schema 2 cases hydrate empty structured lists on load. Case edits go through the same validate/commit/undo path as other workspace records. Constructed-case JSON export repeats the analytic label and disclaimer.

A case may also store `propositionIds`, `criterionIds` and `decisionIds`. Those lists are not inferred from the case prose.

A research decision has `statement`, `scope`, `rationale`, `epistemicStatus`, `reviewState` and `recordIds`. The migration decision `decision_schema1_import` documents the import. Its `recordIds` list is empty: the preserved schema 1 document is `legacy.document`, not a live index that would have to change on every deletion.

### Edit log and record revisions

`editLog` is an append-only local decision history (capped at 500). `recordRevisions` stores per-record revision counters. Missing arrays hydrate to empty on load. Editing timestamps in the log are not bibliographic publication dates. Optional `actorLabel` is researcher-entered and never invented. Portable snapshot export/import, content/layout hashes and comparison are documented in [snapshots.md](snapshots.md).

## Three independent statuses

Epistemic status describes the claim being made: `reported`, `adaptation` or `hypothesis`. It is not a quality grade. There is no `verified` value.

Review state describes the workspace record: `imported`, `proposed` or `reviewed`. An imported record can stay imported after it is edited. A proposed relationship stays proposed until a person sets `reviewed`.

Publication status describes the bibliographic item only. It is not inferred from a DOI, a URL, a year, a preprint server or the access value. Access says what the planning documents reported about reading. Appraisal says whether the method has been appraised. Full text does not raise appraisal, and a preprint does not lower it.

The graph states each epistemic category in the line style, the colour and a text label. Reported links are solid, adaptations dashed and hypotheses dotted. The solid style means “reported, not independently verified”. A line from a source to its claim is a membership reference: it has no arrowhead, it is not stored as a relationship, and it does not mean a cause.

## Migration from schema 1

`migrate()` checks the schema 1 document, builds a new document and checks that too. It does not modify the input. `load()` accepts schema 1 and schema 2. Any other version, including a missing version, throws. `applyImport(current, incoming)` returns `{ ok, model, error }`. On failure `model` is the same `current` reference and `current` is not modified. `validate()` and `migrate()` return copies.

The migrated document stores the checked schema 1 input at `legacy.document`, with `legacy.preservedBeforeReplacement: true`. Loading that schema 2 document again does not wrap another copy around it.

| Schema 1 | Schema 2 |
| --- | --- |
| `literature` | epistemic status `reported` |
| `adaptation`, `hypothesis` | the same epistemic values |
| source node | source plus `claim_<sourceId>` |
| source `description` | claim `statement` |
| source `boundary` | claim `limitations` |
| source `notes` | source `notes`; the claim note stays empty |
| source `status` | claim `epistemicStatus` |
| concept | construct; `description` becomes `definition` |
| criterion | criterion; `description` becomes `evidenceRequirements`; `boundary` becomes `permittedInference` |
| question | proposition; `description` becomes `statement` |
| edge | relationship with the same id, endpoints, label, rationale and locator |
| `operationalises` from a concept to a criterion | that concept id is added to `constructIds` |
| `proposes` from a criterion to a proposition | that criterion id is added to `criterionIds` |
| edge endpoint that is a source | `sourceIds` and `claim_<id>` on that relationship |
| case | the same case, with empty cross-reference lists |

Every migrated record has `reviewState: "imported"`. Every migrated claim has `provenance: "imported-summary"` and `appraisal: "not-appraised"`, including the source whose access is `reported-full-text`. The claim text is the old summary. It is not rewritten into a quotation or a primary-source finding.

`publicationStatus` is `not-recorded` for every migrated source. `year` is left empty; years are not parsed out of labels. `citation` copies the short label. `doi` is copied only when `url` matches `http(s)://doi.org/...` or `dx.doi.org`. That copy is an identifier, not evidence that the item is published. `versionOf` is empty. `methodContext`, construct `object`, `scope` and `competingDefinitions`, and criterion `assessor` and `decisionRule` are empty. A criterion with no operationalising concept link gets a fixed Finnish `validationNeed`; the seed's seven criteria all had such a link.

Positions are copied when present and omitted otherwise. The representative export fixture `tests/fixtures/schema1-export.json` checks that a note, a position and an edited relationship label survive. `tests/fixtures/schema1-seed.json` is the schema 1 seed from before replacement.

## Deletion

`planRemoval(model, id)` returns a new model. The input is not changed. Endpoints, claim references, source references, construct references, criterion references, case references, decision references and `versionOf` are updated in that same result. A source deletion also removes that source's claims. A relationship that ended on a removed graph record is removed. A criterion that loses its last construct keeps the criterion and receives the note `Käsiteviite poistettiin; viite on täsmennettävä.` when that note is not already present.

The result names every affected record. The workspace asks for confirmation when the change removes a claim or detaches a reference. Removing only the selected record, or only the relationships that ended on it, is one undoable step without that extra dialog. The last source, construct, criterion or proposition cannot be removed. Undo uses the existing session stack of 30 entries.

## Matrix projection

The assessment matrix (`src/matrix.ts`, Arviointimatriisi) does not store a second copy of the model. Criterion-oriented and source-oriented rows are projections of the same schema 2 collections used by the graph and inspector. Selecting a criterion, construct, claim, source or relationship opens that shared record. Edits in the inspector update both views.

A multi-step path `source → construct → criterion` is labelled conceptual ancestry. It is not treated as direct empirical support for the criterion. Adaptation and `operationalises` links stay visible as the researcher's own step. Competing construct definitions are listed separately and are not collapsed into a favourable summary. Blank cells and Finnish empty-state copy use explicit wording such as “Ei kirjattu”, “Ei arvioitu” and “tarkistettava”. An empty cell is not a research gap and is not coloured by invented coverage or quality scores.

Matrix JSON export (`exportType: research-matrix`) includes stable record ids, the active orientation, filters, selection, related claims and relationships for provenance. Node-only CSV is not the provenance path; relationship rows keep `meaning`, `claimIds` and `sourceIds`.

## Fields that still need researcher appraisal

These were left empty or unresolved on purpose. Filling them would have invented an inspection this migration did not do.

- Publication status is `not-recorded` for all 11 sources, including those with a DOI and including `saukkoriipi26`, whose reported access is full text and whose DOI comes from an arXiv URL. Preprint versus published is still a bibliographic decision.
- `ragas24`, `ares24` and `ragchecker24` remain separate sources with distinct DOIs and reported-abstract access notes. No `versionOf` link was invented among them. Venues and page numbers were not invented.
- `year` was not split from labels such as “Järvelin ym. 2015”. `citation` is still the short label, not a full reference. `versionOf` is empty.
- Claim `methodContext` is empty. Claim locators are the old planning-document locators. They are not page or passage locators checked against the original papers.
- Every claim is an imported summary and is not appraised. Six sources still have access `not-recorded`.
- Construct `object`, `scope` and `competingDefinitions` are empty. The selected `boundary` is only the text that was already in schema 1.
- Criterion `assessor` and `decisionRule` are empty. `validationNeed` is empty because each seed criterion had a concept link, not because the criterion has been validated. The five expert dimensions remain one criterion.
- Thirty of the 32 relationship locators are empty. Imported relationships are not marked reviewed.
- Case prose was not turned into proposition, criterion or decision links. Case B mentions P2 in prose and still has no structured proposition link.
- The questions view lists four propositions. Nothing in this migration tested them.
- Passage-level comparison with the literature matrix and the article brief is still open. Names that appear in those documents but not as seed records were not added.
