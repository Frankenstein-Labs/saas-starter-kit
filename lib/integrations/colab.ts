import type { IntegrationClient, IntegrationTestResult } from './types';

export class GoogleColabClient implements IntegrationClient {
  readonly provider = 'GOOGLE' as const;

  async testConnection(credentials: {
    token?: string;
  }): Promise<IntegrationTestResult> {
    if (!credentials.token) {
      return {
        success: false,
        message: 'Missing Google Drive / OAuth access token.',
      };
    }

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${credentials.token}`,
        },
      });

      if (res.ok) {
        const info = (await res.json()) as { email?: string; name?: string };
        return {
          success: true,
          message: `Google Drive connection verified for ${info.email || info.name || 'User'}`,
          details: { email: info.email, name: info.name },
        };
      }

      return {
        success: false,
        message: `Google API returned status ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Google connection error: ${err.message || String(err)}`,
      };
    }
  }

  generateOpenInColabUrl(repoPath: string, filePath: string, branch = 'main'): string {
    const cleanRepo = repoPath.replace(/^\//, '').replace(/\/$/, '');
    const cleanFile = filePath.replace(/^\//, '');
    return `https://colab.research.google.com/github/${cleanRepo}/blob/${branch}/${cleanFile}`;
  }

  getRuntimeControlStatus() {
    return {
      status: 'UNAVAILABLE' as const,
      reason:
        'Server-side Colab runtime control API is unavailable via public API (allowlist basis). Notebooks can be edited and executed via Open in Colab links.',
    };
  }

  async listNotebooks(token: string) {
    const query = encodeURIComponent("mimeType='application/vnd.google.colaboratory' and trashed=false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,modifiedTime)`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list Colab notebooks from Drive: status ${res.status}`);
    }

    return res.json();
  }
}
