import { useEffect, useState } from 'react';
import {
  applySnapshotImport, compareSnapshots, contentHash, createSnapshot, layoutHash,
  loadPreImportBackup, previewImport, storePreImportBackup, type ImportPreview, type SnapshotComparison
} from './snapshots.ts';
import { useI18n } from './i18n/index.ts';
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
  const { t } = useI18n();
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
        setMessage(error instanceof Error ? error.message : t('snapshot.hashFailed'));
      }
    })();
  }, [open, model, t]);

  async function exportSnapshot() {
    setBusy(true);
    try {
      const snapshot = await createSnapshot(model);
      downloadText('research-snapshot.json', JSON.stringify(snapshot, null, 2));
      setMessage(t('snapshot.exportOk', { hash: snapshot.contentHash, disclaimer: t('snapshot.hashDisclaimer') }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('snapshot.exportFail'));
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

  return <Modal open={open} title={t('snapshot.title')} onClose={onClose} className="snapshot-dialog">
    <p className="subtle">{t('snapshot.localSave')}</p>
    <p className="subtle">{t('snapshot.hashDisclaimer')}</p>
    <p className="subtle">{t('snapshot.auditDisclaimer')}</p>
    <p className="subtle">{t('snapshot.actorSession', { label: actorLabel.trim() || t('snapshot.actorNone') })}</p>
    <h3>{t('snapshot.hashes')}</h3>
    <p className="subtle">{t('snapshot.content', { hash: content || '…' })}</p>
    <p className="subtle">{t('snapshot.layout', { hash: layout || '…' })}</p>
    <details><summary>{t('snapshot.canonSummary')}</summary><p className="subtle">{t('snapshot.canonProcedure')}</p></details>
    <div className="actions">
      <button type="button" className="primary" disabled={busy} onClick={() => void exportSnapshot()}>{t('snapshot.export')}</button>
      <label className="file-button">{t('snapshot.import')}
        <input type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0] || null; event.target.value = ''; void onFile(file); }} />
      </label>
      <button type="button" onClick={restoreBackup}>{t('snapshot.restore')}</button>
    </div>
    {preview && <PreviewBlock preview={preview} compare={compare} />}
    {preview?.ok && <div className="actions"><button type="button" className="primary" onClick={confirmImport}>{t('snapshot.accept')}</button><button type="button" onClick={onClose}>{t('dialog.cancel')}</button></div>}
    {message && <p className="subtle" role="status">{message}</p>}
  </Modal>;
}

function PreviewBlock({ preview, compare }: { preview: ImportPreview; compare: SnapshotComparison | null }) {
  const { t } = useI18n();
  return <div className="protocol-panel">
    <h3>{t('snapshot.preview')}</h3>
    <p className="subtle">{preview.note}</p>
    {!preview.ok && <p className="error">{preview.error}</p>}
    {preview.ok && <>
      <p className="subtle">{t('snapshot.addedIds', { ids: preview.addedIds.join(', ') || t('snapshot.none') })}</p>
      <p className="subtle">{t('snapshot.removedIds', { ids: preview.removedIds.join(', ') || t('snapshot.none') })}</p>
      <p className="subtle">{t('snapshot.unresolvedVersionOf', { ids: preview.unresolvedVersionOf.join(', ') || t('snapshot.unresolvedNone') })}</p>
      <ChangeList title={t('snapshot.changedDefinitions')} rows={preview.changedDefinitions} />
      <ChangeList title={t('snapshot.changedCriteria')} rows={preview.changedCriteria} />
      <ChangeList title={t('snapshot.changedEvidence')} rows={preview.changedEvidenceLinks} />
      <ChangeList title={t('snapshot.changedPropositions')} rows={preview.changedPropositions} />
      {compare && <p className="subtle">{t('snapshot.hashCompare', {
        content: compare.contentHashEqual ? t('snapshot.yes') : t('snapshot.no'),
        layout: compare.layoutHashEqual ? t('snapshot.yes') : t('snapshot.no')
      })}</p>}
    </>}
  </div>;
}

function ChangeList({ title, rows }: { title: string; rows: { id: string; label: string; before: string; after: string }[] }) {
  const { t } = useI18n();
  if (!rows.length) return <p className="subtle">{t('snapshot.noChanges', { title })}</p>;
  return <>
    <h4>{title}</h4>
    <ul>{rows.map(row => <li key={row.id}><strong>{row.label || row.id}</strong><pre className="history-pre">{`− ${row.before}\n+ ${row.after}`}</pre></li>)}</ul>
  </>;
}
