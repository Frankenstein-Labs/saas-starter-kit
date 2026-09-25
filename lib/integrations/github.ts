import { createSign, createHmac, timingSafeEqual } from 'crypto';
import type { IntegrationClient, IntegrationTestResult } from './types';

export function generateAppJwt(appId: string, privateKey: string): string {
  const cleanPrivateKey = privateKey.replace(/\\n/g, '\n');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 10 * 60,
    iss: appId,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(cleanPrivateKey, 'base64url');

  return `${unsignedToken}.${signature}`;
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expectedSig =
    'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function getInstallationToken(
  appId: string,
  privateKey: string,
  installationId: string,
  fetchFn = fetch
): Promise<string> {
  const jwt = generateAppJwt(appId, privateKey);
  const response = await fetchFn(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SaaS-Starter-Kit-Platform',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get installation token: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export class GitHubClient implements IntegrationClient {
  readonly provider = 'GITHUB' as const;

  async testConnection(credentials: {
    token?: string;
    appId?: string;
    privateKey?: string;
    installationId?: string;
  }): Promise<IntegrationTestResult> {
    if (!credentials.token && (!credentials.appId || !credentials.privateKey)) {
      return {
        success: false,
        message: 'Missing GitHub access token or App ID and Private Key credentials.',
      };
    }

    try {
      if (credentials.token) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${credentials.token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'SaaS-Starter-Kit-Platform',
          },
        });

        if (res.ok) {
          const user = (await res.json()) as { login: string };
          return {
            success: true,
            message: `GitHub connection verified for user ${user.login}`,
            details: { login: user.login },
          };
        }
        return {
          success: false,
          message: `GitHub API returned status ${res.status}`,
        };
      }

      if (credentials.appId && credentials.privateKey) {
        const jwt = generateAppJwt(credentials.appId, credentials.privateKey);
        const res = await fetch('https://api.github.com/app', {
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'SaaS-Starter-Kit-Platform',
          },
        });

        if (res.ok) {
          const app = (await res.json()) as { name: string; slug: string };
          return {
            success: true,
            message: `GitHub App connection verified for ${app.name}`,
            details: { name: app.name, slug: app.slug },
          };
        }
        return {
          success: false,
          message: `GitHub App authentication failed with status ${res.status}`,
        };
      }

      return {
        success: false,
        message: 'Invalid GitHub credentials provided.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `GitHub connection error: ${err.message || String(err)}`,
      };
    }
  }
}
