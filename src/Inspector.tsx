import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { access, appraisal, epistemic, locate, provenance, relations, reviewStates } from './model.ts';
import {
  accessLabel, appraisalLabel, epistemicLabel, meaningLabel, provenanceLabel, publicationLabel, researchRoleLabel, reviewLabel, labelsFor
} from './labels.ts';
import { clone, newId, requireConnection } from './edit.ts';
import { useDraft, type DirtyApi } from './draft.ts';
import { Checks, SelectField, TextField } from './fields.tsx';
import { useI18n, displayRecordLabel, translateResearchField } from './i18n/index.ts';
import { appendStatementRevision, claimKindLabel, PROTOCOL_DISCLAIMER } from './protocols.ts';
import type { Access, Appraisal, ConstructedCase, Criterion, Decision, EpistemicStatus, IntendedClaimKind, Meaning, Provenance, PublicationStatus, Relationship, ResearchRole, ReviewState, Source, Workspace } from './types.ts';

type Mode = { type: 'record' } | { type: 'add-node' } | { type: 'add-edge'; sourceId: string };
type Save = (next: Workspace, message: string) => boolean;
const asList = (value: unknown) => value as string[];
const option = (ids: string[], labels: Record<string, string>) => ids.map(id => ({ id, label: labels[id] || id }));
const epistemicOptions = option(asList(epistemic), epistemicLabel);
const reviewOptions = option(asList(reviewStates), reviewLabel);
const meaningOptions = option(asList(relations), meaningLabel);

function titleOf(model: Workspace, id: string, locale: 'fi' | 'en' = 'fi', hashMatches = true): string {
  return displayRecordLabel(locale, model, id, hashMatches) || (() => {
    const item = locate(model, id) as { record?: { label?: string; statement?: string; title?: string } } | null;
    return item?.record?.label || item?.record?.statement || item?.record?.title || id;
  })();
}

function TranslationNotice({ notice }: { notice: string }) {
  if (!notice) return null;
  return <p className="subtle translation-notice" role="note">{notice}</p>;
}

function FormShell({ submit, label, children }: { submit: () => boolean; label: string; children: ReactNode }) {
  return <form onSubmit={(event: FormEvent) => { event.preventDefault(); submit(); }}>{children}<div className="actions"><button className="primary" type="submit">{label}</button></div></form>;
}

function Links({ model, id, onEdge, onAddEdge }: { model: Workspace; id: string; onEdge: (id: string) => void; onAddEdge: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const links = model.relationships.filter(link => link.source === id || link.target === id);
  return <>
    <div className="field-title">{t('inspector.links')}</div>
    <div className="record-list">{links.length ? links.map(link => {
      const other = link.source === id ? link.target : link.source;
      const linkLabel = translateResearchField(locale, 'relationships', link.id, 'label', (link.label || '').trim() || L.meaningLabel[link.meaning], { hashMatches });
      return <button type="button" key={link.id} onClick={() => onEdge(link.id)}>{link.source === id ? '→ ' : '← '}{titleOf(model, other, locale, hashMatches)} · {linkLabel.text}</button>;
    }) : <p className="subtle">{t('inspector.noLinks')}</p>}</div>
    <button type="button" onClick={() => onAddEdge(id)}>{t('inspector.addLink')}</button>
    <p className="subtle">{t('inspector.idLabel', { id })}</p>
  </>;
}

function Remove({ id, onRemove }: { id: string; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  return <button type="button" className="delete" onClick={() => onRemove(id)}>{t('inspector.removeRecord')}</button>;
}

export function Inspector({ model, selectedId, edgeId, mode, guard, onSave, onMessage, onOpen, onEdge, onAddEdge, onAddClaim, onRemove, caseDraftPaused = false }: {
  model: Workspace; selectedId: string; edgeId: string; mode: Mode; guard: RefObject<DirtyApi | null>;
  onSave: Save; onMessage: (text: string) => void; onOpen: (id: string) => void; onEdge: (id: string) => void; onAddEdge: (id: string) => void; onAddClaim: (sourceId: string) => void; onRemove: (id: string) => void;
  caseDraftPaused?: boolean;
}) {
  const { t } = useI18n();
  if (mode.type === 'add-node') return <AddNode model={model} guard={guard} onSave={onSave} onMessage={onMessage} onOpen={onOpen} />;
  if (mode.type === 'add-edge') return <AddEdge model={model} sourceId={mode.sourceId} guard={guard} onSave={onSave} onMessage={onMessage} onEdge={onEdge} />;
  if (edgeId.startsWith('link:')) return <Membership model={model} edgeId={edgeId} onOpen={onOpen} />;
  if (edgeId) return <RelationshipForm model={model} edgeId={edgeId} guard={guard} onSave={onSave} onRemove={onRemove} />;
  const item = locate(model, selectedId) as { kind: string; record: Source & Criterion & Relationship & ConstructedCase & Decision & { statement?: string } } | null;
  if (!item) return <aside className="inspector" aria-label={t('inspector.aria')}><h2>{t('inspector.pickTitle')}</h2><p className="subtle">{t('inspector.pickBody')}</p></aside>;
  return <aside className="inspector" aria-label={t('inspector.aria')}>
    {item.kind === 'source' && <SourceForm model={model} source={item.record} guard={guard} onSave={onSave} onOpen={onOpen} onEdge={onEdge} onAddEdge={onAddEdge} onAddClaim={onAddClaim} onRemove={onRemove} />}
    {item.kind === 'claim' && <ClaimForm model={model} claimId={item.record.id} guard={guard} onSave={onSave} onOpen={onOpen} onRemove={onRemove} />}
    {item.kind === 'construct' && <ConstructForm model={model} recordId={item.record.id} guard={guard} onSave={onSave} onEdge={onEdge} onAddEdge={onAddEdge} onRemove={onRemove} />}
    {item.kind === 'criterion' && <CriterionForm model={model} recordId={item.record.id} guard={guard} onSave={onSave} onEdge={onEdge} onAddEdge={onAddEdge} onRemove={onRemove} />}
    {item.kind === 'proposition' && <PropositionForm model={model} recordId={item.record.id} guard={guard} onSave={onSave} onEdge={onEdge} onAddEdge={onAddEdge} onRemove={onRemove} onOpen={onOpen} />}
    {item.kind === 'protocol' && <ProtocolForm model={model} recordId={item.record.id} onOpen={onOpen} />}
    {item.kind === 'case' && <CaseForm model={model} recordId={item.record.id} guard={guard} onSave={onSave} paused={caseDraftPaused} />}
    {item.kind === 'decision' && <DecisionForm model={model} recordId={item.record.id} guard={guard} onSave={onSave} onRemove={onRemove} />}
  </aside>;
}

function Membership({ model, edgeId, onOpen }: { model: Workspace; edgeId: string; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const claimId = edgeId.slice(5);
  const claim = model.claims.find(item => item.id === claimId);
  return <aside className="inspector" aria-label={t('inspector.aria')}><div className="eyebrow">{t('inspector.membershipEyebrow')}</div><h2>{t('inspector.membershipTitle')}</h2><p>{t('inspector.membershipBody')}</p>{claim && <button type="button" onClick={() => onOpen(claim.sourceId)}>{t('inspector.openSource')}</button>}</aside>;
}

function RelationshipForm({ model, edgeId, guard, onSave, onRemove }: { model: Workspace; edgeId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onRemove: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const epistemicOptions = option(asList(epistemic), L.epistemicLabel);
  const reviewOptions = option(asList(reviewStates), L.reviewLabel);
  const meaningOptions = option(asList(relations), L.meaningLabel);
  const edge = model.relationships.find(item => item.id === edgeId);
  const saved: Relationship = edge || { id: edgeId, meaning: 'motivates', source: '', target: '', label: '', rationale: '', locator: '', claimIds: [], sourceIds: [], epistemicStatus: 'adaptation', reviewState: 'proposed', reviewNote: '' };
  const { draft, setDraft, persist } = useDraft(saved, guard, next => {
    const copy = clone(model);
    const item = copy.relationships.find(link => link.id === edgeId);
    if (!item) return false;
    Object.assign(item, next, { label: next.label, claimIds: next.claimIds, sourceIds: next.sourceIds });
    return onSave(copy, 'Yhteyden tiedot tallennettiin.');
  });
  if (!edge) return null;
  const patch = <K extends keyof Relationship>(key: K, value: Relationship[K]) => setDraft(current => ({ ...current, [key]: value }));
  const claimNames = edge.claimIds.map(id => titleOf(model, id, locale, hashMatches));
  const sourceNames = edge.sourceIds.map(id => titleOf(model, id, locale, hashMatches));
  const labelDisplay = translateResearchField(locale, 'relationships', edge.id, 'label', (edge.label || '').trim() || L.meaningLabel[edge.meaning], { hashMatches });
  const rationaleDisplay = translateResearchField(locale, 'relationships', edge.id, 'rationale', edge.rationale, { hashMatches });
  return <aside className="inspector" aria-label={t('inspector.aria')}>
    <div className="eyebrow">{t('inspector.linkEyebrow')}</div>
    <h2>{labelDisplay.text}</h2>
    <TranslationNotice notice={labelDisplay.notice} />
    <p>{titleOf(model, edge.source, locale, hashMatches)} → {titleOf(model, edge.target, locale, hashMatches)}</p>
    <span className={`tag ${edge.epistemicStatus}`}>{L.epistemicLabel[edge.epistemicStatus]}</span> <span className="tag">{L.reviewLabel[edge.reviewState]}</span>
    <dl className="fact-list">
      <div><dt>{t('inspector.meaning')}</dt><dd>{L.meaningLabel[edge.meaning]}. {t('inspector.notCausal')}</dd></div>
      <div><dt>{t('inspector.rationale')}</dt><dd>{rationaleDisplay.text.trim() || t('inspector.notRecorded')}</dd></div>
      <div><dt>{t('inspector.evidenceRefs')}</dt><dd>{claimNames.length || sourceNames.length ? [...claimNames, ...sourceNames].join('; ') : t('inspector.notRecorded')} {edge.locator.trim() ? t('inspector.locatorPrefix', { value: edge.locator }) : ''}</dd></div>
      <div><dt>{t('inspector.epistemic')}</dt><dd>{L.epistemicLabel[edge.epistemicStatus]}</dd></div>
      <div><dt>{t('inspector.boundary')}</dt><dd>{rationaleDisplay.text.trim() || t('inspector.boundaryUnset')} {edge.reviewNote.trim() ? t('inspector.reviewNotePrefix', { value: edge.reviewNote }) : ''}</dd></div>
    </dl>
    <TranslationNotice notice={rationaleDisplay.notice} />
    <FormShell submit={persist} label={t('inspector.saveLink')}>
      <TextField label={t('inspector.visibleName')} value={draft.label} onChange={value => patch('label', value)} />
      <SelectField label={t('inspector.linkMeaning')} value={draft.meaning} onChange={value => patch('meaning', value as Meaning)} options={meaningOptions} />
      <SelectField label={t('inspector.epistemic')} value={draft.epistemicStatus} onChange={value => patch('epistemicStatus', value as EpistemicStatus)} options={epistemicOptions} />
      <SelectField label={t('inspector.review')} value={draft.reviewState} onChange={value => patch('reviewState', value as ReviewState)} options={reviewOptions} />
      <TextField label={t('inspector.rationaleBoundary')} value={draft.rationale} onChange={value => patch('rationale', value)} area />
      <TextField label={t('inspector.locatorNote')} value={draft.locator} onChange={value => patch('locator', value)} area />
      <TextField label={t('inspector.reviewNote')} value={draft.reviewNote} onChange={value => patch('reviewNote', value)} area />
      <Checks title={t('inspector.claimRefs')} records={model.claims.map(claim => ({ id: claim.id, label: claim.statement.slice(0, 80) || claim.id }))} selected={draft.claimIds} onChange={ids => patch('claimIds', ids)} />
      <Checks title={t('inspector.sourceRefs')} records={model.sources.map(source => ({ id: source.id, label: source.label }))} selected={draft.sourceIds} onChange={ids => patch('sourceIds', ids)} />
    </FormShell>
    <button type="button" className="delete" onClick={() => onRemove(edge.id)}>{t('inspector.removeLink')}</button>
  </aside>;
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return <section className="inspector-section">
    <h3>{title}</h3>
    {note && <p className="subtle">{note}</p>}
    {children}
  </section>;
}

function SourceForm({ model, source, guard, onSave, onOpen, onEdge, onAddEdge, onAddClaim, onRemove }: { model: Workspace; source: Source; guard: RefObject<DirtyApi | null>; onSave: Save; onOpen: (id: string) => void; onEdge: (id: string) => void; onAddEdge: (id: string) => void; onAddClaim: (sourceId: string) => void; onRemove: (id: string) => void }) {
  const draftSource = { ...source, nextCheck: source.nextCheck || '', researchRole: source.researchRole || 'not-recorded' };
  const { draft, setDraft, persist } = useDraft(draftSource, guard, next => {
    const copy = clone(model);
    const item = copy.sources.find(record => record.id === source.id);
    if (!item) return false;
    const position = item.position;
    const bibliographicImport = item.bibliographicImport;
    Object.assign(item, next, { position, bibliographicImport, label: next.label.trim(), doi: next.doi.trim(), url: next.url.trim(), nextCheck: next.nextCheck || '', researchRole: next.researchRole || 'not-recorded' });
    return onSave(copy, 'Lähteen tiedot tallennettiin.');
  });
  const patch = <K extends keyof Source>(key: K, value: Source[K]) => setDraft(current => ({ ...current, [key]: value }));
  const claims = model.claims.filter(claim => claim.sourceId === source.id);
  const versionChildren = model.sources.filter(item => item.versionOf === source.id);
  const adaptations = model.relationships.filter(link =>
    link.epistemicStatus === 'adaptation' && (link.source === source.id || link.target === source.id || link.sourceIds.includes(source.id))
  );
  const adaptedConstructs = model.constructs.filter(item =>
    item.epistemicStatus === 'adaptation' && model.relationships.some(link =>
      link.sourceIds.includes(source.id) && (link.source === item.id || link.target === item.id)
    )
  );
  return <>
    <div className="eyebrow">KIRJALLISUUS JA NÄYTTÖ</div><h2>{source.label}</h2>
    <p className="subtle">Bibliografinen tietue ei ole kokotekstiarvio. Julkaisun tila, lukemistieto ja väitteen arviointi pidetään erillään.</p>
    <FormShell submit={persist} label="Tallenna muutokset">
      <Section title="Bibliografinen identiteetti" note="Nimi, viite ja tunnisteet. Älä täytä DOI:ta, sivunumeroa tai julkaisukanavaa arvauksella.">
        <TextField label="Nimi" value={draft.label} onChange={value => patch('label', value)} />
        <TextField label="Koko viite" value={draft.citation} onChange={value => patch('citation', value)} area />
        <details className="citation-discover">
          <summary>Näytä tallennettu viite</summary>
          <p>{draft.citation.trim() || 'Viite on vielä tyhjä.'}</p>
        </details>
        <TextField label="Vuosi, jos se on kirjattu erikseen" value={draft.year} onChange={value => patch('year', value)} />
        <TextField label="DOI" value={draft.doi} onChange={value => patch('doi', value)} />
        <TextField label="Alkuperäislähteen linkki" value={draft.url} onChange={value => patch('url', value)} />
      </Section>
      <Section title="Julkaisu ja versiot" note="Julkaisun tila on bibliografinen päätös. Se ei seuraa DOI:sta, URL:stä eikä lukemistiedosta.">
        <SelectField label="Julkaisun tila" value={draft.publicationStatus} onChange={value => patch('publicationStatus', value as PublicationStatus)} options={option(Object.keys(publicationLabel), publicationLabel)} />
        <SelectField label="Version suhde toiseen lähteeseen" value={draft.versionOf} onChange={value => patch('versionOf', value)} options={[{ id: '', label: 'Ei versioviitettä' }, ...model.sources.filter(item => item.id !== source.id).map(item => ({ id: item.id, label: item.label }))]} />
        <SelectField label="Lähteen rooli tutkimuksessa" value={draft.researchRole || 'not-recorded'} onChange={value => patch('researchRole', value as ResearchRole)} options={option(Object.keys(researchRoleLabel), researchRoleLabel)} />
        <p className="subtle">Roolit (käsitteellinen, tekninen, empiirinen, työkalu/työnkulku) eivät ole keskenään vaihdettavia viitekehyksiä eivätkä ranking-sijoituksia.</p>
        {draft.versionOf && <p className="subtle">Tämä tietue on merkitty versiona lähteestä {titleOf(model, draft.versionOf)}.</p>}
        {versionChildren.length > 0 && <div className="record-list">{versionChildren.map(item => <button type="button" key={item.id} onClick={() => onOpen(item.id)}>Versio: {item.label}</button>)}</div>}
      </Section>
      <Section title="Raportoitu lukemistieto" note="Kertoo, mitä suunnitteluasiakirjoissa on raportoitu lukemisesta. Se ei ole menetelmällinen arviointi.">
        <SelectField label="Asiakirjassa raportoitu lukemistieto" value={draft.access} onChange={value => patch('access', value as Access)} options={option(asList(access), accessLabel)} />
        <TextField label="Lukemistiedon tarkenne" value={draft.accessNote} onChange={value => patch('accessNote', value)} area />
      </Section>
      <Section title="Tutkijan muistiinpanot">
        <TextField label="Oma pohdinta" value={draft.notes} onChange={value => patch('notes', value)} area />
        <TextField label="Seuraava tarkistus" value={draft.nextCheck || ''} onChange={value => patch('nextCheck', value)} area />
      </Section>
    </FormShell>
    {source.url && <p><a href={source.url} target="_blank" rel="noopener noreferrer">Avaa alkuperäislähde ↗</a></p>}
    <Section title="Todellinen arviointitila" note="Arviointi kuuluu lähdeväitteille. Bibliografinen tuonti ei muuta näitä arvoja.">
      {claims.length ? <ul className="plain-list">{claims.map(claim => <li key={claim.id}><button type="button" onClick={() => onOpen(claim.id)}>{claim.statement.slice(0, 80) || claim.id}</button> — {appraisalLabel[claim.appraisal]}; {provenanceLabel[claim.provenance]}</li>)}</ul> : <p className="subtle">Ei lähdeväitteitä. Arviointia ei ole kirjattu.</p>}
    </Section>
    <Section title="Lähdeväitteet" note="Väitteet ja lähdekohdat kirjataan erikseen. Automaattinen poiminta DOCX- tai PDF-tiedostosta ei kuulu tähän vaiheeseen.">
      <div className="record-list">{claims.map(claim => <button type="button" key={claim.id} onClick={() => onOpen(claim.id)}>{claim.statement.slice(0, 90) || claim.id}</button>)}</div>
      <button type="button" onClick={() => onAddClaim(source.id)}>Lisää lähdeväite käsin</button>
    </Section>
    <Section title="Menetelmät, rajaukset ja lähdekohdat">
      {claims.length ? <dl className="fact-list">{claims.map(claim => <div key={claim.id}>
        <dt>{claim.statement.slice(0, 60) || claim.id}</dt>
        <dd>Menetelmä/konteksti: {claim.methodContext.trim() || 'Ei kirjattu.'} Lähdekohta: {claim.locator.trim() || 'Ei kirjattu.'} Rajaus: {claim.limitations.trim() || 'Ei kirjattu.'}</dd>
      </div>)}</dl> : <p className="subtle">Ei vielä väitteitä, joista menetelmä, rajaus tai lähdekohta voitaisiin näyttää.</p>}
    </Section>
    <Section title="Omat sovellukset" note="Oma sovellus on erillinen epistemic-tila. Se ei synny bibliografisesta tuonnista.">
      {adaptations.length || adaptedConstructs.length ? <>
        <div className="record-list">{adaptedConstructs.map(item => <button type="button" key={item.id} onClick={() => onOpen(item.id)}>Käsite · {item.label}</button>)}</div>
        <div className="record-list">{adaptations.map(link => <button type="button" key={link.id} onClick={() => onEdge(link.id)}>{(link.label || '').trim() || meaningLabel[link.meaning]}</button>)}</div>
      </> : <p className="subtle">Ei kirjattuja omia sovelluksia tähän lähteeseen.</p>}
    </Section>
    {source.bibliographicImport && <Section title="Tuonnin alkuperä" note="Alkuperäinen CSL-tietue säilytetään. Liitteet ovat vain metatietoa; sisältöjä ei julkaista eikä lähetetä.">
      <dl className="fact-list">
        <div><dt>Tuotu</dt><dd>{source.bibliographicImport.importedAt}</dd></div>
        <div><dt>Lähde</dt><dd>{source.bibliographicImport.provider}</dd></div>
        <div><dt>Tunniste</dt><dd>{source.bibliographicImport.itemKey || '—'} {source.bibliographicImport.citationKey ? `(${source.bibliographicImport.citationKey})` : ''}</dd></div>
        <div><dt>Liitteet</dt><dd>{source.bibliographicImport.attachments.length ? source.bibliographicImport.attachments.map(item => `${item.title || 'liite'}${item.path ? ` · ${item.path}` : ''}`).join('; ') : 'Ei liitetietoa'}</dd></div>
      </dl>
      {source.bibliographicImport.flags.length > 0 && <ul className="flag-list">{source.bibliographicImport.flags.map(flag => <li key={flag}>{flag}</li>)}</ul>}
      <details><summary>Alkuperäinen CSL-JSON</summary><pre className="code-block">{JSON.stringify(source.bibliographicImport.original, null, 2)}</pre></details>
    </Section>}
    <Links model={model} id={source.id} onEdge={onEdge} onAddEdge={onAddEdge} />
    <Remove id={source.id} onRemove={onRemove} />
  </>;
}

function ClaimForm({ model, claimId, guard, onSave, onOpen, onRemove }: { model: Workspace; claimId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onOpen: (id: string) => void; onRemove: (id: string) => void }) {
  const claim = model.claims.find(item => item.id === claimId)!;
  const { draft, setDraft, persist } = useDraft(claim, guard, next => {
    const copy = clone(model);
    const item = copy.claims.find(record => record.id === claimId);
    if (!item) return false;
    const position = item.position;
    Object.assign(item, next, { position });
    return onSave(copy, 'Lähdeväitteen tiedot tallennettiin.');
  });
  const patch = <K extends keyof typeof claim>(key: K, value: (typeof claim)[K]) => setDraft(current => ({ ...current, [key]: value }));
  return <>
    <div className="eyebrow">LÄHDEVÄITE</div><h2>{claim.statement.slice(0, 140) || claim.id}</h2>
    <span className={`tag ${claim.epistemicStatus}`}>{epistemicLabel[claim.epistemicStatus]}</span> <span className="tag">{reviewLabel[claim.reviewState]}</span>
    <p className="subtle">{claim.provenance === 'primary-inspection' ? 'Väite on merkitty alkuperäislähteestä tarkastetuksi. Merkintä ei synny automaattisesti.' : 'Tämä on tuotu yhteenveto, ei alkuperäislähteestä tehty tarkastus.'}</p>
    <FormShell submit={persist} label="Tallenna muutokset">
      <Section title="Väite">
        <TextField label="Mitä lähteen raportoidaan osoittavan" value={draft.statement} onChange={value => patch('statement', value)} area />
      </Section>
      <Section title="Menetelmä ja konteksti" note="Kirjataan käsin. Tiedostoista ei poimita automaattisesti.">
        <TextField label="Menetelmä tai konteksti" value={draft.methodContext} onChange={value => patch('methodContext', value)} area />
      </Section>
      <Section title="Näytön paikannus">
        <TextField label="Lähdekohta" value={draft.locator} onChange={value => patch('locator', value)} />
        <TextField label="Tulkinnan perustana oleva asiakirja" value={draft.basis} onChange={value => patch('basis', value)} />
      </Section>
      <Section title="Rajaukset">
        <TextField label="Mitä tästä ei voi päätellä" value={draft.limitations} onChange={value => patch('limitations', value)} area />
      </Section>
      <Section title="Arviointi ja alkuperä" note="Julkaisun tila ja lukemistieto eivät kuulu tähän. Ne ovat lähteen bibliografisia kenttiä.">
        <SelectField label="Väitteen alkuperä" value={draft.provenance} onChange={value => patch('provenance', value as Provenance)} options={option(asList(provenance), provenanceLabel)} />
        <SelectField label="Menetelmällinen arviointi" value={draft.appraisal} onChange={value => patch('appraisal', value as Appraisal)} options={option(asList(appraisal), appraisalLabel)} />
        <SelectField label="Tiedollinen tila" value={draft.epistemicStatus} onChange={value => patch('epistemicStatus', value as EpistemicStatus)} options={epistemicOptions} />
        <SelectField label="Kirjauksen tila" value={draft.reviewState} onChange={value => patch('reviewState', value as ReviewState)} options={reviewOptions} />
      </Section>
      <Section title="Muistiinpanot">
        <TextField label="Väitteen muistiinpanot" value={draft.notes} onChange={value => patch('notes', value)} area />
      </Section>
    </FormShell>
    <p className="subtle">Lähdeviite ei ole tutkimuksellinen yhteys. Uusi yhteys kirjataan lähteeseen, käsitteeseen, kriteeriin tai propositioon.</p>
    <button type="button" onClick={() => onOpen(claim.sourceId)}>Avaa lähde {titleOf(model, claim.sourceId)}</button>
    <p className="subtle">Tunniste: {claim.id}</p>
    <button type="button" className="delete" onClick={() => onRemove(claim.id)}>Poista tämä väite</button>
  </>;
}

function ConstructForm({ model, recordId, guard, onSave, onEdge, onAddEdge, onRemove }: { model: Workspace; recordId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onEdge: (id: string) => void; onAddEdge: (id: string) => void; onRemove: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const record = model.constructs.find(item => item.id === recordId)!;
  const { draft, setDraft, persist } = useDraft(record, guard, next => {
    const copy = clone(model);
    const item = copy.constructs.find(entry => entry.id === recordId);
    if (!item) return false;
    const position = item.position;
    Object.assign(item, next, { position, label: next.label.trim() });
    return onSave(copy, 'Käsitteen tiedot tallennettiin.');
  });
  const patch = <K extends keyof typeof record>(key: K, value: (typeof record)[K]) => setDraft(current => ({ ...current, [key]: value }));
  const labelDisplay = translateResearchField(locale, 'constructs', record.id, 'label', record.label, { hashMatches });
  const definitionDisplay = translateResearchField(locale, 'constructs', record.id, 'definition', record.definition, { hashMatches });
  return <>
    <div className="eyebrow">{t('inspector.constructEyebrow')}</div><h2>{labelDisplay.text}</h2>
    <TranslationNotice notice={labelDisplay.notice} />
    <p className="subtle">{definitionDisplay.text}</p>
    <TranslationNotice notice={definitionDisplay.notice} />
    <span className={`tag ${record.epistemicStatus}`}>{L.epistemicLabel[record.epistemicStatus]}</span> <span className="tag">{L.reviewLabel[record.reviewState]}</span>
    <FormShell submit={persist} label={t('inspector.save')}>
      <TextField label={t('inspector.name')} value={draft.label} onChange={value => patch('label', value)} />
      <TextField label={t('inspector.definition')} value={draft.definition} onChange={value => patch('definition', value)} area />
      <TextField label="Määritelmän kohde" value={draft.object} onChange={value => patch('object', value)} />
      <TextField label="Yksikkö" value={draft.unit} onChange={value => patch('unit', value)} />
      <TextField label="Ala" value={draft.scope} onChange={value => patch('scope', value)} area />
      <TextField label="Kilpailevat määritelmät" value={draft.competingDefinitions} onChange={value => patch('competingDefinitions', value)} area />
      <TextField label="Valittu rajaus" value={draft.boundary} onChange={value => patch('boundary', value)} area />
      <SelectField label="Tiedollinen tila" value={draft.epistemicStatus} onChange={value => patch('epistemicStatus', value as EpistemicStatus)} options={epistemicOptions} />
      <SelectField label="Kirjauksen tila" value={draft.reviewState} onChange={value => patch('reviewState', value as ReviewState)} options={reviewOptions} />
      <TextField label="Tulkinnan perustana oleva asiakirja" value={draft.basis} onChange={value => patch('basis', value)} />
      <TextField label="Lähdekohta" value={draft.locator} onChange={value => patch('locator', value)} />
      <TextField label="Oma pohdinta tai seuraava tarkistus" value={draft.notes} onChange={value => patch('notes', value)} area />
    </FormShell>
    <Links model={model} id={record.id} onEdge={onEdge} onAddEdge={onAddEdge} />
    <Remove id={record.id} onRemove={onRemove} />
  </>;
}

function CriterionForm({ model, recordId, guard, onSave, onEdge, onAddEdge, onRemove }: { model: Workspace; recordId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onEdge: (id: string) => void; onAddEdge: (id: string) => void; onRemove: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const record = model.criteria.find(item => item.id === recordId)!;
  const { draft, setDraft, persist } = useDraft(record, guard, next => {
    const copy = clone(model);
    const item = copy.criteria.find(entry => entry.id === recordId);
    if (!item) return false;
    const position = item.position;
    Object.assign(item, next, { position, label: next.label.trim(), constructIds: next.constructIds });
    return onSave(copy, 'Kriteerin tiedot tallennettiin.');
  });
  const patch = <K extends keyof Criterion>(key: K, value: Criterion[K]) => setDraft(current => ({ ...current, [key]: value }));
  const labelDisplay = translateResearchField(locale, 'criteria', record.id, 'label', record.label, { hashMatches });
  const evidenceDisplay = translateResearchField(locale, 'criteria', record.id, 'evidenceRequirements', record.evidenceRequirements, { hashMatches });
  return <>
    <div className="eyebrow">{t('inspector.criterionEyebrow')}</div><h2>{labelDisplay.text}</h2>
    <TranslationNotice notice={labelDisplay.notice} />
    <p className="subtle">{evidenceDisplay.text}</p>
    <TranslationNotice notice={evidenceDisplay.notice} />
    <span className={`tag ${record.epistemicStatus}`}>{L.epistemicLabel[record.epistemicStatus]}</span> <span className="tag">{L.reviewLabel[record.reviewState]}</span>
    <FormShell submit={persist} label={t('inspector.save')}>
      <TextField label={t('inspector.name')} value={draft.label} onChange={value => patch('label', value)} />
      <Checks title="Käsiteviitteet" records={model.constructs.map(item => ({ id: item.id, label: titleOf(model, item.id, locale, hashMatches) }))} selected={draft.constructIds} onChange={ids => patch('constructIds', ids)} />
      <TextField label="Näyttövaatimus" value={draft.evidenceRequirements} onChange={value => patch('evidenceRequirements', value)} area />
      <TextField label="Arvioija" value={draft.assessor} onChange={value => patch('assessor', value)} />
      <TextField label="Päätössääntö" value={draft.decisionRule} onChange={value => patch('decisionRule', value)} area />
      <TextField label="Sallittu päättely" value={draft.permittedInference} onChange={value => patch('permittedInference', value)} area />
      <TextField label="Täsmennettävä validointi" value={draft.validationNeed} onChange={value => patch('validationNeed', value)} area />
      <TextField label="Arviointiyksikkö" value={draft.unit} onChange={value => patch('unit', value)} />
      <SelectField label="Tiedollinen tila" value={draft.epistemicStatus} onChange={value => patch('epistemicStatus', value as EpistemicStatus)} options={epistemicOptions} />
      <SelectField label="Kirjauksen tila" value={draft.reviewState} onChange={value => patch('reviewState', value as ReviewState)} options={reviewOptions} />
      <TextField label="Tulkinnan perustana oleva asiakirja" value={draft.basis} onChange={value => patch('basis', value)} />
      <TextField label="Lähdekohta" value={draft.locator} onChange={value => patch('locator', value)} />
      <TextField label="Oma pohdinta tai seuraava tarkistus" value={draft.notes} onChange={value => patch('notes', value)} area />
    </FormShell>
    <Links model={model} id={record.id} onEdge={onEdge} onAddEdge={onAddEdge} />
    <Remove id={record.id} onRemove={onRemove} />
  </>;
}

function PropositionForm({ model, recordId, guard, onSave, onEdge, onAddEdge, onRemove, onOpen }: { model: Workspace; recordId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onEdge: (id: string) => void; onAddEdge: (id: string) => void; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const record = model.propositions.find(item => item.id === recordId)!;
  const [statementRationale, setStatementRationale] = useState('');
  const { draft, setDraft, persist } = useDraft({ ...record, statementRationale: '' }, guard, next => {
    const copy = clone(model);
    const item = copy.propositions.find(entry => entry.id === recordId);
    if (!item) return false;
    const position = item.position;
    if (next.statement !== item.statement) {
      try {
        item.statementRevisions = appendStatementRevision(item, next.statement, next.statementRationale || statementRationale);
      } catch (error) {
        return false;
      }
    }
    Object.assign(item, next, {
      position,
      label: next.label.trim(),
      criterionIds: next.criterionIds,
      constructIds: next.constructIds,
      protocolIds: next.protocolIds,
      statementRevisions: item.statementRevisions
    });
    delete (item as { statementRationale?: string }).statementRationale;
    return onSave(copy, 'Proposition tiedot tallennettiin.');
  });
  const patch = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft(current => ({ ...current, [key]: value }));
  const claimKindOptions = (['association', 'controlled-comparison', 'paired-coverage', 'other'] as IntendedClaimKind[]).map(id => ({ id, label: claimKindLabel[id] }));
  const labelDisplay = translateResearchField(locale, 'propositions', record.id, 'label', record.label, { hashMatches });
  const statementDisplay = translateResearchField(locale, 'propositions', record.id, 'statement', record.statement, { hashMatches });
  const boundaryDisplay = translateResearchField(locale, 'propositions', record.id, 'boundary', record.boundary, { hashMatches });
  return <>
    <div className="eyebrow">{t('inspector.propositionEyebrow')}</div><h2>{labelDisplay.text}</h2>
    <TranslationNotice notice={labelDisplay.notice} />
    <p>{statementDisplay.text}</p>
    <TranslationNotice notice={statementDisplay.notice} />
    <p className="subtle">{boundaryDisplay.text}</p>
    <TranslationNotice notice={boundaryDisplay.notice} />
    <span className={`tag ${record.epistemicStatus}`}>{L.epistemicLabel[record.epistemicStatus]}</span> <span className="tag">{L.reviewLabel[record.reviewState]}</span>
    <span className="tag">{claimKindLabel[record.intendedClaimKind]}</span>
    <FormShell submit={() => {
      if (draft.statement !== record.statement && !(draft.statementRationale || statementRationale).trim()) return false;
      return persist();
    }} label={t('inspector.save')}>
      <TextField label={t('inspector.name')} value={draft.label} onChange={value => patch('label', value)} />
      <TextField label="Väite" value={draft.statement} onChange={value => patch('statement', value)} area />
      {draft.statement !== record.statement && <TextField label="Väitteen muutoksen perustelu (pakollinen)" value={draft.statementRationale || statementRationale} onChange={value => { setStatementRationale(value); patch('statementRationale', value); }} area />}
      <TextField label="Mitä tästä ei voi päätellä" value={draft.boundary} onChange={value => patch('boundary', value)} area />
      <TextField label="Yksikkö" value={draft.unit} onChange={value => patch('unit', value)} />
      <TextField label="Käsitteellinen perustelu" value={draft.conceptualRationale} onChange={value => patch('conceptualRationale', value)} area />
      <SelectField label="Ehdotettu väitelaji" value={draft.intendedClaimKind} onChange={value => patch('intendedClaimKind', value as IntendedClaimKind)} options={claimKindOptions} />
      <TextField label="Ehdotettu väite / yhteys" value={draft.intendedClaim} onChange={value => patch('intendedClaim', value)} area />
      <TextField label="Ehdotettu asetelma" value={draft.proposedDesign} onChange={value => patch('proposedDesign', value)} area />
      <TextField label="Mahdolliset vastaesimerkit" value={draft.counterexamples} onChange={value => patch('counterexamples', value)} area />
      <TextField label="Tarvittava näyttö" value={draft.evidenceNeeded} onChange={value => patch('evidenceNeeded', value)} area />
      <Checks title="Kriteeriviitteet" records={model.criteria.map(item => ({ id: item.id, label: item.label }))} selected={draft.criterionIds} onChange={ids => patch('criterionIds', ids)} />
      <Checks title="Käsiteviitteet" records={model.constructs.map(item => ({ id: item.id, label: item.label }))} selected={draft.constructIds} onChange={ids => patch('constructIds', ids)} />
      <Checks title="Protokollaviitteet" records={model.protocols.map(item => ({ id: item.id, label: item.label }))} selected={draft.protocolIds} onChange={ids => patch('protocolIds', ids)} />
      <SelectField label="Tiedollinen tila" value={draft.epistemicStatus} onChange={value => patch('epistemicStatus', value as EpistemicStatus)} options={epistemicOptions} />
      <SelectField label="Kirjauksen tila" value={draft.reviewState} onChange={value => patch('reviewState', value as ReviewState)} options={reviewOptions} />
      <TextField label="Tulkinnan perustana oleva asiakirja" value={draft.basis} onChange={value => patch('basis', value)} />
      <TextField label="Lähdekohta" value={draft.locator} onChange={value => patch('locator', value)} />
      <TextField label="Oma pohdinta tai seuraava tarkistus" value={draft.notes} onChange={value => patch('notes', value)} area />
    </FormShell>
    {!!record.statementRevisions.length && <div className="field-title">Väitteen muutosloki</div>}
    {record.statementRevisions.map((rev, index) => <p key={index} className="subtle">{rev.revisedAt}: {rev.rationale}</p>)}
    {record.protocolIds.map(id => <button key={id} type="button" onClick={() => onOpen(id)}>Avaa protokolla {id}</button>)}
    <Links model={model} id={record.id} onEdge={onEdge} onAddEdge={onAddEdge} />
    <Remove id={record.id} onRemove={onRemove} />
  </>;
}

function ProtocolForm({ model, recordId, onOpen }: { model: Workspace; recordId: string; onOpen: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const record = model.protocols.find(item => item.id === recordId);
  if (!record) return <p className="subtle">Protokollaa ei löydy.</p>;
  const labelDisplay = translateResearchField(locale, 'protocols', record.id, 'label', record.label, { hashMatches });
  const summaryDisplay = translateResearchField(locale, 'protocols', record.id, 'designSummary', record.designSummary, { hashMatches });
  return <>
    <div className="eyebrow">{t('inspector.protocolEyebrow')}</div><h2>{labelDisplay.text}</h2>
    <TranslationNotice notice={labelDisplay.notice} />
    <span className="tag hypothesis">{record.status}</span>
    <span className="tag">{claimKindLabel[record.designKind]}</span>
    <p className="subtle">{PROTOCOL_DISCLAIMER}</p>
    <p>{summaryDisplay.text}</p>
    <TranslationNotice notice={summaryDisplay.notice} />
    <p className="subtle">{t('questions.observations', { count: record.observations.length, score: String(record.compositeTrustScore) })}</p>
    <div className="field-title">Linkitetyt propositiot</div>
    {record.propositionIds.map(id => <button key={id} type="button" onClick={() => onOpen(id)}>{titleOf(model, id, locale, hashMatches)}</button>)}
    <div className="field-title">Kriteerit</div>
    <p className="subtle">{record.criterionIds.map(id => titleOf(model, id, locale, hashMatches)).join('; ') || '—'}</p>
    <div className="field-title">{t('questions.fiveDimensions')}</div>
    <ul>{record.dimensions.map(item => {
      const dimLabel = translateResearchField(locale, 'protocols', record.id, `dim.${item.id}.label`, item.label, { hashMatches });
      return <li key={item.id}>{dimLabel.text}: {item.draftWording}{dimLabel.notice ? ` (${dimLabel.notice})` : ''}</li>;
    })}</ul>
    <p className="subtle">Muokkaa ankkureita ja vie protokolla kysymysnäkymässä.</p>
  </>;
}

function CaseForm({ model, recordId, guard, onSave, paused }: { model: Workspace; recordId: string; guard: RefObject<DirtyApi | null>; onSave: Save; paused: boolean }) {
  const { locale, t, hashMatches } = useI18n();
  const record = model.cases.find(item => item.id === recordId)!;
  const saved = { propositionIds: record.propositionIds, criterionIds: record.criterionIds, decisionIds: record.decisionIds };
  const idleGuard = useRef<DirtyApi | null>(null);
  const activeGuard = paused ? idleGuard : guard;
  const { draft, setDraft, persist } = useDraft(saved, activeGuard, next => {
    const copy = clone(model);
    const item = copy.cases.find(entry => entry.id === recordId);
    if (!item) return false;
    item.propositionIds = next.propositionIds; item.criterionIds = next.criterionIds; item.decisionIds = next.decisionIds;
    return onSave(copy, 'Esimerkin viitteet tallennettiin. Esimerkki pysyy rakennettuna.');
  });
  const titleDisplay = translateResearchField(locale, 'cases', record.id, 'title', record.title, { hashMatches });
  return <>
    <div className="eyebrow">{t('inspector.caseEyebrow')}</div><h2>{titleDisplay.text}</h2>
    <TranslationNotice notice={titleDisplay.notice} />
    <span className="tag hypothesis">{t('research.constructedShort')}</span>
    <p className="subtle">Tehtävä–näyttö-muokkaus on tapausten näkymässä. Tähän kirjataan vain erilliset viitteet. Niitä ei päätelty tekstistä. Empiirinen tapaus vaatisi erillisen tietuetyypin.</p>
    {paused && <p className="subtle" role="status">Tapausnäkymän muokkaus on auki — tallentamattomat muutokset suojataan sieltä.</p>}
    <p className="subtle">analyticLabel: {record.analyticLabel}</p>
    <FormShell submit={persist} label={t('inspector.saveCaseRefs')}>
      <Checks title="Propositioviitteet" records={model.propositions.map(item => ({ id: item.id, label: titleOf(model, item.id, locale, hashMatches) }))} selected={draft.propositionIds} onChange={ids => setDraft(current => ({ ...current, propositionIds: ids }))} />
      <Checks title="Kriteeriviitteet" records={model.criteria.map(item => ({ id: item.id, label: titleOf(model, item.id, locale, hashMatches) }))} selected={draft.criterionIds} onChange={ids => setDraft(current => ({ ...current, criterionIds: ids }))} />
      <Checks title="Tutkimuspäätökset" records={model.decisions.map(item => ({ id: item.id, label: titleOf(model, item.id, locale, hashMatches) }))} selected={draft.decisionIds} onChange={ids => setDraft(current => ({ ...current, decisionIds: ids }))} />
      <p className="subtle">Tyhjä lista ei osoita, ettei yhteyttä voisi myöhemmin kirjata.</p>
    </FormShell>
  </>;
}

function DecisionForm({ model, recordId, guard, onSave, onRemove }: { model: Workspace; recordId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onRemove: (id: string) => void }) {
  const { locale, t, hashMatches } = useI18n();
  const L = labelsFor(locale);
  const record = model.decisions.find(item => item.id === recordId)!;
  const { draft, setDraft, persist } = useDraft(record, guard, next => {
    const copy = clone(model);
    const item = copy.decisions.find(entry => entry.id === recordId);
    if (!item) return false;
    Object.assign(item, next, { label: next.label.trim() });
    return onSave(copy, 'Tutkimuspäätös tallennettiin.');
  });
  const patch = <K extends keyof Decision>(key: K, value: Decision[K]) => setDraft(current => ({ ...current, [key]: value }));
  const labelDisplay = translateResearchField(locale, 'decisions', record.id, 'label', record.label, { hashMatches });
  const statementDisplay = translateResearchField(locale, 'decisions', record.id, 'statement', record.statement, { hashMatches });
  return <>
    <div className="eyebrow">{t('inspector.decisionEyebrow')}</div><h2>{labelDisplay.text}</h2>
    <TranslationNotice notice={labelDisplay.notice} />
    <p>{statementDisplay.text}</p>
    <TranslationNotice notice={statementDisplay.notice} />
    <span className={`tag ${record.epistemicStatus}`}>{L.epistemicLabel[record.epistemicStatus]}</span> <span className="tag">{L.reviewLabel[record.reviewState]}</span>
    <FormShell submit={persist} label={t('inspector.saveDecision')}>
      <TextField label={t('inspector.name')} value={draft.label} onChange={value => patch('label', value)} />
      <TextField label="Päätös" value={draft.statement} onChange={value => patch('statement', value)} area />
      <TextField label="Ala" value={draft.scope} onChange={value => patch('scope', value)} />
      <TextField label="Perustelu" value={draft.rationale} onChange={value => patch('rationale', value)} area />
      <SelectField label="Tiedollinen tila" value={draft.epistemicStatus} onChange={value => patch('epistemicStatus', value as EpistemicStatus)} options={epistemicOptions} />
      <SelectField label="Kirjauksen tila" value={draft.reviewState} onChange={value => patch('reviewState', value as ReviewState)} options={reviewOptions} />
    </FormShell>
    <button type="button" className="delete" onClick={() => onRemove(record.id)}>Poista päätös</button>
  </>;
}

function AddNode({ model, guard, onSave, onMessage, onOpen }: { model: Workspace; guard: RefObject<DirtyApi | null>; onSave: Save; onMessage: (text: string) => void; onOpen: (id: string) => void }) {
  const blank = { kind: 'construct', label: '', text: '', sourceId: '', constructId: '' };
  const created = { id: '' };
  const { draft, setDraft, persist } = useDraft(blank, guard, next => {
    if (next.kind !== 'claim' && !next.label.trim()) { onMessage('Nimi puuttuu.'); return false; }
    if (next.kind === 'claim' && !next.sourceId) { onMessage('Valitse lähde.'); return false; }
    const copy = clone(model);
    const id = newId(copy, next.kind === 'claim' ? 'claim' : next.kind);
    const reviewState = 'proposed' as const;
    if (next.kind === 'source') {
      copy.sources.push({ id, label: next.label.trim(), citation: next.label.trim(), year: '', publicationStatus: 'not-recorded', versionOf: '', doi: '', url: '', access: 'not-recorded', accessNote: '', notes: '' });
      if (next.text.trim()) copy.claims.push({ id: newId(copy, 'claim'), sourceId: id, statement: next.text, methodContext: '', locator: '', limitations: '', provenance: 'imported-summary', appraisal: 'not-appraised', basis: '', epistemicStatus: 'reported', reviewState, notes: '' });
    } else if (next.kind === 'claim') copy.claims.push({ id, sourceId: next.sourceId, statement: next.text, methodContext: '', locator: '', limitations: '', provenance: 'imported-summary', appraisal: 'not-appraised', basis: '', epistemicStatus: 'reported', reviewState, notes: '' });
    else if (next.kind === 'construct') copy.constructs.push({ id, label: next.label.trim(), definition: next.text, object: '', unit: '', scope: '', competingDefinitions: '', boundary: '', epistemicStatus: 'adaptation', reviewState, basis: '', locator: '', notes: '' });
    else if (next.kind === 'criterion') copy.criteria.push({ id, label: next.label.trim(), constructIds: next.constructId ? [next.constructId] : [], evidenceRequirements: next.text, assessor: '', decisionRule: '', permittedInference: '', validationNeed: next.constructId ? '' : 'Käsiteviite on täsmennettävä.', unit: '', epistemicStatus: 'adaptation', reviewState, basis: '', locator: '', notes: '' });
    else copy.propositions.push({
      id, label: next.label.trim(), statement: next.text, boundary: '', unit: '', criterionIds: [], constructIds: [],
      conceptualRationale: '', intendedClaimKind: 'other', intendedClaim: '', proposedDesign: '', counterexamples: '',
      evidenceNeeded: '', protocolIds: [], statementRevisions: [], epistemicStatus: 'hypothesis', reviewState, basis: '', locator: '', notes: ''
    });
    created.id = id;
    return onSave(copy, 'Kohde lisättiin.');
  });
  return <aside className="inspector" aria-label="Valitun kohteen tiedot"><h2>Lisää tutkimuskohde</h2>
    <FormShell submit={() => { const ok = persist(); if (ok && created.id) onOpen(created.id); return ok; }} label="Lisää kohde">
      <SelectField label="Kohdetyyppi" value={draft.kind} onChange={value => setDraft(current => ({ ...current, kind: value }))} options={[{ id: 'source', label: 'Lähde' }, { id: 'claim', label: 'Lähdeväite' }, { id: 'construct', label: 'Käsite' }, { id: 'criterion', label: 'Kriteeri' }, { id: 'proposition', label: 'Propositio' }]} />
      {draft.kind !== 'claim' && <TextField label="Nimi" value={draft.label} onChange={value => setDraft(current => ({ ...current, label: value }))} />}
      <TextField label={draft.kind === 'claim' ? 'Tuodun yhteenvedon teksti' : 'Sisältö tai määritelmä'} value={draft.text} onChange={value => setDraft(current => ({ ...current, text: value }))} area />
      {draft.kind === 'claim' && <SelectField label="Lähde" value={draft.sourceId} onChange={value => setDraft(current => ({ ...current, sourceId: value }))} options={[{ id: '', label: 'Valitse lähde' }, ...model.sources.map(source => ({ id: source.id, label: source.label }))]} />}
      {draft.kind === 'criterion' && <SelectField label="Käsite, johon kriteeri viittaa" value={draft.constructId} onChange={value => setDraft(current => ({ ...current, constructId: value }))} options={[{ id: '', label: 'Ei käsiteviitettä vielä' }, ...model.constructs.map(item => ({ id: item.id, label: item.label }))]} />}
      {draft.kind === 'claim' && <p className="subtle">Uusi väite on tuotu yhteenveto, ei alkuperäisvarmennus.</p>}
    </FormShell>
  </aside>;
}

function AddEdge({ model, sourceId, guard, onSave, onMessage, onEdge }: { model: Workspace; sourceId: string; guard: RefObject<DirtyApi | null>; onSave: Save; onMessage: (text: string) => void; onEdge: (id: string) => void }) {
  const blank = { target: '', meaning: '', epistemicStatus: 'adaptation', reviewState: 'proposed', rationale: '' };
  const targets = [...model.sources, ...model.constructs, ...model.criteria, ...model.propositions].filter(record => record.id !== sourceId).map(record => ({ id: record.id, label: record.label }));
  const created = { id: '' };
  const { draft, setDraft, persist } = useDraft(blank, guard, next => {
    try {
      const copy = clone(model);
      const id = newId(copy, 'edge');
      copy.relationships.push(requireConnection({ id, source: sourceId, target: next.target, meaning: next.meaning, rationale: next.rationale, epistemicStatus: next.epistemicStatus, reviewState: next.reviewState }) as Relationship);
      created.id = id;
      return onSave(copy, 'Yhteys lisättiin ehdotuksena. Merkitys on valittu erikseen, eikä nuoli tarkoita kausaliteettia.');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Yhteyttä ei lisätty.');
      return false;
    }
  });
  return <aside className="inspector" aria-label="Valitun kohteen tiedot"><h2>Uusi yhteys</h2><p>Lähtö: {titleOf(model, sourceId)}</p>
    <FormShell submit={() => { const ok = persist(); if (ok && created.id) onEdge(created.id); return ok; }} label="Lisää yhteys">
      <SelectField label="Päätepiste" value={draft.target} onChange={value => setDraft(current => ({ ...current, target: value }))} options={[{ id: '', label: 'Valitse päätepiste' }, ...targets]} />
      <SelectField label="Yhteyden merkitys" value={draft.meaning} onChange={value => setDraft(current => ({ ...current, meaning: value }))} options={[{ id: '', label: 'Valitse yhteyden merkitys' }, ...meaningOptions]} />
      <SelectField label="Tiedollinen tila" value={draft.epistemicStatus} onChange={value => setDraft(current => ({ ...current, epistemicStatus: value }))} options={epistemicOptions} />
      <SelectField label="Kirjauksen tila" value={draft.reviewState} onChange={value => setDraft(current => ({ ...current, reviewState: value }))} options={[{ id: 'proposed', label: reviewLabel.proposed }, { id: 'reviewed', label: reviewLabel.reviewed }]} />
      <TextField label="Perustelu ja soveltamisen rajaus" value={draft.rationale} onChange={value => setDraft(current => ({ ...current, rationale: value }))} area />
      <p className="subtle">Uusi yhteys pysyy ehdotuksena, kunnes merkitset sen arvioiduksi. Tyhjä merkitys ei tallennu motiivina eikä kausaalisena nuolena.</p>
    </FormShell>
  </aside>;
}
