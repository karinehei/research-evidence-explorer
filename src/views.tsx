import { useEffect, useState } from 'react';
import { epistemicLabel } from './labels.ts';
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
    setMessage('Protokolla viety ilman inventoituja havaintoja tai yhdistelmäpistettä.');
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
        setMessage('Ankkuri päivitetty; rubriikki pysyy alustavana.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ankkurin päivitys epäonnistui.');
    }
  }

  return <section>
    <p className="subtle">Propositiot ovat testaamattomia oletuksia. Näkymä ei esitä niiden tueksi tuloksia.</p>
    <p className="subtle">{PROTOCOL_DISCLAIMER}</p>
    <div className="question-list">{model.propositions.map(item => {
      const criteria = item.criterionIds.map(id => model.criteria.find(criterion => criterion.id === id)?.label).filter(Boolean).join('; ');
      const constructs = (item.constructIds || []).map(id => model.constructs.find(entry => entry.id === id)?.label).filter(Boolean).join('; ');
      const protocols = (item.protocolIds || []).map(id => model.protocols.find(entry => entry.id === id)?.label).filter(Boolean).join('; ');
      return <article key={item.id} className={`question-record${item.id === selectedId ? ' selected' : ''}`}>
        <span className={`tag ${item.epistemicStatus}`}>{epistemicLabel[item.epistemicStatus]}</span>
        <span className="tag">{claimKindLabel[item.intendedClaimKind]}</span>
        <h2>{item.label}</h2>
        <p>{item.statement}</p>
        <p className="subtle">{item.boundary}</p>
        <p className="subtle">{item.intendedClaim || 'Ehdotettua väitelajia ei ole vielä täsmennetty.'}</p>
        <p className="subtle">{item.proposedDesign || 'Ehdotettua asetelmaa ei ole vielä kirjattu.'}</p>
        <p className="subtle">{criteria ? `Kriteeriviitteet: ${criteria}` : 'Kriteeriviitettä ei ole kirjattu.'}</p>
        <p className="subtle">{constructs ? `Käsiteviitteet: ${constructs}` : 'Käsiteviitettä ei ole kirjattu.'}</p>
        <p className="subtle">{protocols ? `Protokollat: ${protocols}` : 'Protokollaviitettä ei ole kirjattu.'}</p>
        <button type="button" onClick={() => onSelect(item.id)}>Tarkastele kirjausta</button>{' '}
        <button type="button" onClick={() => onTrace(item.id)}>Tutki perusteluketjua</button>
        {(item.protocolIds || []).map(id => <button key={id} type="button" onClick={() => { setProtocolId(id); onSelect(id); }}>Avaa protokolla {id}</button>)}
      </article>;
    })}</div>

    <h2>Arviointiprotokollat (alustava rubriikki)</h2>
    {!model.protocols.length && <p className="subtle">Protokollia ei ole vielä kirjattu.</p>}
    <div className="question-list">{model.protocols.map(item => (
      <article key={item.id} className={`question-record${item.id === selectedId || item.id === protocolId ? ' selected' : ''}`}>
        <span className="tag hypothesis">provisional-draft</span>
        <span className="tag">{claimKindLabel[item.designKind]}</span>
        <h3>{item.label}</h3>
        <p>{item.designSummary}</p>
        <p className="subtle">Havaintoja: {item.observations.length}. Yhdistelmäpiste: {item.compositeTrustScore}.</p>
        <button type="button" onClick={() => { setProtocolId(item.id); onSelect(item.id); }}>Tarkastele protokolla</button>
      </article>
    ))}</div>

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

    <h2>Tutkimuspäätökset</h2>
    {model.decisions.map(item => <article key={item.id} className={`question-record${item.id === selectedId ? ' selected' : ''}`}><span className={`tag ${item.epistemicStatus}`}>{epistemicLabel[item.epistemicStatus]}</span> <span className="tag">{item.reviewState === 'imported' ? 'Tuotu aineistosta' : item.reviewState === 'reviewed' ? 'Arvioitu' : 'Ehdotettu'}</span><h3>{item.label}</h3><p>{item.statement}</p><button type="button" onClick={() => onSelect(item.id)}>Muokkaa päätöstä</button></article>)}
    <button type="button" onClick={onAddDecision}>Lisää tutkimuspäätös</button>
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
  const dimension = protocol.dimensions.find(item => item.id === dimensionId);
  return <div className="protocol-panel">
    <h2>{protocol.label}</h2>
    <p className="subtle">Tila: {protocol.status}. Rubriikki on alustava kunnes validointinäyttö tukee vahvempaa kieltä.</p>
    <p>{protocol.designSummary}</p>
    <p className="subtle">Väitelaji: {claimKindLabel[protocol.designKind]}</p>
    <p className="subtle">Propositiot: {protocol.propositionIds.map(id => model.propositions.find(item => item.id === id)?.label || id).join('; ') || '—'}</p>
    <p className="subtle">Kriteerit: {protocol.criterionIds.map(id => model.criteria.find(item => item.id === id)?.label || id).join('; ') || '—'}</p>
    <p className="subtle">Kohteet (vastaus × näyttö): {protocol.targets.length
      ? protocol.targets.map(target => `${target.caseId}/${target.answerVariantId}/${target.displayConditionId}`).join('; ')
      : 'Ei kohdetta kirjattu.'}</p>
    <p className="subtle">Identiteetit — kysymys: {protocol.identities.questionIds.join(', ') || '—'}; tiedontarve: {protocol.identities.informationNeedIds.join(', ') || '—'}; muunnelma: {protocol.identities.queryVariantIds.join(', ') || '—'}; arvioija: {protocol.identities.raterIds.join(', ') || '—'}</p>
    <p className="subtle">Sokaisu: {protocol.procedure.blinding || '—'}</p>
    <p className="subtle">Satunnaistus: {protocol.procedure.randomisation || '—'}</p>
    <p className="subtle">Toistot: {protocol.procedure.repeatedObservations || '—'}</p>
    <p className="subtle">Eroavuudet: {protocol.procedure.disagreementHandling || '—'}</p>
    <p className="subtle">{protocol.procedure.independenceNote}</p>
    <h3>Viisi erillistä asiantuntijaulottuvuutta</h3>
    <ul>{protocol.dimensions.map(item => <li key={item.id}><strong>{item.label}</strong> — {item.draftWording} ({item.cannotAssessLabel}; provisional)</li>)}</ul>
    <h3>Erilliset auditointitehtävät</h3>
    <ul>{protocol.separateAudits.map(item => <li key={item.id}>{item.kind}: {item.statement}</li>)}</ul>
    <h3>Validointitarkistukset</h3>
    <ul>{protocol.validationChecks.map(item => <li key={item.id}>{item.label} ({validationFocusLabel[item.focus]}): {item.question}</li>)}</ul>
    <h3>Ankkurin muutos (kirjattu perustelu pakollinen)</h3>
    <label>Ulottuvuus
      <select value={dimensionId} onChange={event => onDimension(event.target.value)}>
        {protocol.dimensions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label>Ankkuri
      <select value={anchorId} onChange={event => onAnchor(event.target.value)}>
        {(dimension?.anchors || []).map(item => <option key={item.id} value={item.id}>{item.category}: {item.wording}</option>)}
      </select>
    </label>
    <label>Uusi sanamuoto<textarea value={anchorWording} onChange={event => onWording(event.target.value)} rows={3} /></label>
    <label>Perustelu<textarea value={anchorRationale} onChange={event => onRationale(event.target.value)} rows={2} /></label>
    <div className="actions">
      <button type="button" onClick={onRevise}>Tallenna ankkurin muutos</button>
      <button type="button" onClick={onExport}>Vie arviointiprotokolla JSON</button>
      {protocol.propositionIds.map(id => <button key={id} type="button" onClick={() => onSelect(id)}>Avaa propositio {id}</button>)}
    </div>
    {message && <p className="subtle" role="status">{message}</p>}
  </div>;
}
