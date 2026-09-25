import type { IntegrationProvider, IntegrationStatus } from '@prisma/client';

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface IntegrationClient {
  provider: IntegrationProvider;
  testConnection(credentials: Record<string, any>): Promise<IntegrationTestResult>;
}

export interface GitHubCredentials {
  appId?: string;
  privateKey?: string;
  token?: string;
  webhookSecret?: string;
}

export interface HuggingFaceCredentials {
  token?: string;
}

export interface GoogleCredentials {
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface IntegrationSummary {
  id?: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}
