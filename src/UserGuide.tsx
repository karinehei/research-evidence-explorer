import { Modal } from './Modal.tsx';
import { LanguageSelector, useI18n } from './i18n/index.ts';
import { guideFor, type GuideBlock } from './guide/content.ts';

function Block({ block, locale }: { block: GuideBlock; locale: 'fi' | 'en' }) {
  if (block.type === 'p') return <p>{block.text}</p>;
  if (block.type === 'ol') return <ol>{block.items.map(item => <li key={item}>{item}</li>)}</ol>;
  if (block.type === 'ul') return <ul>{block.items.map(item => <li key={item}>{item}</li>)}</ul>;
  if (block.type === 'note') return <aside className="guide-note"><strong>{locale === 'fi' ? 'Huomio' : 'Note'}</strong><p>{block.text}</p></aside>;

  const labels = locale === 'fi'
    ? { goal: 'Tavoite', action: 'Toiminta', result: 'Mitä näet' }
    : { goal: 'Goal', action: 'Action', result: 'What you should see' };
  return <article className="guide-step" aria-labelledby={`guide-step-${block.n}`}>
    <h3 id={`guide-step-${block.n}`}>{block.n}. {block.goal}</h3>
    <dl>
      <div><dt>{labels.goal}</dt><dd>{block.goal}</dd></div>
      <div><dt>{labels.action}</dt><dd>{block.action}</dd></div>
      <div><dt>{labels.result}</dt><dd>{block.result}</dd></div>
    </dl>
  </article>;
}

export function UserGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, t } = useI18n();
  const doc = guideFor(locale);

  function scrollTo(id: string) {
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <Modal
    open={open}
    onClose={onClose}
    title={t('guide.title')}
    closeLabel={t('dialog.close')}
    className="wide-modal guide-dialog"
  >
    <div className="guide-language"><LanguageSelector /></div>
    <p className="guide-open-hint">{t('guide.openHint')}</p>
    <p>{doc.intro}</p>
    <div className="guide-layout">
      <nav className="guide-toc" aria-label={t('guide.toc')}>
        <h3>{doc.tocLabel}</h3>
        {doc.sections.map(section =>
          <button type="button" key={section.id} onClick={() => scrollTo(section.id)}>{section.title}</button>
        )}
      </nav>
      <div className="guide-content">
        {doc.sections.map(section => <section className="guide-section" id={`guide-${section.id}`} key={section.id}>
          <h2>{section.title}</h2>
          {section.blocks.map((block, index) => <Block key={`${section.id}-${index}`} block={block} locale={locale} />)}
        </section>)}
      </div>
    </div>
    <div className="actions guide-close"><button type="button" className="primary" onClick={onClose}>{t('dialog.close')}</button></div>
  </Modal>;
}
