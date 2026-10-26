import { useState } from 'react';
import type { StagedItem, StageAction } from './cslImport.ts';
import { applyCslImport, stageCslImport, suggestVersionLinks } from './cslImport.ts';
import { Modal } from './Modal.tsx';
import type { Workspace } from './types.ts';

const actionLabel: Record<StageAction, string> = {
  create: 'Luo uusi lähde',
  skip: 'Ohita',
  link: 'Linkitä olemassa olevaan'
};

const matchLabel = {
  new: 'Uusi',
  doi: 'DOI-osumaa',
  identifier: 'Tunnisteosuma',
  'title-year': 'Mahdollinen kaksoiskappale (otsikko/vuosi)'
} as const;

export function CslImportDialog({ model, onClose, onApply }: {
  model: Workspace;
  onClose: () => void;
  onApply: (next: Workspace, message: string) => void;
}) {
  const [stage, setStage] = useState<StagedItem[] | null>(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024) {
      setStage(null);
      setError('Tiedosto ylittää 2 Mt:n tuontirajan.');
      return;
    }
    const text = await file.text();
    const result = stageCslImport(model, text);
    if (result.error) {
      setStage(null);
      setError(result.error);
      return;
    }
    setError('');
    setStage(result.items);
  }

  function patch(index: number, update: Partial<StagedItem>) {
    setStage(current => (current || []).map(item => item.index === index ? { ...item, ...update } : item));
  }

  function accept() {
    if (!stage) return;
    try {
      const next = applyCslImport(model, stage);
      const created = stage.filter(item => item.action === 'create').length;
      const linked = stage.filter(item => item.action === 'link').length;
      const skipped = stage.filter(item => item.action === 'skip').length;
      const versions = suggestVersionLinks(next);
      const versionNote = versions.length
        ? ` Tarkista mahdolliset versioyhteydet inspectorissa (${versions.length} ehdotusta otsikon perusteella); niitä ei kirjoitettu automaattisesti.`
        : '';
      onApply(next, `Zotero CSL-JSON tuotiin esikatselun jälkeen: ${created} uutta, ${linked} linkitettyä, ${skipped} ohitettua. Lukemistilaa, väitteitä tai arviointeja ei keksitty.${versionNote}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tuontia ei voitu soveltaa.');
    }
  }

  return <Modal open title="Tuo Zotero CSL-JSON" onClose={onClose} className="wide-modal" initialFocus="primary">
    <p>Tuonti on tutkijan käynnistämä. Esikatselu näyttää osumat ennen tallennusta. Bibliografinen tuonti voi luoda lähteitä, mutta se ei keksi löydöksiä, menetelmiä, väitteitä eikä lukemistilaa. Liitteet säilytetään vain metatietona.</p>
    <label className="file-pick">Valitse CSL-JSON-tiedosto
      <input type="file" accept=".json,application/json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void onFile(file); }} />
    </label>
    {fileName && <p className="subtle">Tiedosto: {fileName}</p>}
    {error && <p className="error-text">{error}</p>}
    {stage && <div className="import-stage">
      <p>{stage.length} tietuetta esikatselussa. DOI ja eksplisiittinen tunniste ovat ensisijaisia osumia; otsikko ja vuosi vain ehdottavat mahdollista kaksoiskappaletta.</p>
      {stage.map(row => <article key={row.index} className="stage-card">
        <header>
          <strong>{row.item.label}</strong>
          <span className="tag">{matchLabel[row.matchKind]}</span>
        </header>
        <p className="subtle">{row.item.citation || 'Viite puuttuu.'}</p>
        <dl className="fact-list compact">
          <div><dt>DOI</dt><dd>{row.item.doi || 'Ei DOI-kenttää'}</dd></div>
          <div><dt>CSL-tyyppi</dt><dd>{row.item.cslType || 'Ei tyyppiä'} — julkaisun tilaa ei päätellä tästä automaattisesti.</dd></div>
          <div><dt>Liitteet</dt><dd>{row.item.attachments.length ? row.item.attachments.map(item => `${item.title || 'liite'}${item.path ? ` (${item.path})` : ''}`).join('; ') : 'Ei liitetietoa'}</dd></div>
        </dl>
        {row.item.flags.length > 0 && <ul className="flag-list">{row.item.flags.map(flag => <li key={flag}>{flag}</li>)}</ul>}
        {row.candidates.length > 0 && <div className="candidate-list">
          <div className="field-title">Mahdolliset osumat</div>
          {row.candidates.map(candidate => <p key={candidate.id} className="subtle">{candidate.label} — {candidate.reason}</p>)}
        </div>}
        {row.conflicts.length > 0 && row.action === 'link' && <fieldset className="checks">
          <legend>Kenttäerot: valitse tuotavat arvot</legend>
          {row.conflicts.map(conflict => <label key={conflict.field}>
            <input type="checkbox" checked={Boolean(row.takeFields[conflict.field])} onChange={event => patch(row.index, { takeFields: { ...row.takeFields, [conflict.field]: event.target.checked } })} />
            <span>{conflict.field}: nykyinen “{conflict.existing || 'tyhjä'}” → tuotu “{conflict.incoming}”</span>
          </label>)}
          <p className="subtle">Muistiinpanot, seuraava tarkistus, lukemistieto, väitteet ja arviointi säilyvät ennallaan.</p>
        </fieldset>}
        <label>Toiminto
          <select value={row.action} onChange={event => patch(row.index, { action: event.target.value as StageAction })}>
            {Object.entries(actionLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        {row.action === 'link' && <label>Linkitettävä lähde
          <select value={row.linkTargetId} onChange={event => patch(row.index, { linkTargetId: event.target.value })}>
            <option value="">Valitse lähde</option>
            {model.sources.map(source => <option key={source.id} value={source.id}>{source.label}</option>)}
          </select>
        </label>}
      </article>)}
    </div>}
    <div className="actions">
      <button type="button" className="primary" disabled={!stage?.length} onClick={accept}>Hyväksy tuonti</button>
      <button type="button" onClick={onClose}>Peruuta</button>
    </div>
  </Modal>;
}
