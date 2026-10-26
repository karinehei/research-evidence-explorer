import type { Access, EpistemicStatus, Meaning, PublicationStatus, RecordKind, ReviewState } from './types.ts';

export const kindLabel: Record<RecordKind, string> = {
  source: 'Lähde', claim: 'Lähdeväite', construct: 'Käsite', criterion: 'Kriteeri', proposition: 'Propositio',
  relationship: 'Yhteys', case: 'Rakennettu tapaus', decision: 'Tutkimuspäätös'
};
export const epistemicLabel: Record<EpistemicStatus, string> = {
  reported: 'Raportoitu, ei varmennettu', adaptation: 'Oma sovellus', hypothesis: 'Testaamaton oletus'
};
export const epistemicShort: Record<EpistemicStatus, string> = { reported: 'raportoitu', adaptation: 'sovellus', hypothesis: 'ehdotus' };
export const reviewLabel: Record<ReviewState, string> = { imported: 'Tuotu aineistosta', proposed: 'Ehdotettu', reviewed: 'Arvioitu' };
export const meaningLabel: Record<Meaning, string> = {
  motivates: 'Motivoi', operationalises: 'Operationalisoi', complements: 'Täydentää', questions: 'Kyseenalaistaa', proposes: 'Ehdottaa testattavaa yhteyttä'
};
export const accessLabel: Record<Access, string> = {
  'reported-full-text': 'Asiakirjassa: käsikirjoituksen tekstiä tarkasteltu',
  'reported-abstract': 'Asiakirjassa: abstrakti',
  'not-recorded': 'Tarkastelutaso täsmennettävä',
  'not-applicable': 'Ei sovellu'
};
export const publicationLabel: Record<PublicationStatus, string> = {
  'not-recorded': 'Ei kirjattu', preprint: 'Preprint', published: 'Julkaistu', 'in-press': 'Painossa', manuscript: 'Käsikirjoitus', 'not-applicable': 'Ei sovellu'
};
export const provenanceLabel = { 'imported-summary': 'Tuotu yhteenveto', 'primary-inspection': 'Alkuperäislähteestä tarkastettu' };
export const appraisalLabel = { 'not-appraised': 'Ei arvioitu', appraised: 'Arvioitu' };

export const traceLimitation = 'Näytetty ketju on topologinen polku tallennettujen yhteyksien suunnassa. Se ei ole näytöllisesti perusteltu argumentti. Tuki ei siirry automaattisesti jokaisen edeltäjän kautta, eikä polku vahvista päätepisteen pätevyyttä.';
