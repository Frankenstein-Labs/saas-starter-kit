import { secretVault } from '@/lib/ml/secret-vault';
import { prisma } from '@/lib/prisma';
import { IntegrationStatus } from './types';

export class GoogleColabIntegrationClient {
  async getStatus(teamId: string): Promise<IntegrationStatus> {
    const integration = await prisma.integration.findUnique({
      where: {
        teamId_provider: {
          teamId,
          provider: 'google_colab',
        },
      },
    });

    if (!integration) {
      return 'NOT_CONFIGURED';
    }

    const token = (await secretVault.get(teamId, 'google_colab_access_token')) || (await secretVault.get(teamId, 'google_colab_token'));
    if (!token) {
      return 'UNVERIFIED';
    }

    return (integration.status as IntegrationStatus) || 'UNVERIFIED';
  }

  /**
   * Generates a direct 'Open in Colab' link given a Google Drive file ID or GitHub repo/path.
   */
  generateOpenInColabUrl(params: { driveFileId?: string; githubPath?: string }): string {
    if (params.driveFileId) {
      return `https://colab.research.google.com/drive/${params.driveFileId}`;
    }
    if (params.githubPath) {
      return `https://colab.research.google.com/github/${params.githubPath}`;
    }
    throw new Error('Either driveFileId or githubPath must be provided to generate a Colab link.');
  }

  /**
   * List notebook (.ipynb) files from Google Drive API.
   */
  async listNotebooks(accessToken: string): Promise<Array<{ id: string; name: string; mimeType: string; webViewLink?: string }>> {
    const query = "mimeType='application/vnd.google.colaboratory' and trashed=false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Colab runtime control API status endpoint.
   * As server-side Colab runtime control API requires Google allowlist access,
   * runtime execution control explicitly returns UNAVAILABLE status.
   */
  getRuntimeControlStatus(): { available: false; code: 'UNAVAILABLE'; reason: string } {
    return {
      available: false,
      code: 'UNAVAILABLE',
      reason: 'Google Colab server-side runtime control API is in restricted beta and requires allowlist approval.',
    };
  }
}

export const googleColabClient = new GoogleColabIntegrationClient();
