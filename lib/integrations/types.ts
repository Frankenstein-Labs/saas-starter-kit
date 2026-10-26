export type IntegrationProviderName = 'github' | 'huggingface' | 'google_colab';

export type IntegrationStatus = 'CONFIGURED' | 'UNVERIFIED' | 'NOT_CONFIGURED' | 'ERROR';

export interface IntegrationConfig {
  provider: IntegrationProviderName;
  status: IntegrationStatus;
  details?: Record<string, any>;
}

export interface RepositoryInfo {
  name: string;
  fullName: string;
  owner: string;
  url: string;
  private: boolean;
  defaultBranch: string;
}

export interface ModelInfo {
  id: string;
  author: string;
  private: boolean;
  downloads?: number;
  likes?: number;
  pipelineTag?: string;
}

export interface IntegrationProvider {
  name: IntegrationProviderName;
  getStatus(teamId: string): Promise<IntegrationStatus>;
}
