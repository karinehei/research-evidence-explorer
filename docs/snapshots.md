# Research snapshots and local decision history

Portable snapshots and the append-only edit log live in schema 2 beside the existing collections. Browser-local JSON can be edited outside the app; this is **not** a tamper-proof audit system and does not imply authenticated attribution.

## Decision log (`editLog`)

Each normal commit appends an event with:

- stable `id`
- `at` — editing timestamp (ISO), **not** a bibliographic publication date
- `kind` — `create` | `update` | `delete` | `undo` | `import` | `csl-import` | `layout` | `other`
- `summary`, `reason`
- `actorLabel` — optional researcher-entered label; empty means unattributed (never invented)
- `recordIds` — linked record identifiers
- `before` / `after` — previous and next values (or a recoverable summary/patch payload)
- `reversesEventId` — set only for `undo`
- `note` — includes the local-audit disclaimer when recorded by the app

Corrections append another event. Undo restores prior scientific/layout content but **keeps** the forward log and adds an `undo` event so the reversed change remains inspectable. Session undo still follows the existing stack semantics (no silent rewrite of earlier events).

`recordRevisions` stores a monotonic revision counter per record id. Counters are not rewound on undo.

## Snapshot export

`createSnapshot()` writes:

- `exportType: "research-snapshot"`
- `schemaVersion`, `project`, `exportedAt`
- full `workspace` (records, layouts, decisions, protocols, cases, edit log, revisions)
- `contentHash` and `layoutHash`
- documented `canonicalisation` block with `hashValidatesResearch: false`

A hash identifies content. It does **not** validate the research.

## Canonicalisation (reproducible)

Version `1` (also embedded in each snapshot):

1. Copy the workspace and remove every `position` field (layout identity).
2. For the **content** hash, also omit `editLog`, `recordRevisions` and `legacy`.
3. Sort object keys alphabetically at every level.
4. Sort record collections by `id`.
5. `JSON.stringify` with no extra whitespace.
6. SHA-256 hex, prefixed `sha256:`.

The **layout** hash uses only `{ recordId: { x, y } }` for records that have coordinates, with the same key sorting and SHA-256 step.

Reproduce in code: `contentHash(workspace)` / `layoutHash(workspace)` in `src/snapshots.ts`.

## Import

Import is transactional relative to the last valid workspace:

1. Parse JSON (plain workspace or snapshot wrapper).
2. Migrate schema 1 if needed; validate schema 2.
3. Preview replacement effects (added/removed ids; changed definitions, criteria, evidence links, proposition wording).
4. On accept: store a browser-local pre-import backup, replace the workspace, append an `import` event.
5. On parse, migration, validation or storage failure: keep the previous valid workspace.

Identities are not merged. Unresolved `versionOf` chains are not discarded automatically (validation still rejects broken chains).

Browser-local saving stays on this origin. Explicit export is the portable copy. Backups are not uploaded to a server or GitHub automatically.
