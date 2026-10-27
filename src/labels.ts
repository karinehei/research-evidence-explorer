import { catalogFor } from './i18n/catalog.ts';
import type { Locale } from './i18n/locale.ts';
import type { Access, EpistemicStatus, Meaning, PublicationStatus, RecordKind, ResearchRole, ReviewState } from './types.ts';

/** Default Finnish labels for non-React callers; React views should use useI18n().catalog.labels. */
export const kindLabel: Record<RecordKind, string> = { ...catalogFor('fi').labels.kind };
export const epistemicLabel: Record<EpistemicStatus, string> = { ...catalogFor('fi').labels.epistemic };
export const epistemicShort: Record<EpistemicStatus, string> = { ...catalogFor('fi').labels.epistemicShort };
export const reviewLabel: Record<ReviewState, string> = { ...catalogFor('fi').labels.review };
export const meaningLabel: Record<Meaning, string> = { ...catalogFor('fi').labels.meaning };
export const accessLabel: Record<Access, string> = { ...catalogFor('fi').labels.access };
export const publicationLabel: Record<PublicationStatus, string> = { ...catalogFor('fi').labels.publication };
export const provenanceLabel = { ...catalogFor('fi').labels.provenance };
export const appraisalLabel = { ...catalogFor('fi').labels.appraisal };
export const researchRoleLabel: Record<ResearchRole, string> = { ...catalogFor('fi').labels.researchRole };
export const chainKindLabel = { ...catalogFor('fi').labels.chainKind };

export const traceLimitation = 'Näytetty ketju on topologinen polku tallennettujen yhteyksien suunnassa. Se ei ole näytöllisesti perusteltu argumentti. Tuki ei siirry automaattisesti jokaisen edeltäjän kautta, eikä polku vahvista päätepisteen pätevyyttä.';
export const traceLimitationEn = 'The shown path is a topological path along stored directed links. It is not an evidentially justified argument. Support does not transfer automatically through every predecessor, and the path does not confirm the validity of the endpoint.';

export function labelsFor(locale: Locale) {
  const labels = catalogFor(locale).labels;
  return {
    kindLabel: labels.kind as Record<RecordKind, string>,
    epistemicLabel: labels.epistemic as Record<EpistemicStatus, string>,
    epistemicShort: labels.epistemicShort as Record<EpistemicStatus, string>,
    reviewLabel: labels.review as Record<ReviewState, string>,
    meaningLabel: labels.meaning as Record<Meaning, string>,
    accessLabel: labels.access as Record<Access, string>,
    publicationLabel: labels.publication as Record<PublicationStatus, string>,
    provenanceLabel: labels.provenance,
    appraisalLabel: labels.appraisal,
    researchRoleLabel: labels.researchRole as Record<ResearchRole, string>,
    chainKindLabel: labels.chainKind,
    traceLimitation: locale === 'en' ? traceLimitationEn : traceLimitation
  };
}
