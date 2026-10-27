import { Fragment, useEffect, useId, useMemo, useState } from 'react';
import { useI18n, displayRecordLabel, translateResearchField } from './i18n/index.ts';
import { labelsFor } from './labels.ts';
import {
  buildArgumentView, buildCriterionRows, buildSourceRows, emptyFilters, exportMatrixBundle,
  filterCriterionRows, filterSourceRows, recordedState, type CriterionMatrixRow, type MatrixFilters, type MatrixOrientation
} from './matrix.ts';
import type { ResearchRole, Workspace } from './types.ts';

type Density = 'compact' | 'full';

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function uniqueCounts(row: CriterionMatrixRow) {
  const claimIds = new Set(row.claims.map(claim => claim.claimId).filter(Boolean));
  const sourceIds = new Set(row.claims.map(claim => claim.sourceId).filter(Boolean));
  return { claimCount: claimIds.size, sourceCount: sourceIds.size };
}

export function MatrixView({ model, selectedId, onSelect, onEdge, onCsv, onEditRecord, onClearConstructContext }: {
  model: Workspace;
  selectedId: string;
  onSelect: (id: string) => void;
  onEdge: (id: string) => void;
  onCsv: () => void;
  onEditRecord: (id: string) => void;
  onClearConstructContext: () => void;
}) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const baseId = useId();
  const [orientation, setOrientation] = useState<MatrixOrientation>('criterion');
  const [density, setDensity] = useState<Density>('compact');
  const [filters, setFilters] = useState<MatrixFilters>(emptyFilters);
  const [constructContextId, setConstructContextId] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [decisionId, setDecisionId] = useState(model.decisions[0]?.id || '');

  useEffect(() => {
    if (!model.constructs.some(item => item.id === selectedId)) return;
    setConstructContextId(selectedId);
    setFilters(current => current.constructId === selectedId ? current : { ...current, constructId: selectedId });
  }, [selectedId, model.constructs]);

  const activeConstructId = constructContextId || filters.constructId;
  const effectiveFilters = useMemo(
    () => ({ ...filters, constructId: activeConstructId }),
    [filters, activeConstructId]
  );

  const criterionRows = useMemo(() => filterCriterionRows(buildCriterionRows(model), effectiveFilters), [model, effectiveFilters]);
  const sourceRows = useMemo(() => filterSourceRows(buildSourceRows(model), effectiveFilters), [model, effectiveFilters]);
  const argument = orientation === 'argument' && decisionId ? buildArgumentView(model, decisionId) : null;
  const selectedCriterion = criterionRows.find(row => row.criterion.id === selectedId)
    || buildCriterionRows(model).find(row => row.criterion.id === selectedId);
  const selectedSource = sourceRows.find(row => row.source.id === selectedId)
    || buildSourceRows(model).find(row => row.source.id === selectedId);

  function patchFilter<K extends keyof MatrixFilters>(key: K, value: MatrixFilters[K]) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function setConstructFilter(id: string) {
    patchFilter('constructId', id);
    setConstructContextId(id);
    if (id) onSelect(id);
    else onClearConstructContext();
  }

  function clearConstructContext() {
    setConstructContextId('');
    patchFilter('constructId', '');
    onClearConstructContext();
  }

  function exportCurrent() {
    const bundle = exportMatrixBundle(model, { orientation, filters: effectiveFilters, selectedId, decisionId: orientation === 'argument' ? decisionId : '' });
    downloadText('research-matrix.json', JSON.stringify(bundle, null, 2), 'application/json');
  }

  function labelOf(id: string) {
    return displayRecordLabel(locale, model, id, hashMatches);
  }

  function toggleExpanded(id: string) {
    setExpandedIds(current => ({ ...current, [id]: !current[id] }));
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
  const compactCols = [
    t('matrix.colCriterion'), t('matrix.colConstructs'), t('matrix.colEvidence'), t('matrix.colDetails')
  ];

  const contextLabel = constructContextId ? labelOf(constructContextId) : '';

  function renderCriterionDetails(row: CriterionMatrixRow, panelId: string) {
    return <div id={panelId} className="matrix-details" role="region" aria-label={t('matrix.colDetails')}>
      <section>
        <h4>{t('matrix.sectionDefinitions')}</h4>
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
      </section>
      <section>
        <h4>{t('matrix.sectionClaims')}</h4>
        {row.claims.length ? row.claims.map(claim => <div key={`${claim.claimId}-${claim.relationshipId}`} className="matrix-block">
          <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement.slice(0, 110) || claim.claimId}</button>
          <p className="subtle">{claim.sourceLabel} · {L.appraisalLabel[claim.appraisal]}</p>
          <p className="subtle">{recordedState(claim.locator, t('common.notRecorded'))}</p>
          <p className="chain-tag">{L.chainKindLabel[claim.chainKind]}</p>
          <p className="subtle">{claim.pathLabels.map(id => labelOf(id) || id).join(' → ')}</p>
          <button type="button" className="quiet" onClick={() => onEdge(claim.relationshipId)}>{t('matrixExtra.inspectLink', { meaning: L.meaningLabel[claim.meaning] })}</button>
        </div>) : <p className="subtle">{t('matrixExtra.noClaimRow')}</p>}
        {row.adaptations.length ? row.adaptations.map(link => {
          const linkLabel = translateResearchField(locale, 'relationships', link.id, 'label', link.label || L.meaningLabel[link.meaning], { hashMatches });
          return <div key={link.id} className="matrix-block">
            <button type="button" onClick={() => onEdge(link.id)}>{linkLabel.text}</button>
            {linkLabel.notice && <p className="subtle translation-notice" role="note">{linkLabel.notice}</p>}
            <p className="subtle">{link.sourceLabel} → {link.targetLabel}</p>
            <p className="chain-tag">{L.chainKindLabel['adaptation-step']}</p>
          </div>;
        }) : <p className="subtle">{t('matrixExtra.noAdaptation')}</p>}
      </section>
      <section>
        <h4>{t('matrix.sectionProcedure')}</h4>
        <p>{recordedState(translateResearchField(locale, 'criteria', row.criterion.id, 'evidenceRequirements', row.criterion.evidenceRequirements, { hashMatches }).text)}</p>
        <p className="subtle">{t('matrixExtra.assessor', { value: recordedState(row.criterion.assessor, t('common.notRecorded')) })}</p>
        <p className="subtle">{t('matrixExtra.unit', { value: recordedState(row.criterion.unit) })}</p>
        <p>{recordedState(translateResearchField(locale, 'criteria', row.criterion.id, 'decisionRule', row.criterion.decisionRule, { hashMatches }).text)}</p>
      </section>
      <section>
        <h4>{t('matrix.sectionLimits')}</h4>
        <p>{recordedState(translateResearchField(locale, 'criteria', row.criterion.id, 'permittedInference', row.criterion.permittedInference, { hashMatches }).text)}</p>
        <p>{recordedState(row.criterion.validationNeed, t('common.notRecorded'))}</p>
      </section>
    </div>;
  }

  function renderCompactCriterionBody(row: CriterionMatrixRow, surface: 'table' | 'card') {
    const criterionLabel = translateResearchField(locale, 'criteria', row.criterion.id, 'label', row.criterion.label, { hashMatches });
    const counts = uniqueCounts(row);
    const panelId = `${baseId}-details-${surface}-${row.criterion.id}`;
    const expanded = Boolean(expandedIds[row.criterion.id]);
    const active = selectedId === row.criterion.id || row.claims.some(claim => claim.claimId === selectedId);

    return {
      criterionLabel,
      counts,
      panelId,
      expanded,
      active,
      titleButton: <button type="button" onClick={() => onSelect(row.criterion.id)}>{criterionLabel.text}</button>,
      notice: criterionLabel.notice
        ? <p className="subtle translation-notice" role="note">{criterionLabel.notice}</p>
        : null,
      tags: <div className="matrix-tags">
        <span className={`tag ${row.criterion.epistemicStatus}`} title={t('matrix.epistemicTag')}>{L.epistemicLabel[row.criterion.epistemicStatus]}</span>
        <span className="tag" title={t('matrix.reviewStatus')}>{L.reviewLabel[row.criterion.reviewState]}</span>
      </div>,
      constructsCell: <>
        {row.missingConstructIds.length > 0 && <p className="error-text">{t('matrixExtra.missingConstruct', { ids: row.missingConstructIds.join(', ') })}</p>}
        {row.constructs.length
          ? <div className="matrix-chips">{row.constructs.map(item =>
            <button type="button" key={item.id} className="matrix-chip" onClick={() => onSelect(item.id)}>{labelOf(item.id)}</button>
          )}</div>
          : <p className="subtle">{t('matrixExtra.constructNeed')}</p>}
      </>,
      evidenceCell: <>
        <p>{t('matrix.claimCount', { count: counts.claimCount })}</p>
        <p>{t('matrix.sourceCount', { count: counts.sourceCount })}</p>
      </>,
      actions: <>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => toggleExpanded(row.criterion.id)}
        >{expanded ? t('matrix.hideDetails') : t('matrix.showDetails')}</button>
        <button type="button" className="quiet" onClick={() => onEditRecord(row.criterion.id)}>{t('matrix.editRecord')}</button>
      </>
    };
  }

  function renderFullCriterionRow(row: CriterionMatrixRow) {
    const active = selectedId === row.criterion.id || row.claims.some(claim => claim.claimId === selectedId);
    const criterionLabel = translateResearchField(locale, 'criteria', row.criterion.id, 'label', row.criterion.label, { hashMatches });
    return <tr key={row.criterion.id} className={active ? 'selected' : ''}>
      <th scope="row">
        <button type="button" onClick={() => onSelect(row.criterion.id)}>{criterionLabel.text}</button>
        {criterionLabel.notice && <p className="subtle translation-notice" role="note">{criterionLabel.notice}</p>}
        <p className="subtle">{L.epistemicLabel[row.criterion.epistemicStatus]}</p>
        <p className="subtle">id: {row.criterion.id}</p>
        <button type="button" className="quiet" onClick={() => onEditRecord(row.criterion.id)}>{t('matrix.editRecord')}</button>
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
  }

  return <section className="matrix-view">
    <div className="table-intro">
      <p>{t('matrix.intro')}</p>
      <div className="matrix-export-actions">
        <button type="button" onClick={exportCurrent}>{t('matrix.exportJson')}</button>
        <button type="button" onClick={onCsv}>{t('matrix.exportCsv')}</button>
      </div>
    </div>

    {constructContextId && <div className="matrix-context-banner" role="status">
      <p>{t('matrix.constructContext', { label: contextLabel || constructContextId })}</p>
      <button type="button" onClick={clearConstructContext}>{t('matrix.showAllCriteria')}</button>
    </div>}

    <div className="matrix-toolbar" role="toolbar" aria-label={t('matrix.filtersAria')}>
      <div className="case-tabs" aria-label={t('matrix.orientationAria')}>
        <button type="button" aria-pressed={orientation === 'criterion'} onClick={() => setOrientation('criterion')}>{t('matrix.criterionView')}</button>
        <button type="button" aria-pressed={orientation === 'source'} onClick={() => setOrientation('source')}>{t('matrix.sourceView')}</button>
        <button type="button" aria-pressed={orientation === 'argument'} onClick={() => setOrientation('argument')}>{t('matrix.argumentView')}</button>
      </div>
      <label>{t('matrix.constructFilter')}
        <select value={activeConstructId} onChange={event => setConstructFilter(event.target.value)}>
          <option value="">{t('matrix.constructAll')}</option>
          {model.constructs.map(item => <option key={item.id} value={item.id}>{labelOf(item.id)}</option>)}
        </select>
      </label>
      {orientation === 'criterion' && <div className="case-tabs matrix-density" aria-label={t('matrix.densityAria')}>
        <button type="button" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>{t('matrix.densityCompact')}</button>
        <button type="button" aria-pressed={density === 'full'} onClick={() => setDensity('full')}>{t('matrix.densityFull')}</button>
      </div>}
      <details className="matrix-more-filters">
        <summary>{t('matrix.moreFilters')}</summary>
        <div className="matrix-more-filters-body">
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
      </details>
    </div>
    <p className="subtle matrix-counts-note">{t('matrix.countsNote')}</p>
    <p id="matrix-filter-status" className="sr-only" aria-live="polite" aria-atomic="true">
      {orientation === 'criterion'
        ? t('matrix.filterCriterion', { count: criterionRows.length })
        : orientation === 'source'
          ? t('matrix.filterSource', { count: sourceRows.length })
          : t('matrix.filterArgument')}
    </p>

    {orientation === 'criterion' && density === 'compact' && <div className="matrix-compact">
      <div className="table-wrap matrix-table-compact" tabIndex={0}>
        <table>
          <caption>{t('matrix.compactCaption')}</caption>
          <thead><tr>{compactCols.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
          <tbody>{criterionRows.map(row => {
            const body = renderCompactCriterionBody(row, 'table');
            return <Fragment key={row.criterion.id}>
              <tr className={body.active ? 'selected' : ''}>
                <th scope="row">
                  {body.titleButton}
                  {body.notice}
                  {body.tags}
                </th>
                <td>{body.constructsCell}</td>
                <td>{body.evidenceCell}</td>
                <td className="matrix-actions-cell">{body.actions}</td>
              </tr>
              {body.expanded && <tr className="matrix-details-row">
                <td colSpan={4}>{renderCriterionDetails(row, body.panelId)}</td>
              </tr>}
            </Fragment>;
          })}</tbody>
        </table>
      </div>
      <div className="matrix-cards" aria-label={t('matrix.compactCaption')}>
        {criterionRows.map(row => {
          const body = renderCompactCriterionBody(row, 'card');
          return <article key={row.criterion.id} className={`matrix-card${body.active ? ' selected' : ''}`}>
            <h3>{body.titleButton}</h3>
            {body.notice}
            {body.tags}
            <div className="matrix-card-section">
              <h4>{t('matrix.colConstructs')}</h4>
              {body.constructsCell}
            </div>
            <div className="matrix-card-section">
              <h4>{t('matrix.colEvidence')}</h4>
              {body.evidenceCell}
            </div>
            <div className="matrix-card-actions">{body.actions}</div>
            {body.expanded && renderCriterionDetails(row, body.panelId)}
          </article>;
        })}
      </div>
    </div>}

    {orientation === 'criterion' && density === 'full' && <div className="table-wrap matrix-full" tabIndex={0}><table>
      <caption>{t('matrix.captionCriterion')}</caption>
      <thead><tr>{criterionCols.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{criterionRows.map(row => renderFullCriterionRow(row))}</tbody>
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
