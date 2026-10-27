import type { ReactNode } from 'react';
import { translateResearchField, type ResearchBundle } from './research.ts';
import { useI18n } from './I18nContext.tsx';

/** Display a curated research field in the active locale; never mutates the workspace. */
export function ResearchText({
  kind, id, field, original, className, as: Tag = 'span', children
}: {
  kind: keyof ResearchBundle;
  id: string;
  field: string;
  original: string;
  className?: string;
  as?: 'span' | 'p' | 'h2' | 'h3' | 'div';
  children?: (text: string) => ReactNode;
}) {
  const { locale, hashMatches } = useI18n();
  const display = translateResearchField(locale, kind, id, field, original, { hashMatches });
  return <>
    <Tag className={className}>{children ? children(display.text) : display.text}</Tag>
    {display.notice ? <span className="subtle translation-notice" role="note">{display.notice}</span> : null}
  </>;
}

export function useResearchDisplay(
  kind: keyof ResearchBundle,
  id: string,
  field: string,
  original: string
) {
  const { locale, hashMatches } = useI18n();
  return translateResearchField(locale, kind, id, field, original, { hashMatches });
}
