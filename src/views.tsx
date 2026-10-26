import { accessLabel, epistemicLabel } from './labels.ts';
import { locate } from './model.ts';
import type { Workspace } from './types.ts';

export function MatrixView({ model, selectedId, onSelect, onCsv }: { model: Workspace; selectedId: string; onSelect: (id: string) => void; onCsv: () => void }) {
  const rows = model.criteria.map(criterion => {
    const incoming = model.relationships.filter(link => link.target === criterion.id).map(link => locate(model, link.source)).filter(Boolean) as { kind: string; record: { id: string; label: string; access?: string } }[];
    const concepts = criterion.constructIds.map(id => model.constructs.find(item => item.id === id)).filter(Boolean);
    const seen = new Set<string>();
    const shown = [...concepts.map(item => ({ id: item!.id, label: item!.label })), ...incoming.map(item => ({ id: item.record.id, label: item.record.label }))].filter(item => seen.has(item.id) ? false : (seen.add(item.id), true));
    const sourceIds = [...new Set(incoming.flatMap(item => model.relationships.filter(link => link.target === item.record.id).map(link => link.source)))];
    const sources = sourceIds.map(id => model.sources.find(source => source.id === id)).filter(Boolean);
    return { criterion, shown, sources };
  });
  return <section>
    <div className="table-intro"><p>Jokainen rivi yhdistää kriteerin käsiteviitteeseen, lähdeketjuun ja avoimeen validointitarpeeseen. Puuttuva kirjaus ei osoita tutkimusaukkoa.</p><button type="button" onClick={onCsv}>Vie kohteet CSV</button></div>
    <div className="table-wrap"><table><thead><tr>{['Kriteeri', 'Käsiteviite', 'Lähteet perusteluketjussa', 'Ehdotettu menettely', 'Päätelmien rajaus', 'Arviointiyksikkö', 'Täsmennettävä validointi'].map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.criterion.id} className={row.criterion.id === selectedId ? 'selected' : ''}><td><button type="button" onClick={() => onSelect(row.criterion.id)}>{row.criterion.label}</button></td><td>{row.shown.map(item => item.label).join('; ') || 'Käsiteviite täsmennettävä'}</td><td>{row.sources.length ? row.sources.map(source => <div key={source!.id}><button type="button" onClick={() => onSelect(source!.id)}>{source!.label}</button><p className="subtle">{accessLabel[source!.access]}</p></div>) : 'Lähdeketjua täydennettävä'}</td><td>{row.criterion.evidenceRequirements}</td><td>{row.criterion.permittedInference}</td><td>{row.criterion.unit}</td><td>{row.criterion.validationNeed || 'Ei kirjattu'}</td></tr>)}</tbody></table></div>
  </section>;
}

export function CasesView({ model, selectedId, onSelect }: { model: Workspace; selectedId: string; onSelect: (id: string) => void }) {
  const selected = model.cases.find(item => item.id === selectedId) || model.cases[0];
  if (!selected) return <p>Ei rakennettuja tapauksia.</p>;
  return <section>
    <div className="case-tabs" aria-label="Rakennetut esimerkit">{model.cases.map(item => <button type="button" key={item.id} aria-pressed={item.id === selected.id} onClick={() => onSelect(item.id)}>{item.title}</button>)}</div>
    <span className="tag hypothesis">Rakennettu analyyttinen esimerkki · Ei tutkimustulos</span>
    <h2>{selected.title}</h2>
    <p className="case-task">{selected.task}</p>
    <div className="table-wrap"><table><thead><tr>{selected.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{selected.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
    <section className="case-section"><h3>Mitä erottelu tekee näkyväksi</h3><p>{selected.interpretation}</p></section>
    <section className="case-section"><h3>Tulkinnan rajat</h3><p>{selected.boundary}</p><p className="subtle">{selected.basis}</p></section>
    <p className="subtle">Viitteet tapaukseen kirjataan tarkastimessa. Tyhjä lista ei ole tutkimustulos.</p>
  </section>;
}

export function QuestionsView({ model, selectedId, onSelect, onTrace, onAddDecision }: { model: Workspace; selectedId: string; onSelect: (id: string) => void; onTrace: (id: string) => void; onAddDecision: () => void }) {
  return <section>
    <p className="subtle">Propositiot ovat testaamattomia oletuksia. Näkymä ei esitä niiden tueksi tuloksia.</p>
    <div className="question-list">{model.propositions.map(item => {
      const criteria = item.criterionIds.map(id => model.criteria.find(criterion => criterion.id === id)?.label).filter(Boolean).join('; ');
      return <article key={item.id} className={`question-record${item.id === selectedId ? ' selected' : ''}`}><span className={`tag ${item.epistemicStatus}`}>{epistemicLabel[item.epistemicStatus]}</span><h2>{item.label}</h2><p>{item.statement}</p><p className="subtle">{item.boundary}</p><p className="subtle">{criteria ? `Kriteeriviitteet: ${criteria}` : 'Kriteeriviitettä ei ole kirjattu.'}</p><button type="button" onClick={() => onSelect(item.id)}>Tarkastele kirjausta</button> <button type="button" onClick={() => onTrace(item.id)}>Tutki perusteluketjua</button></article>;
    })}</div>
    <h2>Tutkimuspäätökset</h2>
    {model.decisions.map(item => <article key={item.id} className={`question-record${item.id === selectedId ? ' selected' : ''}`}><span className={`tag ${item.epistemicStatus}`}>{epistemicLabel[item.epistemicStatus]}</span> <span className="tag">{item.reviewState === 'imported' ? 'Tuotu aineistosta' : item.reviewState === 'reviewed' ? 'Arvioitu' : 'Ehdotettu'}</span><h3>{item.label}</h3><p>{item.statement}</p><button type="button" onClick={() => onSelect(item.id)}>Muokkaa päätöstä</button></article>)}
    <button type="button" onClick={onAddDecision}>Lisää tutkimuspäätös</button>
  </section>;
}
