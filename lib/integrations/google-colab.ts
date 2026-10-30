import {
  BaseIntegrationProvider,
  IntegrationStatus,
  ProviderConfig,
} from './provider';
import { ApiError } from '../errors';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface GoogleColabConfig {
  accessToken?: string;
}

export class GoogleColabProvider extends BaseIntegrationProvider {
  private accessToken?: string;

  constructor(config: ProviderConfig & { googleConfig?: GoogleColabConfig }) {
    super({ ...config, provider: 'google' });
    if (config.googleConfig) {
      this.accessToken = config.googleConfig.accessToken;
    }
  }

  async listNotebooks(): Promise<GoogleDriveFile[]> {
    if (!this.accessToken) {
      throw new ApiError(401, 'Google Access Token required');
    }

    const q = encodeURIComponent(
      "mimeType='application/vnd.google-colaboratory' or name ending with '.ipynb'"
    );
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}`;

    const res = await this.transport.fetch<{ files: GoogleDriveFile[] }>(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return res.files || [];
  }

  getOpenInColabUrl(fileId: string): string {
    return `https://colab.research.google.com/drive/${fileId}`;
  }

  /**
   * Server-side Colab runtime control is non-functional and returns UNAVAILABLE
   * due to Google API restrictions.
   */
  async getRuntimeStatus(): Promise<{
    status: 'UNAVAILABLE' | 'NOT_CONFIGURED';
    message: string;
  }> {
    return {
      status: 'UNAVAILABLE',
      message:
        'Server-side Colab runtime control is disabled and not available via standard API.',
    };
  }

  async getStatus(): Promise<IntegrationStatus> {
    if (!this.accessToken) {
      return IntegrationStatus.NOT_CONFIGURED;
    }

    try {
      const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
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
      throw new ApiError(400, 'Google accessToken is required');
    }
    this.accessToken = credentials.accessToken;
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
  }
}
