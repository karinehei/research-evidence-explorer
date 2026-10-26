import type {
  CaseAnswerVariant, CaseClaimAnnotation, CaseDisplayCondition, CaseFacet, CasePassage,
  CaseSavedContext, CaseSourceSnapshot, CaseTaskReference, CaseUnmeasured, ConstructedCase,
  FacetState, Workspace
} from './types.ts';

export const ANALYTIC_CASE_LABEL = 'constructed-analytical-example' as const;
export const CONSTRUCTED_CASE_TAG = 'Rakennettu analyyttinen esimerkki · Ei tutkimustulos';
export const CASE_VIEW_DISCLAIMER =
  'Näkymä järjestää näytön tarkastelua rakennetussa esimerkissä. Se ei ole validoitu kausaalimalli, kliinisen turvallisuuden mittari eikä empiirinen havainto.';

export const facetStateLabel: Record<FacetState, string> = {
  full: 'Täysi',
  partial: 'Osittainen',
  absent: 'Puuttuu',
  conflicting: 'Ristiriitainen',
  unresolved: 'Ratkaiseaton'
};

export const coverageLayerLabel = {
  collection: 'Kokoelman kattavuus',
  context: 'Annetun kontekstin riittävyys',
  answer: 'Vastauksen kattavuus'
} as const;

export type CoverageLayer = keyof typeof coverageLayerLabel;

const facetStates: FacetState[] = ['full', 'partial', 'absent', 'conflicting', 'unresolved'];

export function emptyUnmeasured(): CaseUnmeasured {
  return { verificationSuccess: 'not-measured', verificationTime: 'not-measured', expertRatings: 'not-measured' };
}

/** Persist a case editor draft without turning a constructed example into an empirical record. */
export function applyConstructedCaseDraft(model: Workspace, draft: ConstructedCase): Workspace {
  const copy = JSON.parse(JSON.stringify(model)) as Workspace;
  const index = copy.cases.findIndex(item => item.id === draft.id);
  if (index < 0) throw new Error('Tapausta ei löydy.');
  const next = JSON.parse(JSON.stringify(draft)) as ConstructedCase;
  copy.cases[index] = {
    ...next,
    kind: 'constructed',
    analyticLabel: ANALYTIC_CASE_LABEL,
    task: next.taskReference.statement || next.task,
    unmeasured: emptyUnmeasured()
  };
  return copy;
}

export function emptyTaskReference(statement = ''): CaseTaskReference {
  return { statement, essentialQualifications: '', temporalScope: '', acceptableSourceVersionIds: [] };
}

/** Ratio numerator counts only full; partial and conflicting stay visible as separate counts and never mask an essential absence. */
export function layerCoverage(facets: CaseFacet[], layer: CoverageLayer) {
  const denominator = facets.length;
  const counts = {
    full: facets.filter(item => item[layer] === 'full').length,
    partial: facets.filter(item => item[layer] === 'partial').length,
    absent: facets.filter(item => item[layer] === 'absent').length,
    conflicting: facets.filter(item => item[layer] === 'conflicting').length,
    unresolved: facets.filter(item => item[layer] === 'unresolved').length
  };
  const missingEssential = facets.filter(item => item.essential && item[layer] !== 'full');
  return {
    layer,
    denominator,
    counts,
    fullRatioLabel: denominator ? `${counts.full}/${denominator}` : '0/0',
    missingEssential,
    policy:
      'Nimittäjä = tietoasioiden määrä tällä rivillä. Osoittajaan lasketaan vain tila “täysi”. Osittainen ja ristiriitainen näkyvät erikseen. Keskiarvo ei peitä olennaista puutetta.'
  };
}

export function missingEssentialFacets(facets: CaseFacet[]) {
  return facets.filter(item => item.essential && (item.collection !== 'full' || item.context !== 'full' || item.answer !== 'full'));
}

export function hydrateConstructedCase(raw: Record<string, unknown>): ConstructedCase {
  const task = typeof raw.task === 'string' ? raw.task : '';
  const unmeasured = isObj(raw.unmeasured)
    ? {
        verificationSuccess: 'not-measured' as const,
        verificationTime: 'not-measured' as const,
        expertRatings: 'not-measured' as const
      }
    : emptyUnmeasured();
  const taskReference = isObj(raw.taskReference)
    ? {
        statement: str(raw.taskReference.statement, task),
        essentialQualifications: str(raw.taskReference.essentialQualifications),
        temporalScope: str(raw.taskReference.temporalScope),
        acceptableSourceVersionIds: stringList(raw.taskReference.acceptableSourceVersionIds)
      }
    : emptyTaskReference(task);
  return {
    id: str(raw.id),
    kind: 'constructed',
    analyticLabel: ANALYTIC_CASE_LABEL,
    title: str(raw.title),
    task,
    taskReference,
    facets: Array.isArray(raw.facets) ? raw.facets.map(hydrateFacet) : [],
    sourceSnapshots: Array.isArray(raw.sourceSnapshots) ? raw.sourceSnapshots.map(hydrateSnapshot) : [],
    passages: Array.isArray(raw.passages) ? raw.passages.map(hydratePassage) : [],
    savedContexts: Array.isArray(raw.savedContexts) ? raw.savedContexts.map(hydrateContext) : [],
    answerVariants: Array.isArray(raw.answerVariants) ? raw.answerVariants.map(hydrateAnswer) : [],
    claimAnnotations: Array.isArray(raw.claimAnnotations) ? raw.claimAnnotations.map(hydrateClaim) : [],
    displayConditions: Array.isArray(raw.displayConditions) ? raw.displayConditions.map(hydrateDisplay) : [],
    unmeasured,
    columns: Array.isArray(raw.columns) ? raw.columns.map(item => String(item)) : [],
    rows: Array.isArray(raw.rows) ? raw.rows.map(row => Array.isArray(row) ? row.map(cell => String(cell)) : []) : [],
    interpretation: str(raw.interpretation),
    boundary: str(raw.boundary),
    basis: str(raw.basis),
    propositionIds: stringList(raw.propositionIds),
    criterionIds: stringList(raw.criterionIds),
    decisionIds: stringList(raw.decisionIds)
  };
}

export function exportConstructedCase(model: Workspace, caseId: string) {
  const record = model.cases.find(item => item.id === caseId);
  if (!record) return null;
  const layers = (['collection', 'context', 'answer'] as CoverageLayer[]).map(layer => layerCoverage(record.facets, layer));
  return {
    exportType: 'constructed-analytical-case',
    analyticLabel: ANALYTIC_CASE_LABEL,
    constructedAnalyticalExample: true,
    disclaimer: CASE_VIEW_DISCLAIMER,
    caseId: record.id,
    coverage: layers,
    missingEssentialFacetIds: missingEssentialFacets(record.facets).map(item => item.id),
    unmeasured: record.unmeasured,
    case: record
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
function asFacetState(value: unknown): FacetState {
  return facetStates.includes(value as FacetState) ? value as FacetState : 'unresolved';
}
function hydrateFacet(value: unknown): CaseFacet {
  const item = isObj(value) ? value : {};
  return {
    id: str(item.id),
    label: str(item.label),
    essential: item.essential === true,
    collection: asFacetState(item.collection),
    context: asFacetState(item.context),
    answer: asFacetState(item.answer),
    evidenceRefs: stringList(item.evidenceRefs),
    reason: str(item.reason)
  };
}
function hydrateSnapshot(value: unknown): CaseSourceSnapshot {
  const item = isObj(value) ? value : {};
  return { id: str(item.id), label: str(item.label), version: str(item.version), note: str(item.note) };
}
function hydratePassage(value: unknown): CasePassage {
  const item = isObj(value) ? value : {};
  return { id: str(item.id), sourceSnapshotId: str(item.sourceSnapshotId), locator: str(item.locator), text: str(item.text) };
}
function hydrateContext(value: unknown): CaseSavedContext {
  const item = isObj(value) ? value : {};
  return { id: str(item.id), label: str(item.label), passageIds: stringList(item.passageIds), note: str(item.note) };
}
function hydrateClaim(value: unknown): CaseClaimAnnotation {
  const item = isObj(value) ? value : {};
  return {
    id: str(item.id),
    label: str(item.label),
    statement: str(item.statement),
    support: asFacetState(item.support),
    evidenceRefs: stringList(item.evidenceRefs),
    reason: str(item.reason),
    answerVariantIds: stringList(item.answerVariantIds),
    displayConditionIds: stringList(item.displayConditionIds)
  };
}
function hydrateDisplay(value: unknown): CaseDisplayCondition {
  const item = isObj(value) ? value : {};
  return {
    id: str(item.id),
    label: str(item.label),
    citationVisible: item.citationVisible === true,
    passageLocatorVisible: item.passageLocatorVisible === true,
    note: str(item.note)
  };
}
function hydrateAnswer(value: unknown): CaseAnswerVariant {
  const item = isObj(value) ? value : {};
  return {
    id: str(item.id),
    label: str(item.label),
    text: str(item.text),
    displayConditionId: str(item.displayConditionId),
    claimAnnotationIds: stringList(item.claimAnnotationIds),
    note: str(item.note)
  };
}
