import { useId } from 'react';
import { useI18n } from './i18n/index.ts';

export function TextField({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) {
  const id = useId();
  return <label htmlFor={id}>{label}{area
    ? <textarea id={id} value={value} onChange={event => onChange(event.target.value)} />
    : <input id={id} value={value} onChange={event => onChange(event.target.value)} />}</label>;
}

export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { id: string; label: string }[] }) {
  const id = useId();
  return <label htmlFor={id}>{label}<select id={id} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.id || 'empty'} value={option.id}>{option.label}</option>)}</select></label>;
}

export function Checks({ title, records, selected, onChange }: { title: string; records: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useI18n();
  return <fieldset className="checks"><legend>{title}</legend>{records.length ? records.map(record => <label key={record.id}><input type="checkbox" checked={selected.includes(record.id)} onChange={event => {
    const next = new Set(selected);
    if (event.target.checked) next.add(record.id); else next.delete(record.id);
    onChange(records.map(item => item.id).filter(id => next.has(id)));
  }} /> {record.label}</label>) : <p className="subtle">{t('inspector.noSelectableRecords')}</p>}</fieldset>;
}
