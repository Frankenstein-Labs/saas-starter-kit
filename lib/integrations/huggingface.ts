import { secretVault } from '@/lib/ml/secret-vault';
import { prisma } from '@/lib/prisma';
import { IntegrationStatus, ModelInfo } from './types';

export class HuggingFaceIntegrationClient {
  private clientId: string | undefined;
  private clientSecret: string | undefined;

  constructor(opts?: { clientId?: string; clientSecret?: string }) {
    this.clientId = opts?.clientId || process.env.HUGGINGFACE_CLIENT_ID;
    this.clientSecret = opts?.clientSecret || process.env.HUGGINGFACE_CLIENT_SECRET;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; idToken?: string }> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Hugging Face Client ID and Client Secret are required.');
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://huggingface.co/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to exchange Hugging Face code for token: ${errText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
    };
  }

  async getStatus(teamId: string): Promise<IntegrationStatus> {
    const integration = await prisma.integration.findUnique({
      where: {
        teamId_provider: {
          teamId,
          provider: 'huggingface',
        },
      },
    });

    if (!integration) {
      return 'NOT_CONFIGURED';
    }

    const token = (await secretVault.get(teamId, 'huggingface_access_token')) || (await secretVault.get(teamId, 'huggingface_token'));
    if (!token) {
      return 'UNVERIFIED';
    }

    return (integration.status as IntegrationStatus) || 'UNVERIFIED';
  }

  async listUserModels(accessToken: string): Promise<ModelInfo[]> {
    const response = await fetch('https://huggingface.co/api/models?limit=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((model: any) => ({
      id: model.id,
      author: model.author || model.id.split('/')[0] || '',
      private: Boolean(model.private),
      downloads: model.downloads,
      likes: model.likes,
      pipelineTag: model.pipeline_tag,
    }));
  }

  async runInference(modelId: string, accessToken: string, inputs: any): Promise<any> {
    const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: typeof inputs === 'string' ? [{ role: 'user', content: inputs }] : inputs,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Hugging Face Inference API error: ${errText}`);
    }

    return await response.json();
  }
}

export const huggingFaceClient = new HuggingFaceIntegrationClient();
