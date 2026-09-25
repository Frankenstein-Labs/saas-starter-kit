import type { IntegrationClient, IntegrationTestResult } from './types';

export class HuggingFaceClient implements IntegrationClient {
  readonly provider = 'HUGGINGFACE' as const;

  async testConnection(credentials: {
    token?: string;
  }): Promise<IntegrationTestResult> {
    if (!credentials.token) {
      return {
        success: false,
        message: 'Missing Hugging Face access token.',
      };
    }

    try {
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          'User-Agent': 'SaaS-Starter-Kit-Platform',
        },
      });

      if (res.ok) {
        const user = (await res.json()) as { name?: string; type?: string; fullname?: string };
        const name = user.name || user.fullname || 'Authenticated User';
        return {
          success: true,
          message: `Hugging Face connection verified for ${name}`,
          details: { name, type: user.type },
        };
      }

      return {
        success: false,
        message: `Hugging Face API returned status ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Hugging Face connection error: ${err.message || String(err)}`,
      };
    }
  }

  async listModels(token: string, search?: string, limit = 10) {
    const url = new URL('https://huggingface.co/api/models');
    if (search) url.searchParams.set('search', search);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'SaaS-Starter-Kit-Platform',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list models: status ${res.status}`);
    }

    return res.json();
  }

  async queryInference(token: string, model: string, payload: any) {
    const res = await fetch(`https://router.huggingface.co/v1/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Hugging Face inference error: ${res.statusText}`);
    }

    return res.json();
  }
}
