# Reproducible figure exports

Figure export extends the existing SVG/DOT tooling. It consumes a validated schema 2 workspace or a `research-snapshot` JSON file (`workspaceFromIncoming`).

## Modes

1. **Browser-layout SVG** — preserves the selected visible graph and saved node positions. Native SVG text/shapes only (no HTML-in-SVG embeds, no cloud-architecture icons).
2. **Graphviz DOT** — declared engine/settings (`dot`, `rankdir=LR`, Arial). CLI may render SVG/PDF/PNG when `dot` is available.

## Presets (focused, not the whole workspace)

| Preset | Scope |
|--------|--------|
| `justification` | Source–construct–criterion justification around a focus id (default `sufficiency`) |
| `evaluation-model` | Criteria, linked constructs and propositions |
| `constructed-case` | One constructed case’s recorded proposition/criterion links |

## Sidecar manifest

Each export writes `*.figure-manifest.json` with:

- `snapshotContentHash`
- selected node / relationship / claim ids
- full relationship rows including **epistemicStatus** (selection does not strip status)
- view/filter definition, generator version, layout settings
- tool versions and a reproducibility note (no promise of byte-identical rendering across unpinned environments)
- `captionDraft` — human-readable scope; states whether relationships are proposed; **does not** write a scientific conclusion

## CLI

```sh
node --experimental-strip-types scripts/export-graph.ts data/research.json out/justification.dot --preset=justification
node --experimental-strip-types scripts/export-graph.ts data/research.json out/justification.svg --preset=justification --mode=browser-layout
node --experimental-strip-types scripts/export-graph.ts research-snapshot.json out/eval.pdf --preset=evaluation-model --format=pdf
```

If Graphviz is missing, valid DOT is still written; PDF/SVG render is **not** claimed. PATH and security settings are not modified automatically. Verify with `dot -V`.
