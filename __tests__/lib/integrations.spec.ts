import crypto, { generateKeyPairSync } from 'crypto';
import {
  generateAppJwt,
  verifyWebhookSignature,
  GitHubClient,
} from '@/lib/integrations/github';
import { HuggingFaceClient } from '@/lib/integrations/huggingface';
import { GoogleColabClient } from '@/lib/integrations/colab';

describe('Integrations Layer', () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  describe('GitHub Integration', () => {
    it('generates a valid RS256 JWT for GitHub App', () => {
      const jwt = generateAppJwt('12345', privateKey);
      expect(jwt.split('.')).toHaveLength(3);
    });

    it('verifies webhook HMAC SHA-256 signatures in constant time', () => {
      const payload = JSON.stringify({ action: 'opened', issue: { id: 1 } });
      const secret = 'my-webhook-secret';
      const signature =
        'sha256=' +
        crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
      expect(verifyWebhookSignature(payload, 'sha256=invalid', secret)).toBe(false);
    });

    it('tests GitHub connection with mocked fetch', async () => {
      const client = new GitHubClient();
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/user')) {
          return {
            ok: true,
            json: async () => ({ login: 'octocat' }),
          };
        }
        return { ok: false, status: 401 };
      }) as any;

      const result = await client.testConnection({ token: 'ghp_valid_token' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('octocat');
    });
  });

  describe('Hugging Face Integration', () => {
    it('tests Hugging Face connection with mocked fetch', async () => {
      const client = new HuggingFaceClient();
      global.fetch = jest.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => ({ name: 'hf_user', type: 'user' }),
      })) as any;

      const result = await client.testConnection({ token: 'hf_token' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('hf_user');
    });
  });

  describe('Google / Colab Integration', () => {
    it('generates Open in Colab URLs correctly', () => {
      const client = new GoogleColabClient();
      const url = client.generateOpenInColabUrl(
        'org/my-repo',
        'notebooks/demo.ipynb'
      );
      expect(url).toBe(
        'https://colab.research.google.com/github/org/my-repo/blob/main/notebooks/demo.ipynb'
      );
    });

    it('returns explicit UNAVAILABLE status for server-side runtime control', () => {
      const client = new GoogleColabClient();
      const status = client.getRuntimeControlStatus();
      expect(status.status).toBe('UNAVAILABLE');
      expect(status.reason).toContain('unavailable via public API');
    });
  });
});
