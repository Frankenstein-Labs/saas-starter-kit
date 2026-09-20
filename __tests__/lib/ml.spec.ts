import {
  ComputeUnavailableError,
  InMemoryTrainingQueue,
  NoComputeProvider,
  assertTrainingTransition,
} from '@/lib/ml/compute';
import { authorizeInferenceKey, hashApiSecret } from '@/lib/ml/inference';
import { InMemorySecretVault } from '@/lib/ml/secret-vault';

describe('ML foundations', () => {
  it('encrypts secrets and isolates user scopes', async () => {
    const vault = new InMemorySecretVault(Buffer.alloc(32, 7));
    await vault.put(
      { teamId: 'team-a', ownerUserId: 'user-a' },
      'hf',
      'token-a'
    );
    await vault.put(
      { teamId: 'team-a', ownerUserId: 'user-b' },
      'hf',
      'token-b'
    );
    expect(
      await vault.get({ teamId: 'team-a', ownerUserId: 'user-a' }, 'hf')
    ).toBe('token-a');
    expect(
      await vault.get({ teamId: 'team-a', ownerUserId: 'user-b' }, 'hf')
    ).toBe('token-b');
    expect(
      await vault.get({ teamId: 'team-b', ownerUserId: 'user-a' }, 'hf')
    ).toBeNull();
  });

  it('rejects invalid training transitions', () => {
    expect(() => assertTrainingTransition('QUEUED', 'COMPLETED')).toThrow(
      'Invalid training job transition'
    );
    expect(() => assertTrainingTransition('RUNNING', 'FAILED')).not.toThrow();
  });

  it('does not claim compute exists by default', async () => {
    const provider = new NoComputeProvider();
    expect(provider.isConfigured()).toBe(false);
    expect(await provider.isAvailable()).toBe(false);
    expect(new ComputeUnavailableError().message).toBe('No compute available');
  });

  it('deduplicates and cancels queued work', async () => {
    const queue = new InMemoryTrainingQueue();
    await queue.enqueue('job-1');
    await queue.enqueue('job-1');
    expect(await queue.dequeue()).toBe('job-1');
    expect(await queue.dequeue()).toBeNull();
    await queue.enqueue('job-2');
    expect(await queue.cancel('job-2')).toBe(true);
    expect(await queue.dequeue()).toBeNull();
  });

  it('limits inference keys to scope and deployment', () => {
    const key = {
      hashedKey: hashApiSecret('secret'),
      scopes: ['inference'],
      projectId: 'project-1',
      deploymentId: 'deployment-1',
    };
    expect(
      authorizeInferenceKey(key, 'secret', 'deployment-1', 'project-1')
    ).toBe(true);
    expect(
      authorizeInferenceKey(key, 'secret', 'deployment-2', 'project-1')
    ).toBe(false);
    expect(
      authorizeInferenceKey(key, 'wrong', 'deployment-1', 'project-1')
    ).toBe(false);
  });
});
