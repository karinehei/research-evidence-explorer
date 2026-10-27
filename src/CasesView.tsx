import { useEffect, useMemo, useState, type RefObject } from 'react';
import {
  ANALYTIC_CASE_LABEL, applyConstructedCaseDraft,
  exportConstructedCase, layerCoverage, missingEssentialFacets, type CoverageLayer
} from './cases.ts';
import { useDraft, type DirtyApi } from './draft.ts';
import { useI18n, translateResearchField } from './i18n/index.ts';
import type { ConstructedCase, FacetState, Workspace } from './types.ts';

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
  guard: RefObject<DirtyApi | null>;
  onEditModeChange?: (editing: boolean) => void;
  onLeave: (action: () => void) => void;
}) {
  const { t } = useI18n();
  const selected = model.cases.find(item => item.id === selectedId) || model.cases[0];
  if (!selected) return <p>{t('cases.empty')}</p>;
  return <CaseEditor model={model} selected={selected} onSelect={onSelect} onSave={onSave} guard={guard} onEditModeChange={onEditModeChange} onLeave={onLeave} />;
}

function CaseEditor({ model, selected, onSelect, onSave, guard, onEditModeChange, onLeave }: {
  model: Workspace;
  selected: ConstructedCase;
  onSelect: (id: string) => void;
  onSave: (next: Workspace, message: string) => boolean;
  guard: RefObject<DirtyApi | null>;
  onEditModeChange?: (editing: boolean) => void;
  onLeave: (action: () => void) => void;
}) {
  const { locale, t, hashMatches } = useI18n();
  const facetStateLabel = {
    full: t('cases.facetFull'),
    partial: t('cases.facetPartial'),
    absent: t('cases.facetAbsent'),
    conflicting: t('cases.facetConflicting'),
    unresolved: t('cases.facetUnresolved')
  } as const;
  const coverageLayerLabel = {
    collection: t('cases.layerCollection'),
    context: t('cases.layerContext'),
    answer: t('cases.layerAnswer')
  } as const;
  const facetOptions = Object.entries(facetStateLabel).map(([id, label]) => ({ id, label }));
  const [leftVariantId, setLeftVariantId] = useState('');
  const [rightVariantId, setRightVariantId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { draft, setDraft, persist } = useDraft(selected, guard, next => {
    let copy: Workspace;
    try { copy = applyConstructedCaseDraft(model, next); }
    catch { return false; }
    const ok = onSave(copy, t('cases.saved'));
    if (ok) setEditMode(false);
    return ok;
  }, { active: editMode, onReset: () => setEditMode(false) });
  const titleDisplay = translateResearchField(locale, 'cases', draft.id, 'title', draft.title, { hashMatches });
  const taskDisplay = translateResearchField(locale, 'cases', draft.id, 'task', draft.taskReference.statement || draft.task, { hashMatches });
  const interpretationDisplay = translateResearchField(locale, 'cases', draft.id, 'interpretation', draft.interpretation, { hashMatches });
  const boundaryDisplay = translateResearchField(locale, 'cases', draft.id, 'boundary', draft.boundary, { hashMatches });

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
    <div className="case-tabs" aria-label={t('cases.tabsAria')}>
      {model.cases.map(item => <button type="button" key={item.id} aria-pressed={item.id === selected.id} onClick={() => onSelect(item.id)}>{translateResearchField(locale, 'cases', item.id, 'title', item.title, { hashMatches }).text}</button>)}
    </div>

    <div className="table-intro">
      <div>
        <span className="tag hypothesis">{t('research.constructedTag')}</span>
        <span className="tag">{ANALYTIC_CASE_LABEL}</span>
        <p>{t('cases.disclaimer')}</p>
      </div>
      <div className="matrix-export-actions">
        <button type="button" onClick={() => onLeave(() => setEditMode(!editMode))}>{editMode ? t('cases.closeEdit') : t('cases.edit')}</button>
        {editMode && <button type="button" className="primary" onClick={saveCase}>{t('cases.save')}</button>}
        <button type="button" onClick={exportCase}>{t('cases.export')}</button>
      </div>
    </div>

    <h2>{editMode ? draft.title : titleDisplay.text}</h2>
    {!editMode && titleDisplay.notice ? <p className="subtle translation-notice" role="note">{titleDisplay.notice}</p> : null}
    <p className="subtle">id: {draft.id} · {draft.analyticLabel}</p>

    <section className="case-section">
      <h3>{t('cases.taskRef')}</h3>
      {editMode ? <>
        <label>{t('cases.task')}<textarea value={draft.taskReference.statement} onChange={event => patchDraft(current => {
          current.taskReference.statement = event.target.value;
          current.task = event.target.value;
          return current;
        })} /></label>
        <label>{t('cases.essentialQual')}<textarea value={draft.taskReference.essentialQualifications} onChange={event => patchDraft(current => {
          current.taskReference.essentialQualifications = event.target.value;
          return current;
        })} /></label>
        <label>{t('cases.temporalScope')}<textarea value={draft.taskReference.temporalScope} onChange={event => patchDraft(current => {
          current.taskReference.temporalScope = event.target.value;
          return current;
        })} /></label>
      </> : <>
        <p className="case-task">{taskDisplay.text}</p>
        {taskDisplay.notice ? <p className="subtle translation-notice" role="note">{taskDisplay.notice}</p> : null}
        <p><strong>{t('cases.essentialQual')}:</strong> {draft.taskReference.essentialQualifications || t('common.notRecorded')}</p>
        <p><strong>{t('cases.temporalScope')}:</strong> {draft.taskReference.temporalScope || t('common.notRecorded')}</p>
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
      <strong>{t('cases.missingEssential')}</strong>
      <ul>{missing.map(item => <li key={item.id}>{item.label}: {coverageLayerLabel.collection} {facetStateLabel[item.collection]}, {coverageLayerLabel.context} {facetStateLabel[item.context]}, {coverageLayerLabel.answer} {facetStateLabel[item.answer]}</li>)}</ul>
    </div>}

    <section className="case-section">
      <h3>{t('cases.coverageTitle')}</h3>
      <p className="subtle">{t('cases.coverageNote')}</p>
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
      <h3>{t('cases.facetsTitle')}</h3>
      <div className="table-wrap" tabIndex={0}><table>
        <caption>{t('cases.facetsCaption')}</caption>
        <thead><tr>
          {[t('cases.facetsTitle'), t('cases.essentialQual'), coverageLayerLabel.collection, coverageLayerLabel.context, coverageLayerLabel.answer, t('inspector.evidenceRefs'), t('inspector.rationale')].map(column => <th key={column} scope="col">{column}</th>)}
        </tr></thead>
        <tbody>{draft.facets.map(facet => <tr key={facet.id}>
          <th scope="row">{facet.label}<p className="subtle">id: {facet.id}</p></th>
          <td>{facet.essential ? t('cases.yes') : t('cases.no')}</td>
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
      <h3>{t('cases.compareTitle')}</h3>
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
      <h3>{t('cases.interpretation')}</h3>
      {editMode
        ? <textarea value={draft.interpretation} onChange={event => patchDraft(current => { current.interpretation = event.target.value; return current; })} />
        : <>
          <p>{interpretationDisplay.text}</p>
          {interpretationDisplay.notice ? <p className="subtle translation-notice" role="note">{interpretationDisplay.notice}</p> : null}
        </>}
    </section>
    <section className="case-section">
      <h3>{t('cases.limits')}</h3>
      {editMode
        ? <textarea value={draft.boundary} onChange={event => patchDraft(current => { current.boundary = event.target.value; return current; })} />
        : <>
          <p>{boundaryDisplay.text}</p>
          {boundaryDisplay.notice ? <p className="subtle translation-notice" role="note">{boundaryDisplay.notice}</p> : null}
        </>}
      <p className="subtle">{draft.basis}</p>
    </section>
    <p className="subtle">{t('cases.crossRefs')}</p>
  </section>;
}
