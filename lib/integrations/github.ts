import crypto from 'crypto';
import {
  BaseIntegrationProvider,
  IntegrationStatus,
  ProviderConfig,
} from './provider';
import { ApiError } from '../errors';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  installationId?: string;
  webhookSecret?: string;
}

export class GitHubAppProvider extends BaseIntegrationProvider {
  private appId?: string;
  private privateKey?: string;
  private installationId?: string;
  private webhookSecret?: string;

  constructor(config: ProviderConfig & { appConfig?: GitHubAppConfig }) {
    super({ ...config, provider: 'github' });
    if (config.appConfig) {
      this.appId = config.appConfig.appId;
      this.privateKey = config.appConfig.privateKey;
      this.installationId = config.appConfig.installationId;
      this.webhookSecret = config.appConfig.webhookSecret;
    }
  }

  generateAppJwt(): string {
    if (!this.appId || !this.privateKey) {
      throw new ApiError(
        400,
        'GitHub App ID and Private Key are required to generate JWT'
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 10 * 60, // 10 minutes max
      iss: this.appId,
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const base64UrlEncode = (str: string) =>
      Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${encodedHeader}.${encodedPayload}`);
    const signature = signer
      .sign(this.privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  async getInstallationAccessToken(): Promise<string> {
    if (!this.installationId) {
      throw new ApiError(400, 'GitHub App Installation ID is required');
    }

    const jwt = this.generateAppJwt();
    const url = `https://api.github.com/app/installations/${this.installationId}/access_tokens`;

    const res = await this.transport.fetch<{ token: string }>(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return res.token;
  }

  async getRepositories(): Promise<
    Array<{ id: number; name: string; full_name: string }>
  > {
    const token = await this.getInstallationAccessToken();
    const url = 'https://api.github.com/installation/repositories';

    const res = await this.transport.fetch<{
      repositories: Array<{ id: number; name: string; full_name: string }>;
    }>(url, {
      method: 'GET',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    return res.repositories || [];
  }

  verifyWebhookSignature(payload: string, signatureHeader: string): boolean {
    if (!this.webhookSecret || !signatureHeader) return false;

    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') return false;

    const signature = parts[1];
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  async getStatus(): Promise<IntegrationStatus> {
    if (!this.appId || !this.privateKey || !this.installationId) {
      return IntegrationStatus.NOT_CONFIGURED;
    }

    try {
      await this.getInstallationAccessToken();
      return IntegrationStatus.CONNECTED;
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        return IntegrationStatus.UNVERIFIED;
      }
      return IntegrationStatus.ERROR;
    }
  }

  async connect(credentials: Record<string, any>): Promise<void> {
    if (
      !credentials.appId ||
      !credentials.privateKey ||
      !credentials.installationId
    ) {
      throw new ApiError(400, 'Missing GitHub App credentials');
    }
    this.appId = credentials.appId;
    this.privateKey = credentials.privateKey;
    this.installationId = credentials.installationId;
    this.webhookSecret = credentials.webhookSecret;
  }

  async disconnect(): Promise<void> {
    this.appId = undefined;
    this.privateKey = undefined;
    this.installationId = undefined;
    this.webhookSecret = undefined;
  }
}
