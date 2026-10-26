import { useMemo, useState } from 'react';
import {
  appraisalLabel, chainKindLabel, epistemicLabel, meaningLabel, researchRoleLabel
} from './labels.ts';
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

  return <section className="matrix-view">
    <div className="table-intro">
      <p>Matriisi käyttää samoja kanonisia tietueita kuin graafi. Tyhjä solu tai “Ei kirjattu” tarkoittaa, ettei asiaa ole kirjattu — se ei todista, että artikkelista puuttuu piirre, eikä se osoita tutkimusaukkoa. Peittävyys- tai laatupisteitä ei lasketa.</p>
      <div className="matrix-export-actions">
        <button type="button" onClick={exportCurrent}>Vie matriisivalinta JSON</button>
        <button type="button" onClick={onCsv}>Vie kohteet CSV</button>
      </div>
    </div>

    <div className="matrix-toolbar" role="toolbar" aria-label="Matriisin suodattimet">
      <div className="case-tabs" aria-label="Matriisin suunta">
        <button type="button" aria-pressed={orientation === 'criterion'} onClick={() => setOrientation('criterion')}>Kriteerinäkymä</button>
        <button type="button" aria-pressed={orientation === 'source'} onClick={() => setOrientation('source')}>Lähdenäkymä</button>
        <button type="button" aria-pressed={orientation === 'argument'} onClick={() => setOrientation('argument')}>Perustelunäkymä</button>
      </div>
      <label>Tutkimusjuonne (käsite)
        <select value={filters.constructId} onChange={event => patchFilter('constructId', event.target.value)}>
          <option value="">Kaikki juonteet</option>
          {model.constructs.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>Tiedollinen tila
        <select value={filters.epistemic} onChange={event => patchFilter('epistemic', event.target.value)}>
          <option value="all">Kaikki</option>
          <option value="reported">{epistemicLabel.reported}</option>
          <option value="adaptation">{epistemicLabel.adaptation}</option>
          <option value="hypothesis">{epistemicLabel.hypothesis}</option>
        </select>
      </label>
      <label>Arviointitila
        <select value={filters.appraisal} onChange={event => patchFilter('appraisal', event.target.value)}>
          <option value="all">Kaikki</option>
          <option value="not-appraised">{appraisalLabel['not-appraised']}</option>
          <option value="appraised">{appraisalLabel.appraised}</option>
        </select>
      </label>
      {orientation === 'source' && <label>Lähteen rooli
        <select value={filters.researchRole} onChange={event => patchFilter('researchRole', event.target.value)}>
          <option value="all">Kaikki roolit</option>
          {(Object.keys(researchRoleLabel) as ResearchRole[]).map(role => <option key={role} value={role}>{researchRoleLabel[role]}</option>)}
        </select>
      </label>}
    </div>
    <p id="matrix-filter-status" className="sr-only" aria-live="polite" aria-atomic="true">
      {orientation === 'criterion'
        ? `Suodatus, kriteerinäkymä: ${criterionRows.length} riviä.`
        : orientation === 'source'
          ? `Suodatus, lähdenäkymä: ${sourceRows.length} riviä.`
          : 'Perustelunäkymä. Rivisuodatusta ei käytetä.'}
    </p>

    {orientation === 'criterion' && <div className="table-wrap" tabIndex={0}><table>
      <caption>Kriteeriorientoitunut matriisi — samat kanoniset tietueet kuin graafissa. Leveä taulukko vierii kehyksessään.</caption>
      <thead><tr>
        {['Kriteeri', 'Käsite ja määritelmä', 'Lähdeväitteet ja ketju', 'Oma sovellus', 'Näyttö / arvioija / yksikkö', 'Päätössääntö', 'Sallittu päättely', 'Validointitarve'].map(column => <th key={column} scope="col">{column}</th>)}
      </tr></thead>
      <tbody>{criterionRows.map(row => {
        const active = selectedId === row.criterion.id || row.claims.some(claim => claim.claimId === selectedId);
        return <tr key={row.criterion.id} className={active ? 'selected' : ''}>
          <th scope="row">
            <button type="button" onClick={() => onSelect(row.criterion.id)}>{row.criterion.label}</button>
            <p className="subtle">{epistemicLabel[row.criterion.epistemicStatus]}</p>
            <p className="subtle">id: {row.criterion.id}</p>
          </th>
          <td>
            {row.missingConstructIds.length > 0 && <p className="error-text">Puuttuva käsiteviite — tarkistettava: {row.missingConstructIds.join(', ')}</p>}
            {row.constructs.length ? row.constructs.map(item => <div key={item.id} className="matrix-block">
              <button type="button" onClick={() => onSelect(item.id)}>{item.label}</button>
              <p>{recordedState(item.definition, 'Määritelmää ei kirjattu')}</p>
              {item.competingDefinitions.trim()
                ? <p className="competing">Kilpaileva tulkinta säilytetty: {item.competingDefinitions}</p>
                : <p className="subtle">Kilpailevaa määritelmää ei kirjattu.</p>}
            </div>) : <p className="subtle">Käsiteviite täsmennettävä</p>}
          </td>
          <td>
            {row.claims.length ? row.claims.map(claim => <div key={`${claim.claimId}-${claim.relationshipId}`} className="matrix-block">
              <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement.slice(0, 110) || claim.claimId}</button>
              <p className="subtle">{claim.sourceLabel} · {appraisalLabel[claim.appraisal]}</p>
              <p className="subtle">Lähdekohta: {recordedState(claim.locator, 'Ei kirjattu')}</p>
              <p className="chain-tag">{chainKindLabel[claim.chainKind]}</p>
              <p className="subtle">{claim.pathLabels.join(' → ')}</p>
              <button type="button" className="quiet" onClick={() => onEdge(claim.relationshipId)}>Tarkastele yhteyttä ({meaningLabel[claim.meaning]})</button>
            </div>) : <p className="subtle">Lähdeväitettä ei kirjattu. Tämä ei ole tutkimusaukko.</p>}
          </td>
          <td>
            {row.adaptations.length ? row.adaptations.map(link => <div key={link.id} className="matrix-block">
              <button type="button" onClick={() => onEdge(link.id)}>{link.label || meaningLabel[link.meaning]}</button>
              <p className="subtle">{link.sourceLabel} → {link.targetLabel}</p>
              <p className="chain-tag">{chainKindLabel['adaptation-step']}</p>
            </div>) : <p className="subtle">Omia sovelluksia ei kirjattu tälle riville.</p>}
          </td>
          <td>
            <p>{recordedState(row.criterion.evidenceRequirements)}</p>
            <p className="subtle">Arvioija: {recordedState(row.criterion.assessor, 'Ei kirjattu')}</p>
            <p className="subtle">Yksikkö: {recordedState(row.criterion.unit)}</p>
          </td>
          <td>{recordedState(row.criterion.decisionRule)}</td>
          <td>{recordedState(row.criterion.permittedInference)}</td>
          <td>{recordedState(row.criterion.validationNeed, 'Ei kirjattu')}</td>
        </tr>;
      })}</tbody>
    </table></div>}

    {orientation === 'source' && <>
      <p className="subtle">Lähderoolit (käsitteellinen, tekninen, empiirinen, työkalu/työnkulku) eivät ole keskenään vaihdettavia viitekehyksiä. Kirjaamaton rooli on “Ei kirjattu”, ei arvottava sijoitus. Ketjun rooli kertoo tallennetun yhteyden luonteen.</p>
      <div className="table-wrap" tabIndex={0}><table>
        <caption>Lähdeorientoitunut matriisi — roolit eivät ole rangattuja viitekehyksiä. Leveä taulukko vierii kehyksessään.</caption>
        <thead><tr>{['Lähde', 'Kirjattu rooli', 'Väitteet', 'Esiintyminen kriteereissä', 'Kilpailevat / rajoittavat huomiot'].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{sourceRows.map(row => {
          const active = selectedId === row.source.id || row.claims.some(claim => claim.id === selectedId);
          return <tr key={row.source.id} className={active ? 'selected' : ''}>
            <th scope="row">
              <button type="button" onClick={() => onSelect(row.source.id)}>{row.source.label}</button>
              <p className="subtle">id: {row.source.id}</p>
            </th>
            <td>
              <p>{researchRoleLabel[row.researchRole]}</p>
              <p className="subtle">Roolit eivät ole rangattuja viitekehyksiä.</p>
            </td>
            <td>{row.claims.length ? row.claims.map(claim => <div key={claim.id} className="matrix-block">
              <button type="button" onClick={() => onSelect(claim.id)}>{claim.statement.slice(0, 100) || claim.id}</button>
              <p className="subtle">{appraisalLabel[claim.appraisal]} · {recordedState(claim.locator, 'Lähdekohtaa ei kirjattu')}</p>
            </div>) : <p className="subtle">Väitettä ei kirjattu.</p>}</td>
            <td>{row.appearances.length ? row.appearances.map((item, index) => <div key={`${item.relationshipId}-${index}`} className="matrix-block">
              <button type="button" onClick={() => onSelect(item.criterionId)}>{item.criterionLabel}</button>
              <p className="chain-tag">{chainKindLabel[item.chainKind]}</p>
              <button type="button" className="quiet" onClick={() => onEdge(item.relationshipId)}>Tarkastele yhteyttä ({meaningLabel[item.meaning]})</button>
            </div>) : <p className="subtle">Esiintymää kriteeriketjussa ei kirjattu.</p>}</td>
            <td>{row.competingNotes.length ? row.competingNotes.map(note => <p key={note} className="competing">{note}</p>) : <p className="subtle">Kilpailevaa tulkintaa ei kirjattu.</p>}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </>}

    {orientation === 'argument' && <div className="argument-view">
      <label>Tutkimuspäätös
        <select value={decisionId} onChange={event => { setDecisionId(event.target.value); onSelect(event.target.value); }}>
          {!model.decisions.length && <option value="">Ei päätöksiä</option>}
          {model.decisions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {!argument && <p className="subtle">Valitse päätös. Perustelunäkymä ei keksi tuloksia.</p>}
      {argument && <>
        <article className="question-record selected">
          <h2>{argument.decision.label}</h2>
          <p className="subtle">id: {argument.decision.id}</p>
          <h3>Ehdotettu valinta</h3>
          <p>{recordedState(argument.decision.statement)}</p>
          <h3>Perustelu</h3>
          <p>{recordedState(argument.decision.rationale)}</p>
          <h3>Ala</h3>
          <p>{recordedState(argument.decision.scope)}</p>
          {argument.missingRecordIds.length > 0 && <p className="error-text">Puuttuvat viitteet — tarkistettava: {argument.missingRecordIds.join(', ')}</p>}
        </article>
        <section className="case-section">
          <h3>Relevantit lähdeväitteet</h3>
          {argument.relatedClaims.length ? argument.relatedClaims.map(claim => <div key={claim.claimId} className="matrix-block">
            <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement || claim.claimId}</button>
            <p className="subtle">{claim.sourceLabel} · Lähdekohta: {recordedState(claim.locator)}</p>
          </div>) : <p className="subtle">Väiteviitteitä ei ole kirjattu päätökseen.</p>}
        </section>
        <section className="case-section">
          <h3>Vastanäyttö tai kyseenalaistus</h3>
          {argument.counterevidence.length ? argument.counterevidence.map(claim => <div key={claim.claimId} className="matrix-block">
            <button type="button" onClick={() => onSelect(claim.claimId)}>{claim.statement || claim.claimId}</button>
            <p className="chain-tag">{chainKindLabel.counterevidence}</p>
          </div>) : <p className="subtle">Vastanäyttöä ei kirjattu. Tämä ei ole todiste sen puuttumisesta kirjallisuudesta.</p>}
        </section>
        <section className="case-section">
          <h3>Rajaukset</h3>
          {argument.limitations.length ? argument.limitations.map(item => <p key={item}>{item}</p>) : <p className="subtle">Rajausta ei kirjattu.</p>}
        </section>
        <section className="case-section">
          <h3>Omat sovellukset ketjussa</h3>
          {argument.adaptations.length ? argument.adaptations.map(link => <button type="button" key={link.id} onClick={() => onEdge(link.id)}>{link.label || meaningLabel[link.meaning]} · {link.sourceLabel} → {link.targetLabel}</button>) : <p className="subtle">Sovellusta ei kirjattu.</p>}
        </section>
        <section className="case-section">
          <h3>Jäljellä oleva kysymys</h3>
          {argument.remainingQuestions.length ? argument.remainingQuestions.map(item => <div key={item.id} className="matrix-block">
            <button type="button" onClick={() => onSelect(item.id)}>{item.label}</button>
            <p>{item.statement}</p>
          </div>) : <p className="subtle">Avointa propositiota ei ole kytketty.</p>}
        </section>
      </>}
    </div>}

    {(selectedCriterion || selectedSource) && orientation !== 'argument' && <aside className="matrix-focus" aria-label="Valitun rivin tarkenne">
      <h3>Valinnan tarkenne</h3>
      {selectedCriterion && <>
        <p>Kriteeri <button type="button" onClick={() => onSelect(selectedCriterion.criterion.id)}>{selectedCriterion.criterion.label}</button> käyttää samoja tietueita kuin graafi.</p>
        {selectedCriterion.claims[0] && <p>Esimerkki ketjusta lähdeväitteeseen: <button type="button" onClick={() => onSelect(selectedCriterion.claims[0].claimId)}>{selectedCriterion.claims[0].claimId}</button> · {chainKindLabel[selectedCriterion.claims[0].chainKind]}</p>}
      </>}
      {selectedSource && <p>Lähde <button type="button" onClick={() => onSelect(selectedSource.source.id)}>{selectedSource.source.label}</button> · rooli {researchRoleLabel[selectedSource.researchRole]}.</p>}
    </aside>}
  </section>;
}
