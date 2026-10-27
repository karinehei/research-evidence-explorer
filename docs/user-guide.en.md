# Research Evidence Explorer — User guide

This guide is for researchers using the curated example to develop and inspect an evidence model. Work is saved in this browser. Finnish and English change the interface display; canonical research text remains Finnish, and an English view may show an original-language fallback notice.

## Contents

- [Quick start](#quickstart)
- [A. Trace sources, constructs and criteria](#graph)
- [B. Appraise through the matrix](#matrix)
- [C. Record literature and claims](#literature)
- [D. Import Zotero CSL-JSON](#csl)
- [E. Develop the conceptual model](#model)
- [F. Use constructed cases A–C](#cases)
- [G. Inspect propositions and protocols](#propositions)
- [H. Save, undo and move work](#saving)
- [I. Export data and figures](#exporting)
- [Interpretation boundaries](#interpretation)
- [Recovery and common problems](#recovery)

<a id="quickstart"></a>
## Quick start: inspect evidence sufficiency

Use the curated example to follow one construct from the matrix into its recorded definitions, claims, procedure and inference limits.

1. **Goal — Choose the display language.** **Action:** Under `Language`, select `Suomi` or `English`. **What you should see:** Interface labels change. Research text may remain in Finnish with an original-language or missing-translation notice.
2. **Goal — Open the criteria linked to Evidence sufficiency.** **Action:** Select `Appraisal matrix`, then choose `Evidence sufficiency` under `Research strand (construct)`. You can also open `#matrix/sufficiency` directly. **What you should see:** A `Construct context: Evidence sufficiency` banner above the filtered matrix.
3. **Goal — Read the scope before interpreting rows.** **Action:** Read the `Construct context` banner and filter value. **What you should see:** Only criteria recorded against this construct. Counts are recorded links, not quality, coverage or validation.
4. **Goal — Open a criterion’s full recorded content.** **Action:** Select `Show details` on a compact row. **What you should see:** The control becomes expanded and detail sections appear.
5. **Goal — Separate foundations, claims, procedure and limits.** **Action:** Inspect `Definitions and conceptual basis`, `Source claims and justification links`, `Operational procedure`, and `Inference limits and validation needs`. **What you should see:** The basis, support chain, proposed operation and permitted inference remain separate.
6. **Goal — Follow the recorded chain.** **Action:** Inside the details, select a linked claim or construct, or use `Inspect link (…)`. Then select `Edit record` if you need the full editor. **What you should see:** The selection updates while the construct context filter remains. The matrix does not keep a permanent inspector open; the link itself does not establish correctness or causality.
7. **Goal — Distinguish literature from the study’s adaptation.** **Action:** Read the epistemic tags and legend: `Reported, not verified`, `Own adaptation`, and `Untested proposition`. **What you should see:** Reported literature, researcher-defined operationalisation and untested proposals remain distinct.
8. **Goal — Return without losing workspace context.** **Action:** Close the details, keep the filter, or select `Show all criteria` to clear only that filter. `Compact`/`Full` changes density; `Edit record` opens the selected record separately. **What you should see:** Closing details keeps the workspace; `Show all criteria` returns to all criteria.

<a id="graph"></a>
## A. Trace sources, constructs and criteria

1. Open `From sources to criteria`.
2. Select a node to inspect its full text and direct links in the inspector.
3. Use `Show chains for the selection` for a focused view, or `Show full map` for the recorded map.
4. Open `Trace a justification path`, choose `Start` and `End`, then select `Show path`.

Search and `Evidence status` can hide records. A path follows recorded directed links; it does not confirm a valid argument. Graph links are explanatory or proposed relationships, not causal effects.

<a id="matrix"></a>
## B. Appraise through the matrix

`Appraisal matrix` opens in `Compact` criterion view. Expand rows with `Show details`, use `Research strand (construct)`, and open `More filters` for epistemic or appraisal state. `Full` shows the wide table.

- `Criterion view` organises criteria and their recorded chains.
- `Source view` organises sources by recorded research role; roles are not rankings.
- `Argument view` inspects a selected research decision and does not invent results.
- `Edit record` opens a modal editor for the selected record.
- `Export matrix selection JSON` and `Export records CSV` export the current projection.

<a id="literature"></a>
## C. Record literature and claims

1. On the graph, select `Add record` and choose a source or another research record type.
2. For a source, record bibliographic identity, publication/version information, reported reading status and researcher notes.
3. Add each source claim manually. Record the claim, method or context, locator, limitations, provenance, methodological appraisal and notes.
4. Keep reported reading status separate from appraisal: it describes what planning documents reported, not source quality.

A bibliographic record is not a full-text appraisal. Claims are not extracted automatically, and a claim is marked checked from the original source only by the researcher.

<a id="csl"></a>
## D. Import Zotero CSL-JSON

1. Select `Import Zotero CSL`.
2. Choose a CSL-JSON file of at most 2 MB.
3. Review tags such as `DOI match`, `Identifier match` or `Possible duplicate (title/year)`.
4. Choose `Create new source`, `Skip` or `Link to existing`.
5. Select `Accept import`, or `Cancel`/`Close` to leave the workspace unchanged.

Import creates or links bibliographic sources and keeps attachment metadata. It does not invent claims, methods, reading status or appraisals.

<a id="model"></a>
## E. Develop the conceptual model

- For a construct, record its definition, object, unit, scope, competing definitions and selected boundary.
- For a criterion, connect `Construct references` and record evidence requirement, assessor, unit, decision rule, permitted inference and `Validation still to specify`.
- For a relationship, choose `Link meaning` explicitly and record `Rationale and application boundary`, evidence references and epistemic status.
- A new link stays proposed until reviewed; an arrow does not mean causation.

<a id="cases"></a>
## F. Use constructed cases A–C

- `A · Supported claim, missing exception` shows that a supported claim can coexist with missing essential task information.
- `B · Same evidence, different locatability` keeps claim and evidence constant while the displayed locator differs; verification success and time are not measured.
- `C · Older source for a present-time task` separates historical support from adequacy for a current task.

Select `Edit case`, change fields, then `Save case`. The `Constructed analytical example · Not a research result` tag remains after editing and in export.

<a id="propositions"></a>
## G. Inspect propositions and protocols

`Assumptions and questions` keeps propositions, provisional protocols and research decisions separate from reported findings.

- Five dimensions: Perceived trustworthiness, Usefulness, Source transparency, Source sufficiency (expert-rated), and Perceived verifiability.
- Claim support, correctness, displayed citation, source currency and successful verification remain separate audits.
- Protocol exports contain no invented observations or composite score. Draft anchors require a recorded rationale to change.

<a id="saving"></a>
## H. Save, undo and move work

- `Saved in this browser` means localStorage for this browser and site origin, not a server copy.
- `Export JSON` creates a portable workspace. `Snapshot / import` exports or previews a versioned snapshot with hashes and history.
- `Undo` restores a recent change in the open session and records the reversal. `History and snapshots` shows the local decision log.
- On a dirty form, `Save and continue` validates and saves, `Discard changes` leaves without saving, and `Cancel` keeps the draft and location.

<a id="exporting"></a>
## I. Export data and figures

- The matrix provides current-selection JSON and records CSV.
- `Export view` offers workspace JSON, snapshot, reproducible figure, quick graph SVG, Graphviz DOT, records CSV and browser print.
- Browser-layout SVG uses saved browser positions. Graphviz DOT is a text description; Graphviz SVG/PDF rendering needs a local `dot` command. The browser does not render a Graphviz PDF.

<a id="interpretation"></a>
## Interpretation boundaries

- Connection ≠ causality.
- Missing matrix entry ≠ research gap.
- CSL metadata ≠ full-text appraisal.
- Claim support ≠ correctness ≠ evidence sufficiency.
- Perceived verifiability ≠ observed verification success.
- Cases A–C are constructed analytical examples.
- Language switching changes display only, not canonical research data.
- An original-language fallback means no current English overlay is available, so Finnish canonical text is shown.

<a id="recovery"></a>
## Recovery and common problems

- **Records hidden:** clear Search, Evidence status or matrix filters, or select `Show all criteria`.
- **No linked evidence:** no link is recorded here; this does not prove that evidence does not exist.
- **English unavailable:** read the fallback and switch to `Suomi` when needed.
- **Unsaved changes:** use `Save and continue`, `Discard changes` or `Cancel`; failed validation keeps the draft.
- **Import rejected:** correct file size, schema or references; the current workspace is preserved.
- **Storage fails:** the change remains in memory for this session; use `Export JSON` before reload or close.
- **Graphviz missing:** export DOT or browser-layout SVG; install local `dot` before CLI PDF rendering.
- **Another computer:** use `Export JSON` or a snapshot, then import it in the other browser.
