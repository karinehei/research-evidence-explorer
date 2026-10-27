/** Stable validation / removal codes for presentation-boundary localisation. */

export type ModelErrorCode =
  | 'invalidText'
  | 'invalidValue'
  | 'invalidRecord'
  | 'unknownField'
  | 'invalidPosition'
  | 'invalidRefList'
  | 'invalidReference'
  | 'invalidId'
  | 'invalidUrl'
  | 'invalidDoi'
  | 'missingReference'
  | 'schemaVersionUnsupported'
  | 'schemaVersionUnsupportedFile'
  | 'graphCountInvalid'
  | 'collectionCountInvalid'
  | 'sourceVersionMissingOrSelf'
  | 'sourceVersionCycle'
  | 'claimMissingSource'
  | 'relationshipEndpointMissing'
  | 'recordNotFound'
  | 'lastRecordCannotRemove'
  | 'pickLinkMeaning'
  | 'pickOtherEndpoint'
  | 'workspaceMissing';

export type RemovalEffectCode =
  | 'removal.deleteEvidence'
  | 'removal.endsRelationship'
  | 'removal.detachReference'
  | 'removal.detachConstructRef'
  | 'removal.detachSoleConstructRef'
  | 'removal.detachPropositionRef'
  | 'removal.detachProtocolRef'
  | 'removal.detachVersionRef'
  | 'removal.detachCaseRef'
  | 'removal.detachDecisionRef';

export class ModelError extends Error {
  readonly code: string;
  readonly params: Record<string, string | number>;

  constructor(code: string, params: Record<string, string | number>, messageFi: string) {
    super(messageFi);
    this.name = 'ModelError';
    this.code = code;
    this.params = params;
  }
}

export function isModelError(error: unknown): error is ModelError {
  return error instanceof ModelError
    || (Boolean(error)
      && typeof error === 'object'
      && (error as ModelError).name === 'ModelError'
      && typeof (error as ModelError).code === 'string'
      && typeof (error as ModelError).message === 'string');
}

export function failCoded(code: string, params: Record<string, string | number>, messageFi: string): never {
  throw new ModelError(code, params, messageFi);
}
