import { useEffect, useState } from 'react';
import {
  AUDIT_DISCLAIMER, CANONICALISATION_PROCEDURE, HASH_DISCLAIMER, LOCAL_SAVE_DISCLAIMER,
  applySnapshotImport, compareSnapshots, contentHash, createSnapshot, layoutHash,
  loadPreImportBackup, previewImport, storePreImportBackup, type ImportPreview, type SnapshotComparison
} from './snapshots.ts';
import { Modal } from './Modal.tsx';
import type { Workspace } from './types.ts';

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SnapshotDialog({ model, open, onClose, onReplace, actorLabel }: {
  model: Workspace;
  open: boolean;
  onClose: () => void;
  onReplace: (next: Workspace, message: string, backup: Workspace, options?: { skipAutoLog?: boolean }) => boolean;
  actorLabel: string;
}) {
  const [content, setContent] = useState('');
  const [layout, setLayout] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pending, setPending] = useState<unknown>(null);
  const [compare, setCompare] = useState<SnapshotComparison | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setPreview(null);
    setPending(null);
    setCompare(null);
    void (async () => {
      try {
        setContent(await contentHash(model));
        setLayout(await layoutHash(model));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Tiivisteen laskenta epäonnistui.');
      }
    })();
  }, [open, model]);

  if (!open) return null;

  async function exportSnapshot() {
    setBusy(true);
    try {
      const snapshot = await createSnapshot(model);
      downloadText('research-snapshot.json', JSON.stringify(snapshot, null, 2));
      setMessage(`Tilannekuva vietiin. Sisältötiiviste ${snapshot.contentHash}. ${HASH_DISCLAIMER}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Vienti epäonnistui.');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMessage('Tiedosto ylittää 2 Mt:n tuontirajan.'); return; }
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text());
      const nextPreview = previewImport(model, parsed);
      setPreview(nextPreview);
      setPending(nextPreview.ok ? parsed : null);
      if (!nextPreview.ok) setMessage(`Tuonti hylättäisiin; nykyinen työtila säilyy. ${nextPreview.error}`);
      else {
        setMessage('Esikatselu valmis. Hyväksyntä korvaa työtilan; tunnisteita ei yhdistetä.');
        if (nextPreview.model) setCompare(await compareSnapshots(model, nextPreview.model));
      }
    } catch (error) {
      setPreview(null);
      setPending(null);
      setMessage(`Jäsennyksen epäonnistui; nykyinen työtila säilyi. ${error instanceof Error ? error.message : ''}`);
    } finally {
      setBusy(false);
    }
  }

  function confirmImport() {
    if (!pending || !preview?.ok || !preview.model) return;
    const stored = storePreImportBackup(model);
    const result = applySnapshotImport(model, pending);
    if (!result.ok) {
      setMessage(`Tuonti hylättiin; nykyinen työtila säilyi. ${result.error}`);
      return;
    }
    const ok = onReplace(
      result.model,
      stored
        ? 'Tilannekuva tuotiin. Edellinen työtila on palautettavissa paikallisesta tuontivarmuuskopiosta tai Kumoa-toiminnolla.'
        : 'Tilannekuva tuotiin, mutta paikallista tuontivarmuuskopiota ei voitu kirjoittaa. Vie JSON säilyttääksesi edellisen tilan.',
      result.backup
    );
    if (ok) onClose();
  }

  function restoreBackup() {
    const backup = loadPreImportBackup();
    if (!backup) { setMessage('Paikallista tuontivarmuuskopiota ei löydy.'); return; }
    const ok = onReplace(backup.workspace, `Tuontia edeltävä työtila palautettiin (${backup.savedAt}).`, model, { skipAutoLog: false });
    if (ok) onClose();
  }

  return <Modal open={open} title="Tilannekuvat ja tuonti" onClose={onClose} className="snapshot-dialog" initialFocus="primary">
    <p className="subtle">{LOCAL_SAVE_DISCLAIMER}</p>
    <p className="subtle">{HASH_DISCLAIMER}</p>
    <p className="subtle">{AUDIT_DISCLAIMER}</p>
    <p className="subtle">Valinnainen nimiö tässä istunnossa: {actorLabel.trim() || 'ei annettu'}.</p>
    <h3>Nykyiset tiivisteet</h3>
    <p className="subtle">Sisältö: {content || '…'}</p>
    <p className="subtle">Asettelu: {layout || '…'}</p>
    <details><summary>Kanonisointimenettely (toistettava)</summary><p className="subtle">{CANONICALISATION_PROCEDURE}</p></details>
    <div className="actions">
      <button type="button" className="primary" disabled={busy} onClick={() => void exportSnapshot()}>Vie tilannekuva JSON</button>
      <label className="file-button">Tuo tilannekuva / työtila
        <input type="file" accept=".json,application/json" hidden onChange={event => { const file = event.target.files?.[0] || null; event.target.value = ''; void onFile(file); }} />
      </label>
      <button type="button" onClick={restoreBackup}>Palauta tuontivarmuuskopio</button>
    </div>
    {preview && <PreviewBlock preview={preview} compare={compare} />}
    {preview?.ok && <div className="actions"><button type="button" className="primary" onClick={confirmImport}>Hyväksy korvaava tuonti</button><button type="button" onClick={onClose}>Peruuta</button></div>}
    {message && <p className="subtle" role="status">{message}</p>}
  </Modal>;
}

function PreviewBlock({ preview, compare }: { preview: ImportPreview; compare: SnapshotComparison | null }) {
  return <div className="protocol-panel">
    <h3>Tuonnin esikatselu</h3>
    <p className="subtle">{preview.note}</p>
    {!preview.ok && <p className="error">{preview.error}</p>}
    {preview.ok && <>
      <p className="subtle">Lisättävät: {preview.addedIds.join(', ') || '—'}</p>
      <p className="subtle">Poistuvat: {preview.removedIds.join(', ') || '—'}</p>
      <p className="subtle">Ratkaisemattomat versionOf (ei poisteta automaattisesti): {preview.unresolvedVersionOf.join(', ') || 'ei (validointi estää rikkinäiset ketjut)'}</p>
      <ChangeList title="Muuttuneet määritelmät" rows={preview.changedDefinitions} />
      <ChangeList title="Muuttuneet kriteerit" rows={preview.changedCriteria} />
      <ChangeList title="Muuttuneet näyttöviitteet" rows={preview.changedEvidenceLinks} />
      <ChangeList title="Muuttuneet propositiot" rows={preview.changedPropositions} />
      {compare && <p className="subtle">Sisältötiiviste sama: {compare.contentHashEqual ? 'kyllä' : 'ei'} · Asettelutiiviste sama: {compare.layoutHashEqual ? 'kyllä' : 'ei'}</p>}
    </>}
  </div>;
}

function ChangeList({ title, rows }: { title: string; rows: { id: string; label: string; before: string; after: string }[] }) {
  if (!rows.length) return <p className="subtle">{title}: ei muutoksia.</p>;
  return <>
    <h4>{title}</h4>
    <ul>{rows.map(row => <li key={row.id}><strong>{row.label || row.id}</strong><pre className="history-pre">{`− ${row.before}\n+ ${row.after}`}</pre></li>)}</ul>
  </>;
}
