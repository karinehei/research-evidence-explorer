import type {
  AssessmentProtocol, ExpertDimensionSpec, IntendedClaimKind, Proposition, RubricAnchor,
  StatementRevision, ValidationFocus, Workspace
} from './types.ts';

export const PROTOCOL_STATUS = 'provisional-draft' as const;
export const PROTOCOL_DISCLAIMER =
  'Arviointiprotokolla on alustava suunnitelma. Se ei sisällä kerättyjä havaintoja, yhdistelmäluottamuspistettä eikä validoituja kausaalisia tuloksia.';

export const claimKindLabel: Record<IntendedClaimKind, string> = {
  association: 'Tuleva yhteys / assosiaatio — ei osoitettu vaikutus',
  'controlled-comparison': 'Kontrolloitu esitystapavertailu — ei automaattinen kausaalitulos',
  'paired-coverage': 'Parittainen kattavuuden muutos — ei vakiintunut vaikutus',
  other: 'Muu suunniteltu tarkastelu'
};

export const validationFocusLabel: Record<ValidationFocus, string> = {
  'construct-interpretation': 'Käsitteen tulkinta',
  'finnish-wording': 'Suomenkielinen sanamuoto',
  'annotation-consistency': 'Annotoinnin johdonmukaisuus',
  'evaluator-errors': 'Arvioijan virheet',
  'task-applicability': 'Tehtävän soveltuvuus'
};

const claimKinds: IntendedClaimKind[] = ['association', 'controlled-comparison', 'paired-coverage', 'other'];
const validationFoci: ValidationFocus[] = [
  'construct-interpretation', 'finnish-wording', 'annotation-consistency', 'evaluator-errors', 'task-applicability'
];

export function defaultOrdinalAnchors(prefix: string): RubricAnchor[] {
  return [
    { id: `${prefix}_a1`, category: '1', wording: 'Erittäin heikko (luonnosankkuri)', revisionRationale: '' },
    { id: `${prefix}_a2`, category: '2', wording: 'Heikko (luonnosankkuri)', revisionRationale: '' },
    { id: `${prefix}_a3`, category: '3', wording: 'Keskitaso (luonnosankkuri)', revisionRationale: '' },
    { id: `${prefix}_a4`, category: '4', wording: 'Vahva (luonnosankkuri)', revisionRationale: '' },
    { id: `${prefix}_a5`, category: '5', wording: 'Erittäin vahva (luonnosankkuri)', revisionRationale: '' }
  ];
}

export function defaultExpertDimensions(): ExpertDimensionSpec[] {
  const specs: { id: string; label: string; draft: string }[] = [
    { id: 'perceived_trustworthiness', label: 'Koettu luotettavuus', draft: 'Arvioijan käsitys vastauksen uskottavuudesta määritellyssä tehtävässä.' },
    { id: 'usefulness', label: 'Hyödyllisyys', draft: 'Arvioijan käsitys vastauksen hyödyllisyydestä tehtävän kannalta.' },
    { id: 'source_transparency', label: 'Lähteiden läpinäkyvyys', draft: 'Arvioijan käsitys siitä, ovatko lähde, versio ja väitteen yhteys näkyvissä.' },
    { id: 'source_sufficiency', label: 'Lähteiden riittävyys', draft: 'Arvioijan käsitys siitä, riittääkö näkyvä näyttö tehtävän kannalta.' },
    { id: 'perceived_verifiability', label: 'Koettu tarkistettavuus', draft: 'Arvioijan käsitys siitä, löytyykö pääväitteille tunnistettavaa ja saavutettavaa näyttöä.' }
  ];
  return specs.map(item => ({
    id: item.id,
    label: item.label,
    draftWording: item.draft,
    anchors: defaultOrdinalAnchors(item.id),
    assessorInstructions: 'Arvioi vain tämä ulottuvuus. Älä yhdistä ulottuvuuksia yhdeksi luottamuspisteeksi. Jos arviota ei voi tehdä, valitse “ei voida arvioida” ja kirjaa syy — se ei ole asteikon arvo.',
    cannotAssessLabel: 'ei voida arvioida',
    cannotAssessGuidance: 'Syy kirjataan asteikon ulkopuolelle. Tätä ei koodata numeroksi eikä keskiarvoon.',
    provisional: true as const
  }));
}

export function hydrateProposition(raw: Record<string, unknown>): Proposition {
  const statement = str(raw.statement);
  return {
    id: str(raw.id),
    label: str(raw.label),
    statement,
    boundary: str(raw.boundary),
    unit: str(raw.unit),
    criterionIds: stringList(raw.criterionIds),
    constructIds: stringList(raw.constructIds),
    conceptualRationale: str(raw.conceptualRationale),
    intendedClaimKind: asClaimKind(raw.intendedClaimKind),
    intendedClaim: str(raw.intendedClaim),
    proposedDesign: str(raw.proposedDesign),
    counterexamples: str(raw.counterexamples),
    evidenceNeeded: str(raw.evidenceNeeded),
    protocolIds: stringList(raw.protocolIds),
    statementRevisions: Array.isArray(raw.statementRevisions)
      ? raw.statementRevisions.map(hydrateRevision).filter(item => item.rationale || item.previousStatement)
      : [],
    epistemicStatus: (raw.epistemicStatus as Proposition['epistemicStatus']) || 'hypothesis',
    reviewState: (raw.reviewState as Proposition['reviewState']) || 'imported',
    basis: str(raw.basis),
    locator: str(raw.locator),
    notes: str(raw.notes),
    position: isObj(raw.position) && Number.isFinite(raw.position.x) && Number.isFinite(raw.position.y)
      ? { x: Number(raw.position.x), y: Number(raw.position.y) }
      : undefined
  };
}

export function hydrateProtocol(raw: Record<string, unknown>): AssessmentProtocol {
  return {
    id: str(raw.id),
    kind: 'assessment-protocol',
    label: str(raw.label),
    status: 'provisional-draft',
    propositionIds: stringList(raw.propositionIds),
    criterionIds: stringList(raw.criterionIds),
    constructIds: stringList(raw.constructIds),
    designKind: asClaimKind(raw.designKind),
    designSummary: str(raw.designSummary),
    dimensions: Array.isArray(raw.dimensions) && raw.dimensions.length
      ? raw.dimensions.map(hydrateDimension)
      : defaultExpertDimensions(),
    separateAudits: Array.isArray(raw.separateAudits) ? raw.separateAudits.map(hydrateAudit) : [],
    targets: Array.isArray(raw.targets) ? raw.targets.map(hydrateTarget) : [],
    identities: isObj(raw.identities) ? {
      questionIds: stringList(raw.identities.questionIds),
      informationNeedIds: stringList(raw.identities.informationNeedIds),
      queryVariantIds: stringList(raw.identities.queryVariantIds),
      raterIds: stringList(raw.identities.raterIds)
    } : { questionIds: [], informationNeedIds: [], queryVariantIds: [], raterIds: [] },
    procedure: isObj(raw.procedure) ? {
      blinding: str(raw.procedure.blinding),
      randomisation: str(raw.procedure.randomisation),
      repeatedObservations: str(raw.procedure.repeatedObservations),
      disagreementHandling: str(raw.procedure.disagreementHandling),
      independenceNote: str(raw.procedure.independenceNote)
        || 'Jokaista tulevaa arviota ei käsitellä automaattisesti riippumattomana havaintona.'
    } : {
      blinding: '',
      randomisation: '',
      repeatedObservations: '',
      disagreementHandling: '',
      independenceNote: 'Jokaista tulevaa arviota ei käsitellä automaattisesti riippumattomana havaintona.'
    },
    validationChecks: Array.isArray(raw.validationChecks) ? raw.validationChecks.map(hydrateCheck) : [],
    observations: [],
    compositeTrustScore: 'not-computed',
    basis: str(raw.basis),
    notes: str(raw.notes)
  };
}

export function appendStatementRevision(
  previous: Proposition,
  nextStatement: string,
  rationale: string,
  revisedAt = new Date().toISOString()
): StatementRevision[] {
  if (previous.statement === nextStatement) return previous.statementRevisions.slice();
  if (!rationale.trim()) throw new Error('Proposition sanamuodon muutos vaatii kirjatun perustelun.');
  return previous.statementRevisions.concat([{
    revisedAt,
    previousStatement: previous.statement,
    rationale: rationale.trim()
  }]);
}

export function reviseAnchor(
  protocol: AssessmentProtocol,
  dimensionId: string,
  anchorId: string,
  wording: string,
  rationale: string
): AssessmentProtocol {
  if (!rationale.trim()) throw new Error('Ankkurin muutos vaatii kirjatun perustelun.');
  const copy = JSON.parse(JSON.stringify(protocol)) as AssessmentProtocol;
  const dimension = copy.dimensions.find(item => item.id === dimensionId);
  if (!dimension) throw new Error('Ulottuvuutta ei löydy.');
  const anchor = dimension.anchors.find(item => item.id === anchorId);
  if (!anchor) throw new Error('Ankkuria ei löydy.');
  anchor.wording = wording;
  anchor.revisionRationale = rationale.trim();
  dimension.provisional = true;
  copy.status = 'provisional-draft';
  copy.observations = [];
  copy.compositeTrustScore = 'not-computed';
  return copy;
}

export function exportAssessmentProtocol(model: Workspace, protocolId: string) {
  const protocol = model.protocols.find(item => item.id === protocolId);
  if (!protocol) return null;
  const propositions = model.propositions.filter(item => protocol.propositionIds.includes(item.id));
  const criteria = model.criteria.filter(item => protocol.criterionIds.includes(item.id));
  return {
    exportType: 'assessment-protocol',
    status: PROTOCOL_STATUS,
    provisionalRubric: true,
    disclaimer: PROTOCOL_DISCLAIMER,
    protocolId: protocol.id,
    designKind: protocol.designKind,
    designLabel: claimKindLabel[protocol.designKind],
    observations: [],
    compositeTrustScore: 'not-computed',
    inventedObservations: false,
    protocol,
    propositions,
    criteria,
    dimensions: protocol.dimensions.map(item => ({
      id: item.id,
      label: item.label,
      provisional: true,
      cannotAssessOutsideScale: item.cannotAssessLabel
    }))
  };
}

function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}
function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function asClaimKind(value: unknown): IntendedClaimKind {
  return claimKinds.includes(value as IntendedClaimKind) ? value as IntendedClaimKind : 'other';
}
function asFocus(value: unknown): ValidationFocus {
  return validationFoci.includes(value as ValidationFocus) ? value as ValidationFocus : 'construct-interpretation';
}
function hydrateRevision(value: unknown): StatementRevision {
  const item = isObj(value) ? value : {};
  return { revisedAt: str(item.revisedAt), previousStatement: str(item.previousStatement), rationale: str(item.rationale) };
}
function hydrateDimension(value: unknown): ExpertDimensionSpec {
  const item = isObj(value) ? value : {};
  const id = str(item.id) || 'dimension';
  return {
    id,
    label: str(item.label),
    draftWording: str(item.draftWording),
    anchors: Array.isArray(item.anchors) && item.anchors.length
      ? item.anchors.map(anchor => {
        const row = isObj(anchor) ? anchor : {};
        return {
          id: str(row.id),
          category: str(row.category),
          wording: str(row.wording),
          revisionRationale: str(row.revisionRationale)
        };
      })
      : defaultOrdinalAnchors(id),
    assessorInstructions: str(item.assessorInstructions),
    cannotAssessLabel: str(item.cannotAssessLabel, 'ei voida arvioida'),
    cannotAssessGuidance: str(item.cannotAssessGuidance),
    provisional: true
  };
}
function hydrateAudit(value: unknown) {
  const item = isObj(value) ? value : {};
  const kind = item.kind === 'successful-verification' ? 'successful-verification' as const : 'correctness' as const;
  return { id: str(item.id), kind, statement: str(item.statement), note: str(item.note) };
}
function hydrateTarget(value: unknown) {
  const item = isObj(value) ? value : {};
  return {
    caseId: str(item.caseId),
    answerVariantId: str(item.answerVariantId),
    displayConditionId: str(item.displayConditionId),
    note: str(item.note)
  };
}
function hydrateCheck(value: unknown) {
  const item = isObj(value) ? value : {};
  return {
    id: str(item.id),
    label: str(item.label),
    focus: asFocus(item.focus),
    question: str(item.question),
    note: str(item.note)
  };
}
