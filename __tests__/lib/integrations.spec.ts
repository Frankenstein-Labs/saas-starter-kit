import crypto from 'crypto';
import { GitHubIntegrationClient } from '@/lib/integrations/github';
import { GoogleColabIntegrationClient } from '@/lib/integrations/colab';

describe('Integrations Clients Unit Tests', () => {
  describe('GitHub Client', () => {
    it('verifies HMAC webhook signatures correctly', () => {
      const client = new GitHubIntegrationClient();
      const secret = 'webhook_secret_key';
      const payload = '{"action":"opened"}';

      const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

      expect(client.verifyWebhookSignature(payload, signature, secret)).toBe(true);
      expect(client.verifyWebhookSignature(payload, 'sha256=invalid', secret)).toBe(false);
    });
  });

  describe('Google Colab Client', () => {
    it('generates Open in Colab URLs correctly', () => {
      const client = new GoogleColabIntegrationClient();
      expect(client.generateOpenInColabUrl({ driveFileId: '123' })).toBe('https://colab.research.google.com/drive/123');
      expect(client.generateOpenInColabUrl({ githubPath: 'org/repo/blob/main/nb.ipynb' })).toBe('https://colab.research.google.com/github/org/repo/blob/main/nb.ipynb');
    });

    it('returns UNAVAILABLE runtime control status', () => {
      const client = new GoogleColabIntegrationClient();
      const status = client.getRuntimeControlStatus();
      expect(status.available).toBe(false);
      expect(status.code).toBe('UNAVAILABLE');
    });
  });
});
