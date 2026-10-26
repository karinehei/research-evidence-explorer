import { useState } from 'react';
import {
  AUDIT_DISCLAIMER, HASH_DISCLAIMER, LOCAL_SAVE_DISCLAIMER, revisionOf
} from './snapshots.ts';
import type { EditLogEntry, Workspace } from './types.ts';

const kindLabel: Record<EditLogEntry['kind'], string> = {
  create: 'Luonti',
  update: 'Päivitys',
  delete: 'Poisto',
  undo: 'Kumous',
  import: 'Tuonti',
  'csl-import': 'CSL-tuonti',
  layout: 'Asettelu',
  other: 'Muu'
};

export function HistoryView({ model, actorLabel, onActorLabel }: {
  model: Workspace;
  actorLabel: string;
  onActorLabel: (value: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(model.editLog[model.editLog.length - 1]?.id || '');
  const selected = model.editLog.find(item => item.id === selectedId) || model.editLog[model.editLog.length - 1] || null;
  const entries = [...model.editLog].reverse();

  return <section className="history-view">
    <p className="subtle">{AUDIT_DISCLAIMER}</p>
    <p className="subtle">{HASH_DISCLAIMER}</p>
    <p className="subtle">{LOCAL_SAVE_DISCLAIMER}</p>
    <p className="subtle">Bibliografiset julkaisupäivämäärät (vuosi / publicationStatus) erotetaan muokkausajankohdasta (at).</p>
    <label>Valinnainen tutkijan nimiö (ei todennettu tunnistautuminen)
      <input type="text" value={actorLabel} onChange={event => onActorLabel(event.target.value)} placeholder="Esim. omalla nimikirjaimella — tai jätä tyhjäksi" />
    </label>
    <h2>Muokkaushistoria ({model.editLog.length})</h2>
    {!entries.length && <p className="subtle">Historia on tyhjä. Tallennukset ja kumoamiset kirjataan tähän liitteeksi.</p>}
    <div className="question-list">{entries.map(entry => (
      <article key={entry.id} className={`question-record${entry.id === selected?.id ? ' selected' : ''}`}>
        <span className="tag hypothesis">{kindLabel[entry.kind]}</span>
        <span className="tag">{entry.at}</span>
        <h3>{entry.summary || entry.id}</h3>
        <p className="subtle">{entry.reason || 'Syytä ei kirjattu.'}</p>
        <p className="subtle">Nimiö: {entry.actorLabel.trim() ? entry.actorLabel : 'ei annettu (ei automaattista tunnistetta)'}</p>
        {entry.kind === 'undo' && <p className="subtle">Kumoa viittaa tapahtumaan {entry.reversesEventId || '—'}. Historiaa ei kirjoitettu uudelleen.</p>}
        <button type="button" onClick={() => setSelectedId(entry.id)}>Tarkastele tapahtumaa</button>
      </article>
    ))}</div>
    {selected && <EventDetail model={model} entry={selected} />}
  </section>;
}

function EventDetail({ model, entry }: { model: Workspace; entry: EditLogEntry }) {
  return <div className="protocol-panel">
    <h2>Tapahtuma {entry.id}</h2>
    <p className="subtle">Tyyppi: {kindLabel[entry.kind]} · Muokkausajankohta: {entry.at}</p>
    <p>{entry.summary}</p>
    <p className="subtle">Syy: {entry.reason || '—'}</p>
    <p className="subtle">Nimiö: {entry.actorLabel.trim() || '—'}</p>
    <p className="subtle">Tiedotteet: {entry.recordIds.length ? entry.recordIds.map(id => `${id} (v${revisionOf(model, id)})`).join(', ') : '—'}</p>
    {entry.reversesEventId && <p className="subtle">Kumottu tapahtuma: {entry.reversesEventId}</p>}
    <p className="subtle">{entry.note}</p>
    <h3>Ennen</h3>
    <pre className="history-pre">{formatPayload(entry.before)}</pre>
    <h3>Jälkeen / palautus</h3>
    <pre className="history-pre">{formatPayload(entry.after)}</pre>
  </div>;
}

function formatPayload(value: unknown) {
  if (value === null || value === undefined) return '—';
  try { return JSON.stringify(value, null, 2); }
  catch { return String(value); }
}
