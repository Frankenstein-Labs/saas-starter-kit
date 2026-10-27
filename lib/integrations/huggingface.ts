import {
  BaseIntegrationProvider,
  IntegrationStatus,
  ProviderConfig,
} from './provider';
import { ApiError } from '../errors';

export interface HuggingFaceConfig {
  accessToken?: string;
}

export class HuggingFaceProvider extends BaseIntegrationProvider {
  private accessToken?: string;

  constructor(config: ProviderConfig & { hfConfig?: HuggingFaceConfig }) {
    super({ ...config, provider: 'huggingface' });
    if (config.hfConfig) {
      this.accessToken = config.hfConfig.accessToken;
    }
  }

  async getModels(): Promise<Array<{ id: string; pipeline_tag?: string }>> {
    if (!this.accessToken) {
      throw new ApiError(401, 'Hugging Face Access Token required');
    }

    const url = 'https://huggingface.co/api/models?limit=10';
    return this.transport.fetch<Array<{ id: string; pipeline_tag?: string }>>(
      url,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );
  }

  async getDatasets(): Promise<Array<{ id: string }>> {
    if (!this.accessToken) {
      throw new ApiError(401, 'Hugging Face Access Token required');
    }

    const url = 'https://huggingface.co/api/datasets?limit=10';
    return this.transport.fetch<Array<{ id: string }>>(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  async runInference(model: string, inputs: any): Promise<any> {
    if (!this.accessToken) {
      throw new ApiError(401, 'Hugging Face Access Token required');
    }

    const url = `https://api-inference.huggingface.co/models/${model}`;
    return this.transport.fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: { inputs },
    });
  }

  async getStatus(): Promise<IntegrationStatus> {
    if (!this.accessToken) {
      return IntegrationStatus.NOT_CONFIGURED;
    }

    try {
      const url = 'https://huggingface.co/api/whoami-v2';
      await this.transport.fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return IntegrationStatus.CONNECTED;
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        return IntegrationStatus.UNVERIFIED;
      }
      return IntegrationStatus.ERROR;
    }
  }

  async connect(credentials: Record<string, any>): Promise<void> {
    if (!credentials.accessToken) {
      throw new ApiError(400, 'Hugging Face accessToken is required');
    }
    this.accessToken = credentials.accessToken;
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
  }
}
