import { HuggingFaceProvider } from '../../../lib/integrations/huggingface';
import {
  IntegrationStatus,
  Transport,
} from '../../../lib/integrations/provider';

describe('HuggingFaceProvider', () => {
  test('returns NOT_CONFIGURED without access token', async () => {
    const provider = new HuggingFaceProvider({
      teamId: 'team-1',
      provider: 'huggingface',
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.NOT_CONFIGURED);
  });

  test('fetches models and runs inference via mock transport', async () => {
    const mockTransport: Transport = {
      fetch: jest.fn().mockImplementation((url) => {
        if (url.includes('/whoami-v2')) {
          return Promise.resolve({ name: 'testuser' });
        }
        if (url.includes('/api/models')) {
          return Promise.resolve([
            { id: 'gpt2', pipeline_tag: 'text-generation' },
          ]);
        }
        if (url.includes('/models/gpt2')) {
          return Promise.resolve([{ generated_text: 'Hello world' }]);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }),
    };

    const provider = new HuggingFaceProvider({
      teamId: 'team-1',
      provider: 'huggingface',
      transport: mockTransport,
      hfConfig: { accessToken: 'hf_mock_token' },
    });

    const status = await provider.getStatus();
    expect(status).toBe(IntegrationStatus.CONNECTED);

    const models = await provider.getModels();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('gpt2');

    const inference = await provider.runInference('gpt2', 'Hello');
    expect(inference).toEqual([{ generated_text: 'Hello world' }]);
  });
});
