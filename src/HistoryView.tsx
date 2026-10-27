import { useState } from 'react';
import { useI18n } from './i18n/index.ts';
import {
  AUDIT_DISCLAIMER, HASH_DISCLAIMER, LOCAL_SAVE_DISCLAIMER, revisionOf
} from './snapshots.ts';
import type { EditLogEntry, Workspace } from './types.ts';

export function HistoryView({ model, actorLabel, onActorLabel }: {
  model: Workspace;
  actorLabel: string;
  onActorLabel: (value: string) => void;
}) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(model.editLog[model.editLog.length - 1]?.id || '');
  const selected = model.editLog.find(item => item.id === selectedId) || model.editLog[model.editLog.length - 1] || null;
  const entries = [...model.editLog].reverse();
  const kindLabel: Record<EditLogEntry['kind'], string> = {
    create: t('history.kindCreate'),
    update: t('history.kindUpdate'),
    delete: t('history.kindDelete'),
    undo: t('history.kindUndo'),
    import: t('history.kindImport'),
    'csl-import': t('history.kindCsl'),
    layout: t('history.kindLayout'),
    other: t('history.kindOther')
  };

  return <section className="history-view">
    <p className="subtle">{AUDIT_DISCLAIMER}</p>
    <p className="subtle">{HASH_DISCLAIMER}</p>
    <p className="subtle">{LOCAL_SAVE_DISCLAIMER}</p>
    <p className="subtle">{t('history.pubVsEdit')}</p>
    <label>{t('history.actorLabel')}
      <input type="text" value={actorLabel} onChange={event => onActorLabel(event.target.value)} placeholder={t('history.actorPlaceholder')} />
    </label>
    <h2>{t('history.title', { count: model.editLog.length })}</h2>
    {!entries.length && <p className="subtle">{t('history.empty')}</p>}
    <div className="question-list">{entries.map(entry => (
      <article key={entry.id} className={`question-record${entry.id === selected?.id ? ' selected' : ''}`}>
        <span className="tag hypothesis">{kindLabel[entry.kind]}</span>
        <span className="tag">{entry.at}</span>
        <h3>{entry.summary || entry.id}</h3>
        <p className="subtle">{entry.reason || t('history.noReason')}</p>
        <p className="subtle">{t('history.actorLabel')}: {entry.actorLabel.trim() ? entry.actorLabel : t('history.actorNone')}</p>
        {entry.kind === 'undo' && <p className="subtle">{t('history.undoRef', { id: entry.reversesEventId || '—' })}</p>}
        <button type="button" onClick={() => setSelectedId(entry.id)}>{t('history.inspect')}</button>
      </article>
    ))}</div>
    {selected && <EventDetail model={model} entry={selected} kindLabel={kindLabel} />}
  </section>;
}

function EventDetail({ model, entry, kindLabel }: {
  model: Workspace;
  entry: EditLogEntry;
  kindLabel: Record<EditLogEntry['kind'], string>;
}) {
  const { t } = useI18n();
  return <div className="protocol-panel">
    <h2>{t('history.eventTitle', { id: entry.id })}</h2>
    <p className="subtle">{kindLabel[entry.kind]} · {entry.at}</p>
    <p>{entry.summary}</p>
    <p className="subtle">{entry.reason || '—'}</p>
    <p className="subtle">{entry.actorLabel.trim() || '—'}</p>
    <p className="subtle">{entry.recordIds.length ? entry.recordIds.map(id => `${id} (v${revisionOf(model, id)})`).join(', ') : '—'}</p>
    {entry.reversesEventId && <p className="subtle">{t('history.undoRef', { id: entry.reversesEventId })}</p>}
    <p className="subtle">{entry.note}</p>
    <h3>{t('history.before')}</h3>
    <pre className="history-pre">{formatPayload(entry.before)}</pre>
    <h3>{t('history.after')}</h3>
    <pre className="history-pre">{formatPayload(entry.after)}</pre>
  </div>;
}

function formatPayload(value: unknown) {
  if (value === null || value === undefined) return '—';
  try { return JSON.stringify(value, null, 2); }
  catch { return String(value); }
}
