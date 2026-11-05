import { GoogleColabProvider } from '../../../lib/integrations/google-colab';
import {
  IntegrationStatus,
  Transport,
} from '../../../lib/integrations/provider';

describe('GoogleColabProvider', () => {
  test('returns NOT_CONFIGURED without access token', async () => {
    const provider = new GoogleColabProvider({
      teamId: 'team-1',
      provider: 'google',
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.NOT_CONFIGURED);
  });

  test('lists notebooks and returns correct open in colab link', async () => {
    const mockTransport: Transport = {
      fetch: jest.fn().mockImplementation((url) => {
        if (url.includes('/userinfo')) {
          return Promise.resolve({ sub: '12345' });
        }
        if (url.includes('/drive/v3/files')) {
          return Promise.resolve({
            files: [
              {
                id: 'colab-file-id-123',
                name: 'demo.ipynb',
                mimeType: 'application/x-ipynb+json',
              },
            ],
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }),
    };

    const provider = new GoogleColabProvider({
      teamId: 'team-1',
      provider: 'google',
      transport: mockTransport,
      googleConfig: { accessToken: 'google_mock_token' },
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.CONNECTED);

    const notebooks = await provider.listNotebooks();
    expect(notebooks).toHaveLength(1);
    expect(notebooks[0].name).toBe('demo.ipynb');

    const colabUrl = provider.getOpenInColabUrl('colab-file-id-123');
    expect(colabUrl).toBe(
      'https://colab.research.google.com/drive/colab-file-id-123'
    );

    const runtime = await provider.getRuntimeStatus();
    expect(runtime.status).toBe('UNAVAILABLE');
  });
});
