import crypto from 'crypto';
import { GitHubAppProvider } from '../../../lib/integrations/github';
import {
  IntegrationStatus,
  Transport,
} from '../../../lib/integrations/provider';

describe('GitHubAppProvider', () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const mockAppConfig = {
    appId: '123456',
    privateKey,
    installationId: '789012',
    webhookSecret: 'super-secret-webhook-key',
  };

  test('returns NOT_CONFIGURED when missing credentials', async () => {
    const provider = new GitHubAppProvider({
      teamId: 'team-1',
      provider: 'github',
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.NOT_CONFIGURED);
  });

  test('generates RS256 JWT and exchanges token using mock transport', async () => {
    const mockTransport: Transport = {
      fetch: jest.fn().mockImplementation((url) => {
        if (url.includes('/access_tokens')) {
          return Promise.resolve({ token: 'ghs_mock_access_token' });
        }
        if (url.includes('/installation/repositories')) {
          return Promise.resolve({
            repositories: [
              { id: 101, name: 'repo-1', full_name: 'org/repo-1' },
              { id: 102, name: 'repo-2', full_name: 'org/repo-2' },
            ],
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }),
    };

    const provider = new GitHubAppProvider({
      teamId: 'team-1',
      provider: 'github',
      transport: mockTransport,
      appConfig: mockAppConfig,
    });

    const jwt = provider.generateAppJwt();
    expect(jwt.split('.')).toHaveLength(3);

    const repositories = await provider.getRepositories();
    expect(repositories).toHaveLength(2);
    expect(repositories[0].name).toBe('repo-1');

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.CONNECTED);
  });

  test('validates constant-time webhook signature accurately', () => {
    const provider = new GitHubAppProvider({
      teamId: 'team-1',
      provider: 'github',
      appConfig: mockAppConfig,
    });

    const payload = JSON.stringify({
      action: 'push',
      repository: { name: 'my-repo' },
    });
    const hmac = crypto.createHmac('sha256', mockAppConfig.webhookSecret);
    hmac.update(payload);
    const validSignature = `sha256=${hmac.digest('hex')}`;

    expect(provider.verifyWebhookSignature(payload, validSignature)).toBe(true);
    expect(
      provider.verifyWebhookSignature(payload, 'sha256=invalid_signature')
    ).toBe(false);
  });
});
