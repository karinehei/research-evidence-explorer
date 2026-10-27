import { useEffect, useState } from 'react';
import {
  FIGURE_GENERATOR_VERSION, buildFigureBundle, type FigureMode, type FigurePreset
} from './figures.ts';
import { useI18n, displayRecordLabel } from './i18n/index.ts';
import { Modal } from './Modal.tsx';
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
  const { locale, t, hashMatches } = useI18n();
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
        graphviz: { available: false, version: null },
        locale,
        hashMatches,
        resolveLabel: (id, fallback) => displayRecordLabel(locale, model, id, hashMatches) || fallback
      });
      const stem = `figure-${preset}-${mode}`;
      downloadText(`${stem}.figure-manifest.json`, JSON.stringify(bundle.manifest, null, 2), 'application/json');
      downloadText(`${stem}.caption.txt`, `${bundle.captionDraft}\n`, 'text/plain;charset=utf-8');
      if (mode === 'browser-layout' && bundle.svg) {
        downloadText(`${stem}.svg`, bundle.svg, 'image/svg+xml;charset=utf-8');
        setMessage(t('figure.doneBrowser', { version: FIGURE_GENERATOR_VERSION }));
      } else if (bundle.dot) {
        downloadText(`${stem}.dot`, bundle.dot, 'text/vnd.graphviz');
        setMessage(t('figure.doneDot', { hint: bundle.graphvizInstallHint }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('figure.failed'));
    } finally {
      setBusy(false);
    }
  }

  return <Modal open={open} title={t('figure.dialogTitle')} onClose={onClose} className="snapshot-dialog">
    <p className="subtle">{t('figure.dialogBody')}</p>
    <p className="subtle">{t('figure.contentHash', { hash: hash || '…' })}</p>
    <label>{t('figure.preset')}
      <select value={preset} onChange={event => setPreset(event.target.value as FigurePreset | 'visible')}>
        <option value="justification">{t('figure.presetJustification')}</option>
        <option value="evaluation-model">{t('figure.presetEvaluation')}</option>
        <option value="constructed-case">{t('figure.presetCase')}</option>
        <option value="visible">{t('figure.presetVisible')}</option>
      </select>
    </label>
    {preset === 'constructed-case' && <label>{t('figure.caseLabel')}
      <select value={caseId} onChange={event => setCaseId(event.target.value)}>
        {model.cases.map(item => <option key={item.id} value={item.id}>{item.id} · {displayRecordLabel(locale, model, item.id, hashMatches)}</option>)}
      </select>
    </label>}
    <label>{t('figure.mode')}
      <select value={mode} onChange={event => setMode(event.target.value as FigureMode)}>
        <option value="browser-layout">{t('figure.modeBrowser')}</option>
        <option value="graphviz">{t('figure.modeGraphviz')}</option>
      </select>
    </label>
    <p className="subtle">{t('figure.captionNote')}</p>
    <div className="actions">
      <button type="button" className="primary" disabled={busy} onClick={() => void runExport()}>{t('figure.export')}</button>
      <button type="button" onClick={onClose}>{t('dialog.close')}</button>
    </div>
    {message && <p className="subtle" role="status">{message}</p>}
  </Modal>;
}
