import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import {
  ANALYTIC_CASE_LABEL, CASE_VIEW_DISCLAIMER, CONSTRUCTED_CASE_TAG, applyConstructedCaseDraft,
  coverageLayerLabel, exportConstructedCase, facetStateLabel, layerCoverage, missingEssentialFacets, type CoverageLayer
} from './cases.ts';
import { useDraft, type DirtyApi } from './draft.ts';
import type { ConstructedCase, FacetState, Workspace } from './types.ts';

const facetOptions = Object.entries(facetStateLabel).map(([id, label]) => ({ id, label }));

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function cloneCase(record: ConstructedCase): ConstructedCase {
  return JSON.parse(JSON.stringify(record));
}

export function CasesView({ model, selectedId, onSelect, onSave, guard, onEditModeChange, onLeave }: {
  model: Workspace;
  selectedId: string;
  onSelect: (id: string) => void;
  onSave: (next: Workspace, message: string) => boolean;
  guard: MutableRefObject<DirtyApi | null>;
  onEditModeChange?: (editing: boolean) => void;
  onLeave: (action: () => void) => void;
}) {
  const selected = model.cases.find(item => item.id === selectedId) || model.cases[0];
  if (!selected) return <p>Ei rakennettuja tapauksia.</p>;
  return <CaseEditor model={model} selected={selected} onSelect={onSelect} onSave={onSave} guard={guard} onEditModeChange={onEditModeChange} onLeave={onLeave} />;
}

function CaseEditor({ model, selected, onSelect, onSave, guard, onEditModeChange, onLeave }: {
  model: Workspace;
  selected: ConstructedCase;
  onSelect: (id: string) => void;
  onSave: (next: Workspace, message: string) => boolean;
  guard: MutableRefObject<DirtyApi | null>;
  onEditModeChange?: (editing: boolean) => void;
  onLeave: (action: () => void) => void;
}) {
  const [leftVariantId, setLeftVariantId] = useState('');
  const [rightVariantId, setRightVariantId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { draft, setDraft, persist } = useDraft(selected, guard, next => {
    let copy: Workspace;
    try { copy = applyConstructedCaseDraft(model, next); }
    catch { return false; }
    const ok = onSave(copy, 'Rakennettu tapaus tallennettiin. Esimerkki pysyy rakennettuna analyyttisenä esimerkkinä.');
    if (ok) setEditMode(false);
    return ok;
  }, { active: editMode, onReset: () => setEditMode(false) });

  useEffect(() => {
    const answers = selected.answerVariants;
    setLeftVariantId(current => answers.some(item => item.id === current) ? current : (answers[0]?.id || ''));
    setRightVariantId(current => answers.some(item => item.id === current) ? current : (answers[1]?.id || answers[0]?.id || ''));
  }, [selected]);

  useEffect(() => {
    onEditModeChange?.(editMode);
  }, [editMode, onEditModeChange]);

  const layers = useMemo(() => {
    if (!draft) return [];
    return (['collection', 'context', 'answer'] as CoverageLayer[]).map(layer => layerCoverage(draft.facets, layer));
  }, [draft]);

  const missing = draft ? missingEssentialFacets(draft.facets) : [];
  const left = draft?.answerVariants.find(item => item.id === leftVariantId);
  const right = draft?.answerVariants.find(item => item.id === rightVariantId);
  const leftDisplay = draft?.displayConditions.find(item => item.id === left?.displayConditionId);
  const rightDisplay = draft?.displayConditions.find(item => item.id === right?.displayConditionId);

  function patchDraft(updater: (current: ConstructedCase) => ConstructedCase) {
    setDraft(current => updater(cloneCase(current)));
  }

  function saveCase() {
    persist();
  }

  function exportCase() {
    if (!draft) return;
    const current = draft;
    const bundle = exportConstructedCase(
      { ...model, cases: model.cases.map(item => item.id === current.id ? current : item) },
      current.id
    );
    if (!bundle) return;
    downloadText(`constructed-case-${current.id}.json`, JSON.stringify(bundle, null, 2), 'application/json');
  }

  return <section className="cases-view" key={draft.id}>
    <div className="case-tabs" aria-label="Rakennetut esimerkit">
      {model.cases.map(item => <button type="button" key={item.id} aria-pressed={item.id === selected.id} onClick={() => onSelect(item.id)}>{item.title}</button>)}
    </div>

    <div className="table-intro">
      <div>
        <span className="tag hypothesis">{CONSTRUCTED_CASE_TAG}</span>
        <span className="tag">{ANALYTIC_CASE_LABEL}</span>
        <p>{CASE_VIEW_DISCLAIMER}</p>
      </div>
      <div className="matrix-export-actions">
        <button type="button" onClick={() => onLeave(() => setEditMode(!editMode))}>{editMode ? 'Sulje muokkaus' : 'Muokkaa tapausta'}</button>
        {editMode && <button type="button" className="primary" onClick={saveCase}>Tallenna tapaus</button>}
        <button type="button" onClick={exportCase}>Vie rakennettu tapaus JSON</button>
      </div>
    </div>

    <h2>{draft.title}</h2>
    <p className="subtle">id: {draft.id} · {draft.analyticLabel}</p>

    <section className="case-section">
      <h3>Tehtäväviite</h3>
      {editMode ? <>
        <label>Tehtävä<textarea value={draft.taskReference.statement} onChange={event => patchDraft(current => {
          current.taskReference.statement = event.target.value;
          current.task = event.target.value;
          return current;
        })} /></label>
        <label>Olennaiset rajaukset<textarea value={draft.taskReference.essentialQualifications} onChange={event => patchDraft(current => {
          current.taskReference.essentialQualifications = event.target.value;
          return current;
        })} /></label>
        <label>Ajallinen ala<textarea value={draft.taskReference.temporalScope} onChange={event => patchDraft(current => {
          current.taskReference.temporalScope = event.target.value;
          return current;
        })} /></label>
      </> : <>
        <p className="case-task">{draft.taskReference.statement || draft.task}</p>
        <p><strong>Olennaiset rajaukset:</strong> {draft.taskReference.essentialQualifications || 'Ei kirjattu.'}</p>
        <p><strong>Ajallinen ala:</strong> {draft.taskReference.temporalScope || 'Ei kirjattu.'}</p>
      </>}
      <div className="case-source-list">
        <h4>Hyväksyttävät lähdeversiot tehtävään</h4>
        {draft.sourceSnapshots.length === 0 && <p className="subtle">Lähdevedosta ei kirjattu.</p>}
        {draft.sourceSnapshots.map(snap => {
          const acceptable = draft.taskReference.acceptableSourceVersionIds.includes(snap.id);
          return <article key={snap.id} className={`case-card${acceptable ? ' acceptable' : ''}`}>
            <p><strong>{snap.label}</strong> · versio {snap.version || 'ei kirjattu'} · id: {snap.id}</p>
            <p className="subtle">{acceptable ? 'Hyväksyttävä nykyiseen tehtäväviitteeseen' : 'Ei listattu hyväksyttäväksi nykyiseen tehtävään'}</p>
            {editMode ? <>
              <label>Versio<input value={snap.version} onChange={event => patchDraft(current => {
                const item = current.sourceSnapshots.find(entry => entry.id === snap.id);
                if (item) item.version = event.target.value;
                return current;
              })} /></label>
              <label>Huomio<textarea value={snap.note} onChange={event => patchDraft(current => {
                const item = current.sourceSnapshots.find(entry => entry.id === snap.id);
                if (item) item.note = event.target.value;
                return current;
              })} /></label>
              <label><input type="checkbox" checked={acceptable} onChange={event => patchDraft(current => {
                const set = new Set(current.taskReference.acceptableSourceVersionIds);
                if (event.target.checked) set.add(snap.id); else set.delete(snap.id);
                current.taskReference.acceptableSourceVersionIds = current.sourceSnapshots.map(entry => entry.id).filter(id => set.has(id));
                return current;
              })} /> Hyväksyttävä tehtävään</label>
            </> : <p>{snap.note || 'Huomiota ei kirjattu.'}</p>}
          </article>;
        })}
      </div>
    </section>

    {missing.length > 0 && <div className="case-alert" role="status">
      <strong>Olennaisia tietoasioita puuttuu tai ne eivät ole täysiä.</strong>
      <ul>{missing.map(item => <li key={item.id}>{item.label}: kokoelma {facetStateLabel[item.collection]}, konteksti {facetStateLabel[item.context]}, vastaus {facetStateLabel[item.answer]}</li>)}</ul>
      <p className="subtle">Keskiarvo tai pelkkä suhdeluku ei peitä näitä puutteita.</p>
    </div>}

    <section className="case-section">
      <h3>Kattavuus kerroksittain</h3>
      <p className="subtle">Kokoelma, annettu konteksti ja vastaus raportoidaan erikseen. Väitetuki ja näytetty viitetieto ovat linkitettyjä auditointeja, eivät vaihdettavia vaiheita tai taattuja tuloksia. Kliinistä turvallisuuspistettä ei lasketa.</p>
      <div className="coverage-grid">
        {layers.map(layer => <article key={layer.layer} className="case-card">
          <h4>{coverageLayerLabel[layer.layer]}</h4>
          <p className="coverage-ratio">{layer.fullRatioLabel}</p>
          <p className="subtle">{layer.policy}</p>
          <p className="subtle">Osittainen {layer.counts.partial} · ristiriitainen {layer.counts.conflicting} · puuttuu {layer.counts.absent} · ratkaisematon {layer.counts.unresolved}</p>
          {layer.missingEssential.length > 0 && <p className="error-text">Olennaiset ei-täydet: {layer.missingEssential.map(item => item.label).join('; ')}</p>}
        </article>)}
      </div>
    </section>

    <section className="case-section">
      <h3>Tietoasiat</h3>
      <div className="table-wrap" tabIndex={0}><table>
        <caption>Tietoasiat ja kattavuuden tila kerroksittain. Rakennettu esimerkki, ei empiirinen tulos. Leveä taulukko vierii kehyksessään.</caption>
        <thead><tr>
          {['Tietoasia', 'Olennainen', 'Kokoelma', 'Konteksti', 'Vastaus', 'Näyttöviitteet', 'Perustelu'].map(column => <th key={column} scope="col">{column}</th>)}
        </tr></thead>
        <tbody>{draft.facets.map(facet => <tr key={facet.id}>
          <th scope="row">{facet.label}<p className="subtle">id: {facet.id}</p></th>
          <td>{facet.essential ? 'Kyllä' : 'Ei'}</td>
          {(['collection', 'context', 'answer'] as const).map(layer => <td key={layer}>
            {editMode
              ? <select value={facet[layer]} onChange={event => patchDraft(current => {
                const item = current.facets.find(entry => entry.id === facet.id);
                if (item) item[layer] = event.target.value as FacetState;
                return current;
              })}>{facetOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
              : facetStateLabel[facet[layer]]}
          </td>)}
          <td>{facet.evidenceRefs.join(', ') || 'Ei kirjattu'}</td>
          <td>{editMode
            ? <textarea value={facet.reason} onChange={event => patchDraft(current => {
              const item = current.facets.find(entry => entry.id === facet.id);
              if (item) item.reason = event.target.value;
              return current;
            })} />
            : (facet.reason || 'Ei kirjattu.')}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="case-section">
      <h3>Vastaus- ja näyttövarianttien vertailu</h3>
      <p className="subtle">Valitse kaksi varianttia. Väitetuki ja näytön paikannettavuus näkyvät erikseen; tarkistuksen onnistumista, aikaa tai asiantuntija-arvioita ei ole mitattu.</p>
      <div className="variant-pickers">
        <label>Vasen variantti
          <select value={leftVariantId} onChange={event => setLeftVariantId(event.target.value)}>
            {draft.answerVariants.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>Oikea variantti
          <select value={rightVariantId} onChange={event => setRightVariantId(event.target.value)}>
            {draft.answerVariants.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div className="variant-compare">
        {[left, right].map((answer, index) => {
          const display = index === 0 ? leftDisplay : rightDisplay;
          const claims = draft.claimAnnotations.filter(item => answer && item.answerVariantIds.includes(answer.id));
          return <article key={answer?.id || index} className="case-card">
            <h4>{answer?.label || 'Varianttia ei valittu'}</h4>
            <p>{answer?.text || 'Ei kirjattu.'}</p>
            <p className="subtle">{answer?.note || ''}</p>
            <h5>Näyttöehto</h5>
            <p>{display?.label || 'Ei kirjattu'}</p>
            <p className="subtle">Viitetiedot näkyvissä: {display ? (display.citationVisible ? 'kyllä' : 'ei') : 'ei kirjattu'} · Katkelmapaikannin: {display ? (display.passageLocatorVisible ? 'kyllä' : 'ei') : 'ei kirjattu'}</p>
            <p className="subtle">{display?.note || ''}</p>
            <h5>Väiteannotaatiot (erillinen auditointi)</h5>
            {claims.length ? claims.map(claim => <div key={claim.id} className="matrix-block">
              <p><strong>{claim.label}</strong> · tuki {facetStateLabel[claim.support]}</p>
              <p>{claim.statement}</p>
              <p className="subtle">{claim.reason}</p>
              <p className="subtle">Näyttöviitteet: {claim.evidenceRefs.join(', ') || 'ei kirjattu'}</p>
            </div>) : <p className="subtle">Väiteannotaatiota ei kirjattu tälle variantille.</p>}
            <p className="tag">Tarkistuksen onnistuminen: ei mitattu</p>
            <p className="tag">Tarkistuksen aika: ei mitattu</p>
            <p className="tag">Asiantuntija-arviot: ei mitattu</p>
          </article>;
        })}
      </div>
    </section>

    <section className="case-section">
      <h3>Tallennettu konteksti ja katkelmat</h3>
      {draft.savedContexts.map(ctx => <article key={ctx.id} className="case-card">
        <p><strong>{ctx.label}</strong></p>
        <p>{ctx.note || 'Huomiota ei kirjattu.'}</p>
        <p className="subtle">Katkelmat: {ctx.passageIds.join(', ') || 'ei kirjattu'}</p>
      </article>)}
      <div className="table-wrap" tabIndex={0}><table>
        <caption>Tallennetut katkelmat rakennetussa esimerkissä. Leveä taulukko vierii kehyksessään.</caption>
        <thead><tr>{['Katkelma', 'Lähdevedos', 'Paikannin', 'Teksti'].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{draft.passages.map(passage => <tr key={passage.id}>
          <th scope="row">{passage.id}</th>
          <td>{passage.sourceSnapshotId}</td>
          <td>{passage.locator || 'Ei kirjattu'}</td>
          <td>{passage.text || 'Ei kirjattu'}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="case-section">
      <h3>Yhteenvetotaulukko (lähtöaineisto)</h3>
      <div className="table-wrap" tabIndex={0}><table>
        <caption>Yhteenvetotaulukko lähtöaineistosta. Rakennettu esimerkki, ei mittaustulos. Leveä taulukko vierii kehyksessään.</caption>
        <thead><tr>{draft.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{draft.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => cellIndex === 0 ? <th key={cellIndex} scope="row">{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table></div>
    </section>

    <section className="case-section">
      <h3>Mitä erottelu tekee näkyväksi</h3>
      {editMode
        ? <textarea value={draft.interpretation} onChange={event => patchDraft(current => { current.interpretation = event.target.value; return current; })} />
        : <p>{draft.interpretation}</p>}
    </section>
    <section className="case-section">
      <h3>Tulkinnan rajat</h3>
      {editMode
        ? <textarea value={draft.boundary} onChange={event => patchDraft(current => { current.boundary = event.target.value; return current; })} />
        : <p>{draft.boundary}</p>}
      <p className="subtle">{draft.basis}</p>
      <p className="subtle">Mittaamattomat: tarkistuksen onnistuminen, aika ja asiantuntija-arviot = not-measured. Empiirinen tapaus vaatisi erillisen tietuetyypin ja ajon provenienssin.</p>
    </section>
    <p className="subtle">Ristiinviitteet propositioihin, kriteereihin ja päätöksiin kirjataan tarkastimessa. Tyhjä lista ei ole tutkimustulos.</p>
  </section>;
}
