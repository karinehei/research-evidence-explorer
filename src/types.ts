export type EpistemicStatus = 'reported' | 'adaptation' | 'hypothesis';
export type ReviewState = 'imported' | 'proposed' | 'reviewed';
export type PublicationStatus = 'not-recorded' | 'preprint' | 'published' | 'in-press' | 'manuscript' | 'not-applicable';
export type Access = 'reported-full-text' | 'reported-abstract' | 'not-recorded' | 'not-applicable';
export type Provenance = 'imported-summary' | 'primary-inspection';
export type Appraisal = 'not-appraised' | 'appraised';
export type Meaning = 'motivates' | 'operationalises' | 'complements' | 'questions' | 'proposes';
export type ResearchRole = 'not-recorded' | 'conceptual' | 'technical' | 'empirical' | 'tool-workflow';
export type Position = { x: number; y: number };

export interface AttachmentMeta {
  title: string;
  path: string;
  linkMode: string;
  contentType: string;
}

export interface BibliographicImport {
  importedAt: string;
  provider: 'zotero-csl-json';
  itemKey: string;
  citationKey: string;
  original: unknown;
  attachments: AttachmentMeta[];
  flags: string[];
}

export interface Source {
  id: string; label: string; citation: string; year: string; publicationStatus: PublicationStatus;
  versionOf: string; doi: string; url: string; access: Access; accessNote: string; notes: string;
  nextCheck?: string; researchRole?: ResearchRole; bibliographicImport?: BibliographicImport; position?: Position;
}
export interface Claim {
  id: string; sourceId: string; statement: string; methodContext: string; locator: string; limitations: string;
  provenance: Provenance; appraisal: Appraisal; basis: string; epistemicStatus: EpistemicStatus; reviewState: ReviewState;
  notes: string; position?: Position;
}
export interface Construct {
  id: string; label: string; definition: string; object: string; unit: string; scope: string; competingDefinitions: string;
  boundary: string; epistemicStatus: EpistemicStatus; reviewState: ReviewState; basis: string; locator: string; notes: string;
  position?: Position;
}
export interface Criterion {
  id: string; label: string; constructIds: string[]; evidenceRequirements: string; assessor: string; decisionRule: string;
  permittedInference: string; validationNeed: string; unit: string; epistemicStatus: EpistemicStatus; reviewState: ReviewState;
  basis: string; locator: string; notes: string; position?: Position;
}
export interface Relationship {
  id: string; meaning: Meaning; source: string; target: string; label: string; rationale: string; locator: string;
  claimIds: string[]; sourceIds: string[]; epistemicStatus: EpistemicStatus; reviewState: ReviewState; reviewNote: string;
}
export interface Proposition {
  id: string; label: string; statement: string; boundary: string; unit: string; criterionIds: string[];
  epistemicStatus: EpistemicStatus; reviewState: ReviewState; basis: string; locator: string; notes: string; position?: Position;
}
export type FacetState = 'full' | 'partial' | 'absent' | 'conflicting' | 'unresolved';
export type UnmeasuredMarker = 'not-measured';
export type AnalyticCaseLabel = 'constructed-analytical-example';

export interface CaseTaskReference {
  statement: string;
  essentialQualifications: string;
  temporalScope: string;
  acceptableSourceVersionIds: string[];
}
export interface CaseFacet {
  id: string; label: string; essential: boolean;
  collection: FacetState; context: FacetState; answer: FacetState;
  evidenceRefs: string[]; reason: string;
}
export interface CaseSourceSnapshot {
  id: string; label: string; version: string; note: string;
}
export interface CasePassage {
  id: string; sourceSnapshotId: string; locator: string; text: string;
}
export interface CaseSavedContext {
  id: string; label: string; passageIds: string[]; note: string;
}
export interface CaseClaimAnnotation {
  id: string; label: string; statement: string; support: FacetState;
  evidenceRefs: string[]; reason: string; answerVariantIds: string[]; displayConditionIds: string[];
}
export interface CaseDisplayCondition {
  id: string; label: string; citationVisible: boolean; passageLocatorVisible: boolean; note: string;
}
export interface CaseAnswerVariant {
  id: string; label: string; text: string; displayConditionId: string; claimAnnotationIds: string[]; note: string;
}
export interface CaseUnmeasured {
  verificationSuccess: UnmeasuredMarker; verificationTime: UnmeasuredMarker; expertRatings: UnmeasuredMarker;
}
export interface ConstructedCase {
  id: string; kind: 'constructed'; analyticLabel: AnalyticCaseLabel; title: string; task: string;
  taskReference: CaseTaskReference; facets: CaseFacet[]; sourceSnapshots: CaseSourceSnapshot[];
  passages: CasePassage[]; savedContexts: CaseSavedContext[]; answerVariants: CaseAnswerVariant[];
  claimAnnotations: CaseClaimAnnotation[]; displayConditions: CaseDisplayCondition[]; unmeasured: CaseUnmeasured;
  columns: string[]; rows: string[][]; interpretation: string; boundary: string; basis: string;
  propositionIds: string[]; criterionIds: string[]; decisionIds: string[];
}
export interface Decision {
  id: string; label: string; statement: string; scope: string; rationale: string; epistemicStatus: EpistemicStatus;
  reviewState: ReviewState; recordIds: string[];
}
export interface Workspace {
  schemaVersion: 2;
  project: { name: string; description: string };
  sources: Source[];
  claims: Claim[];
  constructs: Construct[];
  criteria: Criterion[];
  relationships: Relationship[];
  propositions: Proposition[];
  cases: ConstructedCase[];
  decisions: Decision[];
  legacy?: { schemaVersion: 1; preservedBeforeReplacement: true; document: unknown };
}
export type RecordKind = 'source' | 'claim' | 'construct' | 'criterion' | 'proposition' | 'relationship' | 'case' | 'decision';
