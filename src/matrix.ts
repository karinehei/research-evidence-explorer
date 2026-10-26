import { locate } from './model.ts';
import type {
  Appraisal, Claim, Construct, Criterion, Decision, EpistemicStatus, Meaning, Relationship,
  ResearchRole, Source, Workspace
} from './types.ts';

export type MatrixOrientation = 'criterion' | 'source' | 'argument';
export type ChainKind = 'conceptual-ancestry' | 'recorded-link' | 'adaptation-step' | 'counterevidence' | 'missing';

export interface MatrixFilters {
  constructId: string;
  epistemic: string;
  appraisal: string;
  researchRole: string;
}

export interface MatrixClaimRef {
  claimId: string;
  statement: string;
  locator: string;
  appraisal: Appraisal;
  epistemicStatus: EpistemicStatus;
  sourceId: string;
  sourceLabel: string;
  relationshipId: string;
  meaning: Meaning;
  relationshipEpistemic: EpistemicStatus;
  chainKind: ChainKind;
  pathLabels: string[];
  missing?: boolean;
}

export interface MatrixRelationshipRef {
  id: string;
  meaning: Meaning;
  label: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  epistemicStatus: EpistemicStatus;
  rationale: string;
  claimIds: string[];
  missingEndpoint: boolean;
}

export interface CriterionMatrixRow {
  criterion: Criterion;
  constructs: Construct[];
  competingDefinitions: string[];
  claims: MatrixClaimRef[];
  adaptations: MatrixRelationshipRef[];
  relationships: MatrixRelationshipRef[];
  missingConstructIds: string[];
}

export interface SourceAppearance {
  criterionId: string;
  criterionLabel: string;
  constructId: string;
  constructLabel: string;
  chainKind: ChainKind;
  relationshipId: string;
  meaning: Meaning;
  claimIds: string[];
}

export interface SourceMatrixRow {
  source: Source;
  researchRole: ResearchRole;
  claims: Claim[];
  appearances: SourceAppearance[];
  competingNotes: string[];
}

export interface ArgumentView {
  decision: Decision;
  missingRecordIds: string[];
  relatedClaims: MatrixClaimRef[];
  counterevidence: MatrixClaimRef[];
  limitations: string[];
  remainingQuestions: { id: string; label: string; statement: string }[];
  adaptations: MatrixRelationshipRef[];
}

export const emptyFilters = (): MatrixFilters => ({ constructId: '', epistemic: 'all', appraisal: 'all', researchRole: 'all' });

function title(model: Workspace, id: string): string {
  const found = locate(model, id) as { record?: { label?: string; statement?: string; title?: string } } | null;
  return found?.record?.label || found?.record?.statement || found?.record?.title || id;
}

function relationshipRef(model: Workspace, link: Relationship): MatrixRelationshipRef {
  const sourceFound = locate(model, link.source);
  const targetFound = locate(model, link.target);
  return {
    id: link.id,
    meaning: link.meaning,
    label: link.label,
    sourceId: link.source,
    targetId: link.target,
    sourceLabel: title(model, link.source),
    targetLabel: title(model, link.target),
    epistemicStatus: link.epistemicStatus,
    rationale: link.rationale,
    claimIds: [...link.claimIds],
    missingEndpoint: !sourceFound || !targetFound
  };
}

function explicitClaims(model: Workspace, link: Relationship): { id: string; claim?: Claim }[] {
  if (link.claimIds.length) return link.claimIds.map(id => ({ id, claim: model.claims.find(claim => claim.id === id) }));
  const fromSources = link.sourceIds.flatMap(id => model.claims.filter(claim => claim.sourceId === id).map(claim => ({ id: claim.id, claim })));
  if (fromSources.length) return fromSources;
  const endpoint = model.sources.find(source => source.id === link.source);
  return endpoint ? model.claims.filter(claim => claim.sourceId === endpoint.id).map(claim => ({ id: claim.id, claim })) : [];
}

function claimRef(model: Workspace, claim: Claim | undefined, link: Relationship, chainKind: ChainKind, pathLabels: string[], missingId = ''): MatrixClaimRef {
  if (!claim) {
    return {
      claimId: missingId || 'missing',
      statement: 'Puuttuva väiteviite',
      locator: '',
      appraisal: 'not-appraised',
      epistemicStatus: 'reported',
      sourceId: '',
      sourceLabel: '',
      relationshipId: link.id,
      meaning: link.meaning,
      relationshipEpistemic: link.epistemicStatus,
      chainKind: 'missing',
      pathLabels,
      missing: true
    };
  }
  const source = model.sources.find(item => item.id === claim.sourceId);
  return {
    claimId: claim.id,
    statement: claim.statement,
    locator: claim.locator,
    appraisal: claim.appraisal,
    epistemicStatus: claim.epistemicStatus,
    sourceId: claim.sourceId,
    sourceLabel: source?.label || claim.sourceId,
    relationshipId: link.id,
    meaning: link.meaning,
    relationshipEpistemic: link.epistemicStatus,
    chainKind,
    pathLabels,
    missing: !source
  };
}

export function buildCriterionRows(model: Workspace): CriterionMatrixRow[] {
  return model.criteria.map(criterion => {
    const constructs = criterion.constructIds.map(id => model.constructs.find(item => item.id === id)).filter(Boolean) as Construct[];
    const missingConstructIds = criterion.constructIds.filter(id => !model.constructs.some(item => item.id === id));
    const competingDefinitions = constructs.map(item => item.competingDefinitions.trim()).filter(Boolean);
    const constructIdSet = new Set(criterion.constructIds);
    const relationships: MatrixRelationshipRef[] = [];
    const claims: MatrixClaimRef[] = [];
    const seenClaim = new Set<string>();

    const pushClaim = (ref: MatrixClaimRef) => {
      const key = `${ref.claimId}:${ref.relationshipId}:${ref.chainKind}`;
      if (seenClaim.has(key)) return;
      seenClaim.add(key);
      claims.push(ref);
    };

    for (const link of model.relationships.filter(item => item.target === criterion.id)) {
      relationships.push(relationshipRef(model, link));
      const path = [title(model, link.source), criterion.label];
      const kind: ChainKind = link.meaning === 'questions' ? 'counterevidence' : locate(model, link.source)?.kind === 'source' ? 'recorded-link' : 'conceptual-ancestry';
      const linked = explicitClaims(model, link);
      if (linked.length) linked.forEach(entry => pushClaim(claimRef(model, entry.claim, link, kind, path, entry.id)));
    }

    for (const constructId of constructIdSet) {
      const construct = model.constructs.find(item => item.id === constructId);
      for (const link of model.relationships.filter(item => item.target === constructId)) {
        relationships.push(relationshipRef(model, link));
        const sourceIsLiterature = locate(model, link.source)?.kind === 'source';
        const path = [title(model, link.source), construct?.label || constructId, criterion.label];
        const kind: ChainKind = link.meaning === 'questions'
          ? 'counterevidence'
          : sourceIsLiterature
            ? 'conceptual-ancestry'
            : link.epistemicStatus === 'adaptation'
              ? 'adaptation-step'
              : 'conceptual-ancestry';
        const linked = explicitClaims(model, link);
        if (linked.length) linked.forEach(entry => pushClaim(claimRef(model, entry.claim, link, kind, path, entry.id)));
      }
      for (const link of model.relationships.filter(item => item.source === constructId && item.target === criterion.id)) {
        relationships.push(relationshipRef(model, link));
      }
    }

    const uniqueRelationships = [...new Map(relationships.map(item => [item.id, item])).values()];
    const adaptations = uniqueRelationships.filter(item => item.epistemicStatus === 'adaptation' || item.meaning === 'operationalises');

    return {
      criterion,
      constructs,
      competingDefinitions,
      claims,
      adaptations,
      relationships: uniqueRelationships,
      missingConstructIds
    };
  });
}

export function buildSourceRows(model: Workspace): SourceMatrixRow[] {
  const criterionRows = buildCriterionRows(model);
  return model.sources.map(source => {
    const appearances: SourceAppearance[] = [];
    for (const row of criterionRows) {
      for (const claim of row.claims.filter(item => item.sourceId === source.id)) {
        appearances.push({
          criterionId: row.criterion.id,
          criterionLabel: row.criterion.label,
          constructId: row.constructs[0]?.id || '',
          constructLabel: row.constructs.map(item => item.label).join('; '),
          chainKind: claim.chainKind,
          relationshipId: claim.relationshipId,
          meaning: claim.meaning,
          claimIds: [claim.claimId]
        });
      }
    }
    const competingNotes = criterionRows
      .filter(row => row.claims.some(claim => claim.sourceId === source.id))
      .flatMap(row => row.competingDefinitions);
    return {
      source,
      researchRole: source.researchRole || 'not-recorded',
      claims: model.claims.filter(claim => claim.sourceId === source.id),
      appearances,
      competingNotes: [...new Set(competingNotes)]
    };
  });
}

export function buildArgumentView(model: Workspace, decisionId: string): ArgumentView | null {
  const decision = model.decisions.find(item => item.id === decisionId);
  if (!decision) return null;
  const missingRecordIds = decision.recordIds.filter(id => !locate(model, id));
  const relatedClaims: MatrixClaimRef[] = [];
  const counterevidence: MatrixClaimRef[] = [];
  const limitations: string[] = [];
  const adaptations: MatrixRelationshipRef[] = [];

  for (const id of decision.recordIds) {
    const found = locate(model, id) as { kind?: string; record?: Claim | Source | Criterion | Construct } | null;
    if (!found) continue;
    if (found.kind === 'claim') {
      const claim = found.record as Claim;
      const source = model.sources.find(item => item.id === claim.sourceId);
      const stub = {
        claimId: claim.id,
        statement: claim.statement,
        locator: claim.locator,
        appraisal: claim.appraisal,
        epistemicStatus: claim.epistemicStatus,
        sourceId: claim.sourceId,
        sourceLabel: source?.label || claim.sourceId,
        relationshipId: '',
        meaning: 'motivates' as Meaning,
        relationshipEpistemic: claim.epistemicStatus,
        chainKind: 'recorded-link' as ChainKind,
        pathLabels: [source?.label || claim.sourceId, claim.id],
        missing: !source
      };
      relatedClaims.push(stub);
      if (claim.limitations.trim()) limitations.push(claim.limitations.trim());
    }
    if (found.kind === 'source') {
      const source = found.record as Source;
      for (const claim of model.claims.filter(item => item.sourceId === source.id)) {
        relatedClaims.push({
          claimId: claim.id,
          statement: claim.statement,
          locator: claim.locator,
          appraisal: claim.appraisal,
          epistemicStatus: claim.epistemicStatus,
          sourceId: source.id,
          sourceLabel: source.label,
          relationshipId: '',
          meaning: 'motivates',
          relationshipEpistemic: claim.epistemicStatus,
          chainKind: 'recorded-link',
          pathLabels: [source.label, claim.id]
        });
        if (claim.limitations.trim()) limitations.push(claim.limitations.trim());
      }
    }
  }

  for (const link of model.relationships) {
    const touches = decision.recordIds.includes(link.source) || decision.recordIds.includes(link.target)
      || link.claimIds.some(id => decision.recordIds.includes(id))
      || link.sourceIds.some(id => decision.recordIds.includes(id));
    if (!touches) continue;
    const ref = relationshipRef(model, link);
    if (link.epistemicStatus === 'adaptation' || link.meaning === 'operationalises') adaptations.push(ref);
    if (link.meaning === 'questions') {
      for (const entry of explicitClaims(model, link)) {
        counterevidence.push(claimRef(model, entry.claim, link, 'counterevidence', [title(model, link.source), title(model, link.target)], entry.id));
      }
    }
  }

  if (decision.rationale.trim()) limitations.push(decision.rationale.trim());

  const remainingQuestions = model.propositions.filter(item =>
    item.criterionIds.some(id => decision.recordIds.includes(id))
    || decision.recordIds.includes(item.id)
    || !decision.recordIds.length
  ).map(item => ({ id: item.id, label: item.label, statement: item.statement }));

  return {
    decision,
    missingRecordIds,
    relatedClaims: [...new Map(relatedClaims.map(item => [item.claimId, item])).values()],
    counterevidence: [...new Map(counterevidence.map(item => [item.claimId, item])).values()],
    limitations: [...new Set(limitations)],
    remainingQuestions: decision.recordIds.length ? remainingQuestions.filter(item =>
      model.propositions.find(proposition => proposition.id === item.id)?.criterionIds.some(id => decision.recordIds.includes(id))
      || decision.recordIds.includes(item.id)
    ) : remainingQuestions.slice(0, 4),
    adaptations: [...new Map(adaptations.map(item => [item.id, item])).values()]
  };
}

export function filterCriterionRows(rows: CriterionMatrixRow[], filters: MatrixFilters): CriterionMatrixRow[] {
  return rows.filter(row => {
    if (filters.constructId && !row.criterion.constructIds.includes(filters.constructId)) return false;
    if (filters.epistemic !== 'all') {
      const hit = row.criterion.epistemicStatus === filters.epistemic
        || row.claims.some(claim => claim.epistemicStatus === filters.epistemic || claim.relationshipEpistemic === filters.epistemic)
        || row.relationships.some(link => link.epistemicStatus === filters.epistemic);
      if (!hit) return false;
    }
    if (filters.appraisal !== 'all') {
      const hit = row.claims.some(claim => claim.appraisal === filters.appraisal);
      if (!hit && row.claims.length === 0 && filters.appraisal === 'not-appraised') return true;
      if (!hit) return false;
    }
    return true;
  });
}

export function filterSourceRows(rows: SourceMatrixRow[], filters: MatrixFilters): SourceMatrixRow[] {
  return rows.filter(row => {
    if (filters.constructId && !row.appearances.some(item => item.constructId === filters.constructId)) return false;
    if (filters.researchRole !== 'all' && row.researchRole !== filters.researchRole) return false;
    if (filters.epistemic !== 'all') {
      const hit = row.claims.some(claim => claim.epistemicStatus === filters.epistemic)
        || row.appearances.some(item => item.chainKind === 'adaptation-step' && filters.epistemic === 'adaptation');
      if (!hit) return false;
    }
    if (filters.appraisal !== 'all') {
      const hit = row.claims.some(claim => claim.appraisal === filters.appraisal);
      if (!hit) return false;
    }
    return true;
  });
}

export function exportMatrixBundle(model: Workspace, options: {
  orientation: MatrixOrientation;
  filters: MatrixFilters;
  selectedId: string;
  decisionId?: string;
}) {
  const criterionRows = filterCriterionRows(buildCriterionRows(model), options.filters);
  const sourceRows = filterSourceRows(buildSourceRows(model), options.filters);
  const argument = options.decisionId ? buildArgumentView(model, options.decisionId) : null;
  const claimIds = new Set<string>();
  const relationshipIds = new Set<string>();
  for (const row of criterionRows) {
    row.claims.forEach(claim => claimIds.add(claim.claimId));
    row.relationships.forEach(link => relationshipIds.add(link.id));
  }
  for (const row of sourceRows) row.claims.forEach(claim => claimIds.add(claim.id));
  return {
    exportType: 'research-matrix',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    orientation: options.orientation,
    filters: options.filters,
    selectedId: options.selectedId,
    decisionId: options.decisionId || '',
    blankCellPolicy: 'Blank and “Ei kirjattu” mean not recorded. They are not proof that a paper lacks a feature or that the literature contains a research gap. No coverage or quality scores are computed.',
    criterionRows,
    sourceRows,
    argument,
    claims: model.claims.filter(claim => claimIds.has(claim.id)),
    relationships: model.relationships.filter(link => relationshipIds.has(link.id)).map(link => ({
      id: link.id,
      meaning: link.meaning,
      source: link.source,
      target: link.target,
      label: link.label,
      rationale: link.rationale,
      locator: link.locator,
      claimIds: link.claimIds,
      sourceIds: link.sourceIds,
      epistemicStatus: link.epistemicStatus,
      reviewState: link.reviewState,
      reviewNote: link.reviewNote
    }))
  };
}

export function recordedState(value: string | undefined, empty = 'Ei kirjattu'): string {
  return (value || '').trim() ? value!.trim() : empty;
}
