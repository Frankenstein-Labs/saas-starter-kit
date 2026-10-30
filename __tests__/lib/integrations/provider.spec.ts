import {
  BaseIntegrationProvider,
  IntegrationStatus,
  Transport,
} from '../../../lib/integrations/provider';
import { ApiError } from '../../../lib/errors';

class TestProvider extends BaseIntegrationProvider {
  async getStatus(): Promise<IntegrationStatus> {
    try {
      await this.transport.fetch('https://api.test.com/status');
      return IntegrationStatus.CONNECTED;
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        return IntegrationStatus.UNVERIFIED;
      }
      return IntegrationStatus.ERROR;
    }
  }

  async connect(credentials: Record<string, any>): Promise<void> {
    if (!credentials.apiKey) {
      throw new ApiError(400, 'API key required');
    }
  }

  async disconnect(): Promise<void> {}
}

describe('Provider Framework', () => {
  test('uses injectable transport and handles status correctly', async () => {
    const mockTransport: Transport = {
      fetch: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    const provider = new TestProvider({
      teamId: 'team-1',
      provider: 'test',
      transport: mockTransport,
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.CONNECTED);
    expect(mockTransport.fetch).toHaveBeenCalledWith(
      'https://api.test.com/status'
    );
  });

  test('handles ApiError correctly on 401 response', async () => {
    const mockTransport: Transport = {
      fetch: jest.fn().mockRejectedValue(new ApiError(401, 'Unauthorized')),
    };

    const provider = new TestProvider({
      teamId: 'team-1',
      provider: 'test',
      transport: mockTransport,
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.UNVERIFIED);
  });
});
