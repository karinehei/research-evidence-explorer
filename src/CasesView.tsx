import { useEffect, useMemo, useState, type RefObject } from 'react';
import {
  ANALYTIC_CASE_LABEL, applyConstructedCaseDraft,
  exportConstructedCase, layerCoverage, missingEssentialFacets, type CoverageLayer
} from './cases.ts';
import { useDraft, type DirtyApi } from './draft.ts';
import { useI18n, caseField, translateResearchField } from './i18n/index.ts';
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

function OriginalFinnish({ show, original }: { show: boolean; original: string }) {
  const { t } = useI18n();
  if (!show || !original) return null;
  return <details className="original-fi">
    <summary>{t('research.showOriginalFi')}</summary>
    <p>{original}</p>
  </details>;
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
  const yesNo = (value: boolean) => (value ? t('cases.yes') : t('cases.no'));
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

  const cf = (field: string, original: string) => caseField(locale, draft.id, field, original, hashMatches);
  const titleDisplay = cf('title', draft.title);
  const taskDisplay = cf('task', draft.taskReference.statement || draft.task);
  const essentialDisplay = cf('task.essentialQualifications', draft.taskReference.essentialQualifications);
  const temporalDisplay = cf('task.temporalScope', draft.taskReference.temporalScope);
  const interpretationDisplay = cf('interpretation', draft.interpretation);
  const boundaryDisplay = cf('boundary', draft.boundary);

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
        <p><strong>{t('cases.essentialQual')}:</strong> {essentialDisplay.text || t('common.notRecorded')}</p>
        {essentialDisplay.notice ? <p className="subtle translation-notice" role="note">{essentialDisplay.notice}</p> : null}
        <p><strong>{t('cases.temporalScope')}:</strong> {temporalDisplay.text || t('common.notRecorded')}</p>
        {temporalDisplay.notice ? <p className="subtle translation-notice" role="note">{temporalDisplay.notice}</p> : null}
      </>}
      <div className="case-source-list">
        <h4>{t('cases.acceptableSources')}</h4>
        {draft.sourceSnapshots.length === 0 && <p className="subtle">{t('cases.noSourceSnap')}</p>}
        {draft.sourceSnapshots.map(snap => {
          const acceptable = draft.taskReference.acceptableSourceVersionIds.includes(snap.id);
          const label = editMode ? snap.label : cf(`snap.${snap.id}.label`, snap.label).text;
          const note = editMode ? snap.note : cf(`snap.${snap.id}.note`, snap.note).text;
          return <article key={snap.id} className={`case-card${acceptable ? ' acceptable' : ''}`}>
            <p><strong>{label}</strong> · {t('cases.versionLabel', { version: snap.version || t('cases.notRecorded') })} · id: {snap.id}</p>
            <p className="subtle">{acceptable ? t('cases.acceptable') : t('cases.notAcceptable')}</p>
            {editMode ? <>
              <label>{t('cases.versionField')}<input value={snap.version} onChange={event => patchDraft(current => {
                const item = current.sourceSnapshots.find(entry => entry.id === snap.id);
                if (item) item.version = event.target.value;
                return current;
              })} /></label>
              <label>{t('cases.noteField')}<textarea value={snap.note} onChange={event => patchDraft(current => {
                const item = current.sourceSnapshots.find(entry => entry.id === snap.id);
                if (item) item.note = event.target.value;
                return current;
              })} /></label>
              <label><input type="checkbox" checked={acceptable} onChange={event => patchDraft(current => {
                const set = new Set(current.taskReference.acceptableSourceVersionIds);
                if (event.target.checked) set.add(snap.id); else set.delete(snap.id);
                current.taskReference.acceptableSourceVersionIds = current.sourceSnapshots.map(entry => entry.id).filter(id => set.has(id));
                return current;
              })} /> {t('cases.acceptableCheck')}</label>
            </> : <p>{note || t('cases.noteNotRecorded')}</p>}
          </article>;
        })}
      </div>
    </section>

    {missing.length > 0 && <div className="case-alert" role="status">
      <strong>{t('cases.missingEssential')}</strong>
      <ul>{missing.map(item => {
        const label = editMode ? item.label : cf(`facet.${item.id}.label`, item.label).text;
        return <li key={item.id}>{label}: {coverageLayerLabel.collection} {facetStateLabel[item.collection]}, {coverageLayerLabel.context} {facetStateLabel[item.context]}, {coverageLayerLabel.answer} {facetStateLabel[item.answer]}</li>;
      })}</ul>
    </div>}

    <section className="case-section">
      <h3>{t('cases.coverageTitle')}</h3>
      <p className="subtle">{t('cases.coverageNote')}</p>
      <div className="coverage-grid">
        {layers.map(layer => <article key={layer.layer} className="case-card">
          <h4>{coverageLayerLabel[layer.layer]}</h4>
          <p className="coverage-ratio">{layer.fullRatioLabel}</p>
          <p className="subtle">{t('cases.coveragePolicy')}</p>
          <p className="subtle">{t('cases.partialCounts', {
            partial: layer.counts.partial,
            conflicting: layer.counts.conflicting,
            absent: layer.counts.absent,
            unresolved: layer.counts.unresolved
          })}</p>
          {layer.missingEssential.length > 0 && <p className="error-text">{t('cases.missingEssentialNotFull', {
            labels: layer.missingEssential.map(item => (editMode ? item.label : cf(`facet.${item.id}.label`, item.label).text)).join('; ')
          })}</p>}
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
        <tbody>{draft.facets.map(facet => {
          const facetLabel = editMode ? facet.label : cf(`facet.${facet.id}.label`, facet.label).text;
          const facetReason = editMode ? facet.reason : cf(`facet.${facet.id}.reason`, facet.reason).text;
          return <tr key={facet.id}>
            <th scope="row">{facetLabel}<p className="subtle">id: {facet.id}</p></th>
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
            <td>{facet.evidenceRefs.join(', ') || t('cases.notRecorded')}</td>
            <td>{editMode
              ? <textarea value={facet.reason} onChange={event => patchDraft(current => {
                const item = current.facets.find(entry => entry.id === facet.id);
                if (item) item.reason = event.target.value;
                return current;
              })} />
              : (facetReason || t('cases.notRecordedPeriod'))}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>

    <section className="case-section">
      <h3>{t('cases.compareTitle')}</h3>
      <p className="subtle">{t('cases.compareNote')}</p>
      <div className="variant-pickers">
        <label>{t('cases.leftVariant')}
          <select value={leftVariantId} onChange={event => setLeftVariantId(event.target.value)}>
            {draft.answerVariants.map(item => {
              const label = editMode ? item.label : cf(`answer.${item.id}.label`, item.label).text;
              return <option key={item.id} value={item.id}>{label}</option>;
            })}
          </select>
        </label>
        <label>{t('cases.rightVariant')}
          <select value={rightVariantId} onChange={event => setRightVariantId(event.target.value)}>
            {draft.answerVariants.map(item => {
              const label = editMode ? item.label : cf(`answer.${item.id}.label`, item.label).text;
              return <option key={item.id} value={item.id}>{label}</option>;
            })}
          </select>
        </label>
      </div>
      <div className="variant-compare">
        {[left, right].map((answer, index) => {
          const display = index === 0 ? leftDisplay : rightDisplay;
          const claims = draft.claimAnnotations.filter(item => answer && item.answerVariantIds.includes(answer.id));
          const answerLabel = !answer ? t('cases.noVariant')
            : editMode ? answer.label : cf(`answer.${answer.id}.label`, answer.label).text;
          const answerText = !answer ? t('cases.notRecordedPeriod')
            : editMode ? answer.text : cf(`answer.${answer.id}.text`, answer.text).text;
          const answerNote = !answer || !answer.note ? ''
            : editMode ? answer.note : cf(`answer.${answer.id}.note`, answer.note).text;
          const answerTranslated = Boolean(answer && !editMode && locale === 'en'
            && caseField(locale, draft.id, `answer.${answer.id}.text`, answer.text, hashMatches).source === 'translation');
          const displayLabel = !display ? t('cases.notRecorded')
            : editMode ? display.label : cf(`display.${display.id}.label`, display.label).text;
          const displayNote = !display || !display.note ? ''
            : editMode ? display.note : cf(`display.${display.id}.note`, display.note).text;
          return <article key={answer?.id || index} className="case-card">
            <h4>{answerLabel}</h4>
            <p>{answerText}</p>
            <OriginalFinnish show={answerTranslated} original={answer?.text || ''} />
            <p className="subtle">{answerNote}</p>
            <h5>{t('cases.displayCondition')}</h5>
            <p>{displayLabel}</p>
            <p className="subtle">{t('cases.citationVisible', { value: display ? yesNo(display.citationVisible) : t('cases.notRecorded') })} · {t('cases.passageLocator', { value: display ? yesNo(display.passageLocatorVisible) : t('cases.notRecorded') })}</p>
            <p className="subtle">{displayNote}</p>
            <h5>{t('cases.claimAnnsTitle')}</h5>
            {claims.length ? claims.map(claim => {
              const claimLabel = editMode ? claim.label : cf(`claimAnn.${claim.id}.label`, claim.label).text;
              const claimStatement = editMode ? claim.statement : cf(`claimAnn.${claim.id}.statement`, claim.statement).text;
              const claimReason = editMode ? claim.reason : cf(`claimAnn.${claim.id}.reason`, claim.reason).text;
              const claimTranslated = !editMode && locale === 'en'
                && caseField(locale, draft.id, `claimAnn.${claim.id}.statement`, claim.statement, hashMatches).source === 'translation';
              return <div key={claim.id} className="matrix-block">
                <p><strong>{claimLabel}</strong> · {t('cases.claimSupport', { state: facetStateLabel[claim.support] })}</p>
                <p>{claimStatement}</p>
                <OriginalFinnish show={claimTranslated} original={claim.statement} />
                <p className="subtle">{claimReason}</p>
                <p className="subtle">{t('inspector.evidenceRefs')}: {claim.evidenceRefs.join(', ') || t('cases.notRecorded')}</p>
              </div>;
            }) : <p className="subtle">{t('cases.noClaimAnns')}</p>}
            <p className="tag">{t('cases.verificationSuccessNotMeasured')}</p>
            <p className="tag">{t('cases.verificationTimeNotMeasured')}</p>
            <p className="tag">{t('cases.expertRatingsNotMeasured')}</p>
          </article>;
        })}
      </div>
    </section>

    <section className="case-section">
      <h3>{t('cases.contextsPassagesTitle')}</h3>
      {draft.savedContexts.map(ctx => {
        const ctxLabel = editMode ? ctx.label : cf(`context.${ctx.id}.label`, ctx.label).text;
        const ctxNote = editMode ? (ctx.note || t('cases.noteNotRecorded'))
          : (cf(`context.${ctx.id}.note`, ctx.note).text || t('cases.noteNotRecorded'));
        return <article key={ctx.id} className="case-card">
          <p><strong>{ctxLabel}</strong></p>
          <p>{ctxNote}</p>
          <p className="subtle">{t('cases.passagesList', { ids: ctx.passageIds.join(', ') || t('cases.notRecorded') })}</p>
        </article>;
      })}
      <div className="table-wrap" tabIndex={0}><table>
        <caption>{t('cases.passagesCaption')}</caption>
        <thead><tr>{[t('cases.passageColId'), t('cases.passageColSnapshot'), t('cases.passageColLocator'), t('cases.passageColText')].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{draft.passages.map(passage => {
          const passageText = editMode ? passage.text : cf(`passage.${passage.id}.text`, passage.text).text;
          const passageTranslated = !editMode && locale === 'en'
            && caseField(locale, draft.id, `passage.${passage.id}.text`, passage.text, hashMatches).source === 'translation';
          return <tr key={passage.id}>
            <th scope="row">{passage.id}</th>
            <td>{passage.sourceSnapshotId}</td>
            <td>{passage.locator || t('cases.notRecorded')}</td>
            <td>
              {passageText || t('cases.notRecorded')}
              <OriginalFinnish show={passageTranslated} original={passage.text} />
            </td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>

    <section className="case-section">
      <h3>{t('cases.summaryTitle')}</h3>
      <div className="table-wrap" tabIndex={0}><table>
        <caption>{t('cases.summaryCaption')}</caption>
        <thead><tr>{draft.columns.map((column, index) => <th key={index} scope="col">{editMode ? column : cf(`column.${index}`, column).text}</th>)}</tr></thead>
        <tbody>{draft.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => {
          const text = editMode ? cell : cf(`row.${rowIndex}.${cellIndex}`, cell).text;
          return cellIndex === 0 ? <th key={cellIndex} scope="row">{text}</th> : <td key={cellIndex}>{text}</td>;
        })}</tr>)}</tbody>
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
