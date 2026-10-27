import { useEffect, useState } from 'react';
import { labelsFor } from './labels.ts';
import { useI18n, translateResearchField, displayRecordLabel } from './i18n/index.ts';
import {
  PROTOCOL_DISCLAIMER, claimKindLabel, exportAssessmentProtocol, reviseAnchor, validationFocusLabel
} from './protocols.ts';
import type { AssessmentProtocol, Workspace } from './types.ts';

export { MatrixView } from './MatrixView.tsx';
export { CasesView } from './CasesView.tsx';

function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function QuestionsView({ model, selectedId, onSelect, onTrace, onAddDecision, onSave }: {
  model: Workspace;
  selectedId: string;
  onSelect: (id: string) => void;
  onTrace: (id: string) => void;
  onAddDecision: () => void;
  onSave: (next: Workspace, message: string) => boolean;
}) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const selectedProtocol = model.protocols.find(item => item.id === selectedId)
    || model.protocols.find(item => model.propositions.find(p => p.id === selectedId)?.protocolIds.includes(item.id))
    || model.protocols[0];
  const [protocolId, setProtocolId] = useState(selectedProtocol?.id || '');
  const [dimensionId, setDimensionId] = useState('');
  const [anchorId, setAnchorId] = useState('');
  const [anchorWording, setAnchorWording] = useState('');
  const [anchorRationale, setAnchorRationale] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const next = model.protocols.find(item => item.id === selectedId)
      || model.protocols.find(item => model.propositions.find(p => p.id === selectedId)?.protocolIds.includes(item.id))
      || model.protocols[0];
    setProtocolId(next?.id || '');
    setMessage('');
  }, [selectedId, model]);

  const protocol = model.protocols.find(item => item.id === protocolId) || null;
  useEffect(() => {
    if (!protocol) {
      setDimensionId('');
      setAnchorId('');
      setAnchorWording('');
      return;
    }
    const dimension = protocol.dimensions[0];
    const anchor = dimension?.anchors[0];
    setDimensionId(dimension?.id || '');
    setAnchorId(anchor?.id || '');
    setAnchorWording(anchor?.wording || '');
  }, [protocolId, protocol]);

  function exportProtocol() {
    if (!protocol) return;
    const bundle = exportAssessmentProtocol(model, protocol.id);
    if (!bundle) return;
    downloadText(`${protocol.id}-assessment-protocol.json`, JSON.stringify(bundle, null, 2), 'application/json');
    setMessage(t('questions.exportOk'));
  }

  function applyAnchorRevision() {
    if (!protocol) return;
    try {
      const nextProtocol = reviseAnchor(protocol, dimensionId, anchorId, anchorWording, anchorRationale);
      const copy = JSON.parse(JSON.stringify(model)) as Workspace;
      const index = copy.protocols.findIndex(item => item.id === protocol.id);
      if (index < 0) return;
      copy.protocols[index] = nextProtocol;
      if (onSave(copy, 'Ankkurin sanamuoto päivitettiin kirjatuilla perusteluilla.')) {
        setAnchorRationale('');
        setMessage(t('questions.anchorSaved'));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('questions.anchorFailed'));
    }
  }

  return <section>
    <p className="subtle">{t('questions.intro')}</p>
    <p className="subtle">{PROTOCOL_DISCLAIMER}</p>
    <div className="question-list">{model.propositions.map(item => {
      const criteria = item.criterionIds.map(id => displayRecordLabel(locale, model, id, hashMatches)).filter(Boolean).join('; ');
      const constructs = (item.constructIds || []).map(id => displayRecordLabel(locale, model, id, hashMatches)).filter(Boolean).join('; ');
      const protocols = (item.protocolIds || []).map(id => displayRecordLabel(locale, model, id, hashMatches)).filter(Boolean).join('; ');
      const label = translateResearchField(locale, 'propositions', item.id, 'label', item.label, { hashMatches });
      const statement = translateResearchField(locale, 'propositions', item.id, 'statement', item.statement, { hashMatches });
      const boundary = translateResearchField(locale, 'propositions', item.id, 'boundary', item.boundary, { hashMatches });
      const intended = translateResearchField(locale, 'propositions', item.id, 'intendedClaim', item.intendedClaim, { hashMatches });
      const design = translateResearchField(locale, 'propositions', item.id, 'proposedDesign', item.proposedDesign, { hashMatches });
      return <article key={item.id} className={`question-record${item.id === selectedId ? ' selected' : ''}`}>
        <span className={`tag ${item.epistemicStatus}`}>{L.epistemicLabel[item.epistemicStatus]}</span>
        <span className="tag">{claimKindLabel[item.intendedClaimKind]}</span>
        <h2>{label.text}</h2>
        {label.notice ? <p className="subtle translation-notice" role="note">{label.notice}</p> : null}
        <p>{statement.text}</p>
        {statement.notice ? <p className="subtle translation-notice" role="note">{statement.notice}</p> : null}
        <p className="subtle">{boundary.text}</p>
        <p className="subtle">{intended.text || t('questions.noIntended')}</p>
        <p className="subtle">{design.text || t('questions.noDesign')}</p>
        <p className="subtle">{criteria ? t('questions.criteriaRefs', { list: criteria }) : t('questions.noCriteria')}</p>
        <p className="subtle">{constructs ? t('questions.constructRefs', { list: constructs }) : t('questions.noConstructs')}</p>
        <p className="subtle">{protocols ? t('questions.protocolRefs', { list: protocols }) : t('questions.noProtocolRefs')}</p>
        <button type="button" onClick={() => onSelect(item.id)}>{t('questions.inspect')}</button>{' '}
        <button type="button" onClick={() => onTrace(item.id)}>{t('questions.trace')}</button>
        {(item.protocolIds || []).map(id => <button key={id} type="button" onClick={() => { setProtocolId(id); onSelect(id); }}>{t('questions.openProtocol', { id })}</button>)}
      </article>;
    })}</div>

    <h2>{t('questions.protocolsTitle')}</h2>
    {!model.protocols.length && <p className="subtle">{t('questions.noProtocols')}</p>}
    <div className="question-list">{model.protocols.map(item => {
      const label = translateResearchField(locale, 'protocols', item.id, 'label', item.label, { hashMatches });
      const summary = translateResearchField(locale, 'protocols', item.id, 'designSummary', item.designSummary, { hashMatches });
      return <article key={item.id} className={`question-record${item.id === selectedId || item.id === protocolId ? ' selected' : ''}`}>
        <span className="tag hypothesis">provisional-draft</span>
        <span className="tag">{claimKindLabel[item.designKind]}</span>
        <h3>{label.text}</h3>
        {label.notice ? <p className="subtle translation-notice" role="note">{label.notice}</p> : null}
        <p>{summary.text}</p>
        <p className="subtle">{t('questions.observations', { count: item.observations.length, score: String(item.compositeTrustScore) })}</p>
        <button type="button" onClick={() => { setProtocolId(item.id); onSelect(item.id); }}>{t('questions.inspectProtocol')}</button>
      </article>;
    })}</div>

    {protocol && <ProtocolPanel
      model={model}
      protocol={protocol}
      dimensionId={dimensionId}
      anchorId={anchorId}
      anchorWording={anchorWording}
      anchorRationale={anchorRationale}
      message={message}
      onDimension={id => {
        setDimensionId(id);
        const dim = protocol.dimensions.find(item => item.id === id);
        const anchor = dim?.anchors[0];
        setAnchorId(anchor?.id || '');
        setAnchorWording(anchor?.wording || '');
      }}
      onAnchor={id => {
        setAnchorId(id);
        const dim = protocol.dimensions.find(item => item.id === dimensionId);
        setAnchorWording(dim?.anchors.find(item => item.id === id)?.wording || '');
      }}
      onWording={setAnchorWording}
      onRationale={setAnchorRationale}
      onRevise={applyAnchorRevision}
      onExport={exportProtocol}
      onSelect={onSelect}
    />}

    <h2>{t('questions.decisionsTitle')}</h2>
    {model.decisions.map(item => {
      const label = translateResearchField(locale, 'decisions', item.id, 'label', item.label, { hashMatches });
      const statement = translateResearchField(locale, 'decisions', item.id, 'statement', item.statement, { hashMatches });
      return <article key={item.id} className={`question-record${item.id === selectedId ? ' selected' : ''}`}><span className={`tag ${item.epistemicStatus}`}>{L.epistemicLabel[item.epistemicStatus]}</span> <span className="tag">{L.reviewLabel[item.reviewState]}</span><h3>{label.text}</h3><p>{statement.text}</p><button type="button" onClick={() => onSelect(item.id)}>{t('questions.editDecision')}</button></article>;
    })}
    <button type="button" onClick={onAddDecision}>{t('questions.addDecision')}</button>
  </section>;
}

function ProtocolPanel({ model, protocol, dimensionId, anchorId, anchorWording, anchorRationale, message, onDimension, onAnchor, onWording, onRationale, onRevise, onExport, onSelect }: {
  model: Workspace;
  protocol: AssessmentProtocol;
  dimensionId: string;
  anchorId: string;
  anchorWording: string;
  anchorRationale: string;
  message: string;
  onDimension: (id: string) => void;
  onAnchor: (id: string) => void;
  onWording: (value: string) => void;
  onRationale: (value: string) => void;
  onRevise: () => void;
  onExport: () => void;
  onSelect: (id: string) => void;
}) {
  const { locale, t, hashMatches } = useI18n();
  const dimension = protocol.dimensions.find(item => item.id === dimensionId);
  const label = translateResearchField(locale, 'protocols', protocol.id, 'label', protocol.label, { hashMatches });
  const summary = translateResearchField(locale, 'protocols', protocol.id, 'designSummary', protocol.designSummary, { hashMatches });
  return <div className="protocol-panel">
    <h2>{label.text}</h2>
    {label.notice ? <p className="subtle translation-notice" role="note">{label.notice}</p> : null}
    <p className="subtle">Tila: {protocol.status}. Rubriikki on alustava kunnes validointinäyttö tukee vahvempaa kieltä.</p>
    <p>{summary.text}</p>
    <p className="subtle">Väitelaji: {claimKindLabel[protocol.designKind]}</p>
    <p className="subtle">Propositiot: {protocol.propositionIds.map(id => displayRecordLabel(locale, model, id, hashMatches)).join('; ') || '—'}</p>
    <p className="subtle">Kriteerit: {protocol.criterionIds.map(id => displayRecordLabel(locale, model, id, hashMatches)).join('; ') || '—'}</p>
    <p className="subtle">Kohteet (vastaus × näyttö): {protocol.targets.length
      ? protocol.targets.map(target => `${target.caseId}/${target.answerVariantId}/${target.displayConditionId}`).join('; ')
      : 'Ei kohdetta kirjattu.'}</p>
    <p className="subtle">Identiteetit — kysymys: {protocol.identities.questionIds.join(', ') || '—'}; tiedontarve: {protocol.identities.informationNeedIds.join(', ') || '—'}; muunnelma: {protocol.identities.queryVariantIds.join(', ') || '—'}; arvioija: {protocol.identities.raterIds.join(', ') || '—'}</p>
    <p className="subtle">Sokaisu: {protocol.procedure.blinding || '—'}</p>
    <p className="subtle">Satunnaistus: {protocol.procedure.randomisation || '—'}</p>
    <p className="subtle">Toistot: {protocol.procedure.repeatedObservations || '—'}</p>
    <p className="subtle">Eroavuudet: {protocol.procedure.disagreementHandling || '—'}</p>
    <p className="subtle">{protocol.procedure.independenceNote}</p>
    <h3>{t('questions.fiveDimensions')}</h3>
    <ul>{protocol.dimensions.map(item => {
      const dimLabel = translateResearchField(locale, 'protocols', protocol.id, `dim.${item.id}.label`, item.label, { hashMatches });
      return <li key={item.id}><strong>{dimLabel.text}</strong> — {item.draftWording} ({item.cannotAssessLabel}; provisional)</li>;
    })}</ul>
    <h3>{t('questions.separateAudits')}</h3>
    <ul>{protocol.separateAudits.map(item => <li key={item.id}>{item.kind}: {item.statement}</li>)}</ul>
    <h3>{t('questions.validationChecks')}</h3>
    <ul>{protocol.validationChecks.map(item => <li key={item.id}>{item.label} ({validationFocusLabel[item.focus]}): {item.question}</li>)}</ul>
    <h3>{t('questions.reviseAnchor')}</h3>
    <label>{t('questions.dimension')}
      <select value={dimensionId} onChange={event => onDimension(event.target.value)}>
        {protocol.dimensions.map(item => <option key={item.id} value={item.id}>{translateResearchField(locale, 'protocols', protocol.id, `dim.${item.id}.label`, item.label, { hashMatches }).text}</option>)}
      </select>
    </label>
    <label>{t('questions.anchor')}
      <select value={anchorId} onChange={event => onAnchor(event.target.value)}>
        {(dimension?.anchors || []).map(item => {
          const wording = translateResearchField(locale, 'protocols', protocol.id, `anchor.${item.id}.wording`, item.wording, { hashMatches });
          return <option key={item.id} value={item.id}>{item.category}: {wording.text}</option>;
        })}
      </select>
    </label>
    <label>{t('questions.newWording')}<textarea value={anchorWording} onChange={event => onWording(event.target.value)} rows={3} /></label>
    <label>{t('questions.rationale')}<textarea value={anchorRationale} onChange={event => onRationale(event.target.value)} rows={2} /></label>
    <div className="actions">
      <button type="button" onClick={onRevise}>{t('questions.saveAnchor')}</button>
      <button type="button" onClick={onExport}>{t('questions.exportProtocol')}</button>
      {protocol.propositionIds.map(id => <button key={id} type="button" onClick={() => onSelect(id)}>{t('questions.openProposition', { id })}</button>)}
    </div>
    {message && <p className="subtle" role="status">{message}</p>}
  </div>;
}
