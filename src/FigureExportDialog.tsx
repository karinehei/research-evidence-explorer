import { useEffect, useState } from 'react';
import {
  FIGURE_GENERATOR_VERSION, buildFigureBundle, type FigureMode, type FigurePreset
} from './figures.ts';
import { contentHash } from './snapshots.ts';
import type { Workspace } from './types.ts';

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function FigureExportDialog({ model, open, onClose, visibleIds, selectedId, focusId }: {
  model: Workspace;
  open: boolean;
  onClose: () => void;
  visibleIds: Set<string>;
  selectedId: string;
  focusId: string;
}) {
  const [preset, setPreset] = useState<FigurePreset | 'visible'>('justification');
  const [mode, setMode] = useState<FigureMode>('browser-layout');
  const [caseId, setCaseId] = useState(model.cases[0]?.id || 'A');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage('');
    void contentHash(model).then(setHash).catch(() => setHash(''));
  }, [open, model]);

  if (!open) return null;

  async function runExport() {
    setBusy(true);
    setMessage('');
    try {
      const ids = preset === 'visible' ? visibleIds : undefined;
      const bundle = await buildFigureBundle(model, {
        mode,
        preset: preset === 'visible' ? undefined : preset,
        ids,
        focusId: focusId || selectedId,
        caseId,
        selectedId,
        snapshotContentHash: hash || undefined,
        graphviz: { available: false, version: null }
      });
      const stem = `figure-${preset}-${mode}`;
      downloadText(`${stem}.figure-manifest.json`, JSON.stringify(bundle.manifest, null, 2), 'application/json');
      downloadText(`${stem}.caption.txt`, `${bundle.captionDraft}\n`, 'text/plain;charset=utf-8');
      if (mode === 'browser-layout' && bundle.svg) {
        downloadText(`${stem}.svg`, bundle.svg, 'image/svg+xml;charset=utf-8');
        setMessage(`Selainasettelun SVG, manifesti ja kuvateksti ladattu. Generaattori ${FIGURE_GENERATOR_VERSION}. Graphviz-PDF vaatii CLI:n.`);
      } else if (bundle.dot) {
        downloadText(`${stem}.dot`, bundle.dot, 'text/vnd.graphviz');
        setMessage(`DOT, manifesti ja kuvateksti ladattu. ${bundle.graphvizInstallHint}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kuvion vienti epäonnistui.');
    } finally {
      setBusy(false);
    }
  }

  return <dialog open className="modal snapshot-dialog">
    <div className="dialog-head"><h2>Toistettava kuvion vienti</h2><button type="button" aria-label="Sulje" onClick={onClose}>×</button></div>
    <p className="subtle">Kaksi eksplisiittistä tilaa: selaimen asettelu (tallennetut sijainnit) tai Graphviz DOT. Ei koko työtilan pakotettua kuviota. Yhteyksien tiedollinen tila säilyy valinnassa.</p>
    <p className="subtle">Sisältötiiviste: {hash || '…'}</p>
    <label>Esiasetus
      <select value={preset} onChange={event => setPreset(event.target.value as FigurePreset | 'visible')}>
        <option value="justification">Lähde–käsite–kriteeri-perustelu</option>
        <option value="evaluation-model">Ehdotettu arviointimalli</option>
        <option value="constructed-case">Yksi rakennettu tapaus</option>
        <option value="visible">Nykyinen näkyvä graafivalinta</option>
      </select>
    </label>
    {preset === 'constructed-case' && <label>Tapaus
      <select value={caseId} onChange={event => setCaseId(event.target.value)}>
        {model.cases.map(item => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}
      </select>
    </label>}
    <label>Vientitila
      <select value={mode} onChange={event => setMode(event.target.value as FigureMode)}>
        <option value="browser-layout">1 · Selainasettelun SVG</option>
        <option value="graphviz">2 · Graphviz DOT (+ CLI SVG/PDF)</option>
      </select>
    </label>
    <p className="subtle">Kuvateksti on rajauksen luonnos; se ei kirjoita tieteellistä johtopäätöstä. PDF-renderöinti vaatii paikallisen `dot`-komennon CLI:ssä.</p>
    <div className="actions">
      <button type="button" className="primary" disabled={busy} onClick={() => void runExport()}>Vie kuvio + manifesti</button>
      <button type="button" onClick={onClose}>Sulje</button>
    </div>
    {message && <p className="subtle" role="status">{message}</p>}
  </dialog>;
}
