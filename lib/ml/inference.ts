import { createHash, timingSafeEqual } from 'crypto';

export type ApiKeyScope = 'project' | 'deployment' | 'inference';

export const hashApiSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const hasApiKeyScope = (scopes: string[], required: ApiKeyScope) =>
  scopes.includes(required);

export const authorizeInferenceKey = (
  key: {
    hashedKey: string;
    scopes: string[];
    projectId?: string | null;
    deploymentId?: string | null;
    expiresAt?: Date | null;
    revokedAt?: Date | null;
  },
  presented: string,
  deploymentId: string,
  projectId: string
) => {
  const actual = Buffer.from(key.hashedKey, 'hex');
  const expected = Buffer.from(hashApiSecret(presented), 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return false;
  if (key.revokedAt || (key.expiresAt && key.expiresAt <= new Date()))
    return false;
  if (!hasApiKeyScope(key.scopes, 'inference')) return false;
  if (key.deploymentId && key.deploymentId !== deploymentId) return false;
  if (key.projectId && key.projectId !== projectId) return false;
  return true;
};

export interface InferenceProvider {
  predict(input: unknown): Promise<unknown>;
}

export class DeploymentUnavailableError extends Error {
  constructor(message = 'Deployment unavailable') {
    super(message);
    this.name = 'DeploymentUnavailableError';
  }
}

export class UnavailableInferenceProvider implements InferenceProvider {
  async predict() {
    throw new DeploymentUnavailableError();
  }
}
