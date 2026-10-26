import { epistemicLabel } from './labels.ts';
import type { Workspace } from './types.ts';

export { MatrixView } from './MatrixView.tsx';
export { CasesView } from './CasesView.tsx';

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
