import type { Workspace } from './types.ts';

/**
 * Explicit publication projection from the complete working dataset.
 * Preserves curated research records (including the decision record and nested legacy import).
 * Clears browser-local history fields that must never ship as an automatic dump of private edits.
 */
export interface PublishedSeedProjection {
  workspace: Workspace;
  clearedFields: Array<'editLog' | 'recordRevisions'>;
  retainedForReview: string[];
  excludedAutomatically: string[];
}

export const PUBLISHED_SEED_REVIEW = [
  'All curated sources, claims, constructs, criteria, relationships, propositions, protocols and constructed cases',
  'The single decision record (currently decision_schema1_import) and its rationale',
  'Nested legacy.document when present (schema 1 import preserved for provenance)',
  'basis and locator strings that may name source DOCX files without embedding their bytes',
  'Empty or researcher-authored notes fields on curated records'
] as const;

export const PUBLISHED_SEED_EXCLUDED = [
  'browser localStorage workspace (research-evidence-explorer-v1)',
  'actor labels entered only in the browser',
  'pre-import backups (research-evidence-explorer-pre-import-v1)',
  'non-empty editLog / recordRevisions from a researcher session',
  'DOCX or other attachment bytes'
] as const;

export function projectPublishedSeed(model: Workspace): PublishedSeedProjection {
  const workspace = structuredClone(model);
  workspace.editLog = [];
  workspace.recordRevisions = [];
  return {
    workspace,
    clearedFields: ['editLog', 'recordRevisions'],
    retainedForReview: [...PUBLISHED_SEED_REVIEW],
    excludedAutomatically: [...PUBLISHED_SEED_EXCLUDED]
  };
}
