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
export type IntendedClaimKind = 'association' | 'controlled-comparison' | 'paired-coverage' | 'other';
export type ValidationFocus =
  | 'construct-interpretation'
  | 'finnish-wording'
  | 'annotation-consistency'
  | 'evaluator-errors'
  | 'task-applicability';

export interface StatementRevision {
  revisedAt: string;
  previousStatement: string;
  rationale: string;
}
export interface Proposition {
  id: string; label: string; statement: string; boundary: string; unit: string; criterionIds: string[];
  constructIds: string[]; conceptualRationale: string; intendedClaimKind: IntendedClaimKind; intendedClaim: string;
  proposedDesign: string; counterexamples: string; evidenceNeeded: string; protocolIds: string[];
  statementRevisions: StatementRevision[];
  epistemicStatus: EpistemicStatus; reviewState: ReviewState; basis: string; locator: string; notes: string; position?: Position;
}
export interface RubricAnchor {
  id: string; category: string; wording: string; revisionRationale: string;
}
export interface ExpertDimensionSpec {
  id: string; label: string; draftWording: string; anchors: RubricAnchor[];
  assessorInstructions: string; cannotAssessLabel: string; cannotAssessGuidance: string; provisional: true;
}
export interface SeparateAuditTask {
  id: string; kind: 'correctness' | 'successful-verification'; statement: string; note: string;
}
export interface ProtocolTargetRef {
  caseId: string; answerVariantId: string; displayConditionId: string; note: string;
}
export interface ProtocolIdentities {
  questionIds: string[]; informationNeedIds: string[]; queryVariantIds: string[]; raterIds: string[];
}
export interface ProtocolProcedure {
  blinding: string; randomisation: string; repeatedObservations: string;
  disagreementHandling: string; independenceNote: string;
}
export interface ValidationCheck {
  id: string; label: string; focus: ValidationFocus; question: string; note: string;
}
export interface AssessmentProtocol {
  id: string; kind: 'assessment-protocol'; label: string; status: 'provisional-draft';
  propositionIds: string[]; criterionIds: string[]; constructIds: string[];
  designKind: IntendedClaimKind; designSummary: string;
  dimensions: ExpertDimensionSpec[]; separateAudits: SeparateAuditTask[];
  targets: ProtocolTargetRef[]; identities: ProtocolIdentities; procedure: ProtocolProcedure;
  validationChecks: ValidationCheck[];
  observations: []; compositeTrustScore: 'not-computed';
  basis: string; notes: string;
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
  protocols: AssessmentProtocol[];
  cases: ConstructedCase[];
  decisions: Decision[];
  legacy?: { schemaVersion: 1; preservedBeforeReplacement: true; document: unknown };
}
export type RecordKind = 'source' | 'claim' | 'construct' | 'criterion' | 'proposition' | 'relationship' | 'case' | 'decision' | 'protocol';
