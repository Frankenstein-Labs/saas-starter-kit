import crypto from 'crypto';
import { secretVault } from '@/lib/ml/secret-vault';
import { prisma } from '@/lib/prisma';
import { IntegrationStatus, RepositoryInfo } from './types';

export class GitHubIntegrationClient {
  private appId: string | undefined;
  private privateKey: string | undefined;
  private webhookSecret: string | undefined;

  constructor(opts?: { appId?: string; privateKey?: string; webhookSecret?: string }) {
    this.appId = opts?.appId || process.env.GITHUB_APP_ID;
    this.privateKey = opts?.privateKey || process.env.GITHUB_APP_PRIVATE_KEY;
    this.webhookSecret = opts?.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;
  }

  /**
   * Generates a JWT signed with RS256 using the GitHub App's private key.
   */
  generateAppJwt(): string {
    if (!this.appId || !this.privateKey) {
      throw new Error('GitHub App ID and Private Key are required to generate JWT.');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + (10 * 60), // max 10 minutes
      iss: this.appId,
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(dataToSign);
    const signature = signer.sign(this.privateKey, 'base64url');

    return `${dataToSign}.${signature}`;
  }

  /**
   * Gets an installation access token for a given installation ID.
   */
  async getInstallationAccessToken(installationId: string): Promise<string> {
    const jwt = this.generateAppJwt();
    const response = await fetch(`https://api.github.com/1.1/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SaaS-Starter-App',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to obtain GitHub installation access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.token;
  }

  /**
   * Constant-time verification of HMAC-SHA256 GitHub Webhook signatures (X-Hub-Signature-256).
   */
  verifyWebhookSignature(payload: string | Buffer, signatureHeader: string, secret?: string): boolean {
    const key = secret || this.webhookSecret;
    if (!key || !signatureHeader) return false;

    const expectedSignature = `sha256=${crypto.createHmac('sha256', key).update(payload).digest('hex')}`;
    const sigBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  /**
   * Checks the status of GitHub integration for a team.
   */
  async getStatus(teamId: string): Promise<IntegrationStatus> {
    const integration = await prisma.integration.findUnique({
      where: {
        teamId_provider: {
          teamId,
          provider: 'github',
        },
      },
    });

    if (!integration) {
      return 'NOT_CONFIGURED';
    }

    const token = (await secretVault.get(teamId, 'github_installation_token')) || (await secretVault.get(teamId, 'github_token'));
    if (!token && !integration.config) {
      return 'UNVERIFIED';
    }

    return (integration.status as IntegrationStatus) || 'UNVERIFIED';
  }

  /**
   * Lists repositories for an installation / token.
   */
  async listRepositories(token: string): Promise<RepositoryInfo[]> {
    const response = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SaaS-Starter-App',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      url: repo.html_url,
      private: repo.private,
      defaultBranch: repo.default_branch || 'main',
    }));
  }
}

export const githubClient = new GitHubIntegrationClient();
