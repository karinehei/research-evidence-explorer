import { useMemo, useState } from 'react';
import { useI18n, displayRecordLabel, translateResearchField } from './i18n/index.ts';
import { labelsFor } from './labels.ts';
import {
  buildArgumentView, buildCriterionRows, buildSourceRows, emptyFilters, exportMatrixBundle,
  filterCriterionRows, filterSourceRows, recordedState, type MatrixFilters, type MatrixOrientation
} from './matrix.ts';
import type { ResearchRole, Workspace } from './types.ts';

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MatrixView({ model, selectedId, onSelect, onEdge, onCsv }: {
  model: Workspace;
  selectedId: string;
  onSelect: (id: string) => void;
  onEdge: (id: string) => void;
  onCsv: () => void;
}) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const [orientation, setOrientation] = useState<MatrixOrientation>('criterion');
  const [filters, setFilters] = useState<MatrixFilters>(emptyFilters);
  const [decisionId, setDecisionId] = useState(model.decisions[0]?.id || '');

  const criterionRows = useMemo(() => filterCriterionRows(buildCriterionRows(model), filters), [model, filters]);
  const sourceRows = useMemo(() => filterSourceRows(buildSourceRows(model), filters), [model, filters]);
  const argument = orientation === 'argument' && decisionId ? buildArgumentView(model, decisionId) : null;
  const selectedCriterion = criterionRows.find(row => row.criterion.id === selectedId)
    || buildCriterionRows(model).find(row => row.criterion.id === selectedId);
  const selectedSource = sourceRows.find(row => row.source.id === selectedId)
    || buildSourceRows(model).find(row => row.source.id === selectedId);

  function patchFilter<K extends keyof MatrixFilters>(key: K, value: MatrixFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function exportCurrent() {
    const bundle = exportMatrixBundle(model, { orientation, filters, selectedId, decisionId: orientation === 'argument' ? decisionId : '' });
    downloadText('research-matrix.json', JSON.stringify(bundle, null, 2), 'application/json');
  }

  function labelOf(id: string) {
    return displayRecordLabel(locale, model, id, hashMatches);
  }

  const criterionCols = [
    t('matrixExtra.colCriterion'), t('matrixExtra.colConstruct'), t('matrixExtra.colClaims'),
    t('matrixExtra.colAdaptation'), t('matrixExtra.colEvidence'), t('matrixExtra.colDecision'),
    t('matrixExtra.colInference'), t('matrixExtra.colValidation')
  ];
  const sourceCols = [
    t('matrixExtra.colSource'), t('matrixExtra.colRole'), t('matrixExtra.colStatements'),
    t('matrixExtra.colAppear'), t('matrixExtra.colCompeting')
  ];

  return <section className="matrix-view">
    <div className="table-intro">
      <p>{t('matrix.intro')}</p>
      <div className="matrix-export-actions">
        <button type="button" onClick={exportCurrent}>{t('matrix.exportJson')}</button>
        <button type="button" onClick={onCsv}>{t('matrix.exportCsv')}</button>
      </div>
    </div>

    <div className="matrix-toolbar" role="toolbar" aria-label={t('matrix.filtersAria')}>
      <div className="case-tabs" aria-label={t('matrix.orientationAria')}>
        <button type="button" aria-pressed={orientation === 'criterion'} onClick={() => setOrientation('criterion')}>{t('matrix.criterionView')}</button>
        <button type="button" aria-pressed={orientation === 'source'} onClick={() => setOrientation('source')}>{t('matrix.sourceView')}</button>
        <button type="button" aria-pressed={orientation === 'argument'} onClick={() => setOrientation('argument')}>{t('matrix.argumentView')}</button>
      </div>
      <label>{t('matrix.constructFilter')}
        <select value={filters.constructId} onChange={event => patchFilter('constructId', event.target.value)}>
          <option value="">{t('matrix.constructAll')}</option>
          {model.constructs.map(item => <option key={item.id} value={item.id}>{labelOf(item.id)}</option>)}
        </select>
      </label>
      <label>{t('matrix.epistemicFilter')}
        <select value={filters.epistemic} onChange={event => patchFilter('epistemic', event.target.value)}>
          <option value="all">{t('matrix.epistemicAll')}</option>
          <option value="reported">{L.epistemicLabel.reported}</option>
          <option value="adaptation">{L.epistemicLabel.adaptation}</option>
          <option value="hypothesis">{L.epistemicLabel.hypothesis}</option>
        </select>
      </label>
      <label>{t('matrix.appraisalFilter')}
        <select value={filters.appraisal} onChange={event => patchFilter('appraisal', event.target.value)}>
          <option value="all">{t('matrix.epistemicAll')}</option>
          <option value="not-appraised">{L.appraisalLabel['not-appraised']}</option>
          <option value="appraised">{L.appraisalLabel.appraised}</option>
        </select>
      </label>
      {orientation === 'source' && <label>{t('matrix.roleFilter')}
        <select value={filters.researchRole} onChange={event => patchFilter('researchRole', event.target.value)}>
          <option value="all">{t('matrixExtra.allRoles')}</option>
          {(Object.keys(L.researchRoleLabel) as ResearchRole[]).map(role => <option key={role} value={role}>{L.researchRoleLabel[role]}</option>)}
        </select>
      </label>}
    </div>
    <p id="matrix-filter-status" className="sr-only" aria-live="polite" aria-atomic="true">
      {orientation === 'criterion'
        ? t('matrix.filterCriterion', { count: criterionRows.length })
        : orientation === 'source'
          ? t('matrix.filterSource', { count: sourceRows.length })
          : t('matrix.filterArgument')}
    </p>

    {orientation === 'criterion' && <div className="table-wrap" tabIndex={0}><table>
      <caption>{t('matrix.captionCriterion')}</caption>
      <thead><tr>{criterionCols.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{criterionRows.map(row => {
        const active = selectedId === row.criterion.id || row.claims.some(claim => claim.claimId === selectedId);
        const criterionLabel = translateResearchField(locale, 'criteria', row.criterion.id, 'label', row.criterion.label, { hashMatches });
        return <tr key={row.criterion.id} className={active ? 'selected' : ''}>
          <th scope="row">
            <button type="button" onClick={() => onSelect(row.criterion.id)}>{criterionLabel.text}</button>
            {criterionLabel.notice && <p className="subtle translation-notice" role="note">{criterionLabel.notice}</p>}
            <p className="subtle">{L.epistemicLabel[row.criterion.epistemicStatus]}</p>
            <p className="subtle">id: {row.criterion.id}</p>
          </th>
          <td>
            {row.missingConstructIds.length > 0 && <p className="error-text">{t('matrixExtra.missingConstruct', { ids: row.missingConstructIds.join(', ') })}</p>}
            {row.constructs.length ? row.constructs.map(item => {
              const def = translateResearchField(locale, 'constructs', item.id, 'definition', item.definition, { hashMatches });
              return <div key={item.id} className="matrix-block">
                <button type="button" onClick={() => onSelect(item.id)}>{labelOf(item.id)}</button>
                <p>{recordedState(def.text, t('matrixExtra.defMissing'))}</p>
                {def.notice && <p className="subtle translation-notice" role="note">{def.notice}</p>}
                {item.competingDefinitions.trim()
                  ? <p className="competing">{t('matrixExtra.competingKept', { text: item.competingDefinitions })}</p>
                  : <p className="subtle">{t('matrixExtra.competingNone')}</p>}
              </div>;
            }) : <p className="subtle">{t('matrixExtra.constructNeed')}</p>}
          </td>
          <td>
            {row.claims.length ? row.claims.map(claim => <div key={`${claim.claimId}-${claim.relationshipId}`} className="matrix-block">
              <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement.slice(0, 110) || claim.claimId}</button>
              <p className="subtle">{claim.sourceLabel} · {L.appraisalLabel[claim.appraisal]}</p>
              <p className="subtle">{recordedState(claim.locator, t('common.notRecorded'))}</p>
              <p className="chain-tag">{L.chainKindLabel[claim.chainKind]}</p>
              <p className="subtle">{claim.pathLabels.map(id => labelOf(id) || id).join(' → ')}</p>
              <button type="button" className="quiet" onClick={() => onEdge(claim.relationshipId)}>{t('matrixExtra.inspectLink', { meaning: L.meaningLabel[claim.meaning] })}</button>
            </div>) : <p className="subtle">{t('matrixExtra.noClaimRow')}</p>}
          </td>
          <td>
            {row.adaptations.length ? row.adaptations.map(link => {
              const linkLabel = translateResearchField(locale, 'relationships', link.id, 'label', link.label || L.meaningLabel[link.meaning], { hashMatches });
              return <div key={link.id} className="matrix-block">
                <button type="button" onClick={() => onEdge(link.id)}>{linkLabel.text}</button>
                {linkLabel.notice && <p className="subtle translation-notice" role="note">{linkLabel.notice}</p>}
                <p className="subtle">{link.sourceLabel} → {link.targetLabel}</p>
                <p className="chain-tag">{L.chainKindLabel['adaptation-step']}</p>
              </div>;
            }) : <p className="subtle">{t('matrixExtra.noAdaptation')}</p>}
          </td>
          <td>
            <p>{recordedState(translateResearchField(locale, 'criteria', row.criterion.id, 'evidenceRequirements', row.criterion.evidenceRequirements, { hashMatches }).text)}</p>
            <p className="subtle">{t('matrixExtra.assessor', { value: recordedState(row.criterion.assessor, t('common.notRecorded')) })}</p>
            <p className="subtle">{t('matrixExtra.unit', { value: recordedState(row.criterion.unit) })}</p>
          </td>
          <td>{recordedState(translateResearchField(locale, 'criteria', row.criterion.id, 'decisionRule', row.criterion.decisionRule, { hashMatches }).text)}</td>
          <td>{recordedState(translateResearchField(locale, 'criteria', row.criterion.id, 'permittedInference', row.criterion.permittedInference, { hashMatches }).text)}</td>
          <td>{recordedState(row.criterion.validationNeed, t('common.notRecorded'))}</td>
        </tr>;
      })}</tbody>
    </table></div>}

    {orientation === 'source' && <>
      <p className="subtle">{t('matrixExtra.sourceRoleNote')}</p>
      <div className="table-wrap" tabIndex={0}><table>
        <caption>{t('matrix.captionSource')}</caption>
        <thead><tr>{sourceCols.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{sourceRows.map(row => {
          const active = selectedId === row.source.id || row.claims.some(claim => claim.id === selectedId);
          return <tr key={row.source.id} className={active ? 'selected' : ''}>
            <th scope="row">
              <button type="button" onClick={() => onSelect(row.source.id)}>{row.source.label}</button>
              <p className="subtle">id: {row.source.id}</p>
            </th>
            <td>
              <p>{L.researchRoleLabel[row.researchRole]}</p>
              <p className="subtle">{t('matrixExtra.rolesNotRanked')}</p>
            </td>
            <td>{row.claims.length ? row.claims.map(claim => <div key={claim.id} className="matrix-block">
              <button type="button" onClick={() => onSelect(claim.id)}>{claim.statement.slice(0, 100) || claim.id}</button>
              <p className="subtle">{L.appraisalLabel[claim.appraisal]} · {recordedState(claim.locator, t('common.notRecorded'))}</p>
            </div>) : <p className="subtle">{t('matrixExtra.noStatement')}</p>}</td>
            <td>{row.appearances.length ? row.appearances.map((item, index) => <div key={`${item.relationshipId}-${index}`} className="matrix-block">
              <button type="button" onClick={() => onSelect(item.criterionId)}>{labelOf(item.criterionId) || item.criterionLabel}</button>
              <p className="chain-tag">{L.chainKindLabel[item.chainKind]}</p>
              <button type="button" className="quiet" onClick={() => onEdge(item.relationshipId)}>{t('matrixExtra.inspectLink', { meaning: L.meaningLabel[item.meaning] })}</button>
            </div>) : <p className="subtle">{t('matrixExtra.noAppearance')}</p>}</td>
            <td>{row.competingNotes.length ? row.competingNotes.map(note => <p key={note} className="competing">{note}</p>) : <p className="subtle">{t('matrixExtra.noCompeting')}</p>}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </>}

    {orientation === 'argument' && <div className="argument-view">
      <label>{t('matrixExtra.decision')}
        <select value={decisionId} onChange={event => { setDecisionId(event.target.value); onSelect(event.target.value); }}>
          {!model.decisions.length && <option value="">{t('matrixExtra.noDecisions')}</option>}
          {model.decisions.map(item => <option key={item.id} value={item.id}>{labelOf(item.id)}</option>)}
        </select>
      </label>
      {!argument && <p className="subtle">{t('matrixExtra.pickDecision')}</p>}
      {argument && <>
        <article className="question-record selected">
          <h2>{labelOf(argument.decision.id)}</h2>
          <p className="subtle">id: {argument.decision.id}</p>
          <h3>{t('matrixExtra.proposedChoice')}</h3>
          <p>{recordedState(translateResearchField(locale, 'decisions', argument.decision.id, 'statement', argument.decision.statement, { hashMatches }).text)}</p>
          <h3>{t('matrixExtra.rationale')}</h3>
          <p>{recordedState(translateResearchField(locale, 'decisions', argument.decision.id, 'rationale', argument.decision.rationale, { hashMatches }).text)}</p>
          <h3>{t('matrixExtra.scope')}</h3>
          <p>{recordedState(translateResearchField(locale, 'decisions', argument.decision.id, 'scope', argument.decision.scope, { hashMatches }).text)}</p>
          {argument.missingRecordIds.length > 0 && <p className="error-text">{t('matrixExtra.missingRefs', { ids: argument.missingRecordIds.join(', ') })}</p>}
        </article>
        <section className="case-section">
          <h3>{t('matrixExtra.relatedClaims')}</h3>
          {argument.relatedClaims.length ? argument.relatedClaims.map(claim => <div key={claim.claimId} className="matrix-block">
            <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement || claim.claimId}</button>
            <p className="subtle">{claim.sourceLabel} · {recordedState(claim.locator)}</p>
          </div>) : <p className="subtle">{t('matrixExtra.noRelatedClaims')}</p>}
        </section>
        <section className="case-section">
          <h3>{t('matrixExtra.counter')}</h3>
          {argument.counterevidence.length ? argument.counterevidence.map(claim => <div key={claim.claimId} className="matrix-block">
            <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement || claim.claimId}</button>
            <p className="chain-tag">{L.chainKindLabel.counterevidence}</p>
          </div>) : <p className="subtle">{t('matrixExtra.noCounter')}</p>}
        </section>
        <section className="case-section">
          <h3>{t('matrixExtra.limits')}</h3>
          {argument.limitations.length ? argument.limitations.map(item => <p key={item}>{item}</p>) : <p className="subtle">{t('matrixExtra.noLimits')}</p>}
        </section>
        <section className="case-section">
          <h3>{t('matrixExtra.adaptations')}</h3>
          {argument.adaptations.length ? argument.adaptations.map(link => <button type="button" key={link.id} onClick={() => onEdge(link.id)}>{translateResearchField(locale, 'relationships', link.id, 'label', link.label || L.meaningLabel[link.meaning], { hashMatches }).text} · {link.sourceLabel} → {link.targetLabel}</button>) : <p className="subtle">{t('matrixExtra.noAdaptations')}</p>}
        </section>
        <section className="case-section">
          <h3>{t('matrixExtra.remaining')}</h3>
          {argument.remainingQuestions.length ? argument.remainingQuestions.map(item => {
            const statement = translateResearchField(locale, 'propositions', item.id, 'statement', item.statement, { hashMatches });
            return <div key={item.id} className="matrix-block">
              <button type="button" onClick={() => onSelect(item.id)}>{labelOf(item.id)}</button>
              <p>{statement.text}</p>
              {statement.notice && <p className="subtle translation-notice" role="note">{statement.notice}</p>}
            </div>;
          }) : <p className="subtle">{t('matrixExtra.noRemaining')}</p>}
        </section>
      </>}
    </div>}

    {(selectedCriterion || selectedSource) && orientation !== 'argument' && <aside className="matrix-focus" aria-label={t('matrixExtra.focus')}>
      <h3>{t('matrixExtra.focus')}</h3>
      {selectedCriterion && <>
        <p>{t('matrixExtra.focusCriterion')} <button type="button" onClick={() => onSelect(selectedCriterion.criterion.id)}>{labelOf(selectedCriterion.criterion.id)}</button> {t('matrixExtra.focusUsesSame')}</p>
        {selectedCriterion.claims[0] && <p>{t('matrixExtra.focusChain')} <button type="button" onClick={() => onSelect(selectedCriterion.claims[0].claimId)}>{selectedCriterion.claims[0].claimId}</button> · {L.chainKindLabel[selectedCriterion.claims[0].chainKind]}</p>}
      </>}
      {selectedSource && <p>{t('matrixExtra.focusSource')} <button type="button" onClick={() => onSelect(selectedSource.source.id)}>{selectedSource.source.label}</button> · {t('matrixExtra.focusRole')} {L.researchRoleLabel[selectedSource.researchRole]}.</p>}
    </aside>}
  </section>;
}
