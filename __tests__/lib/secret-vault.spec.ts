import { PrismaSecretVault } from '../../lib/secret-vault';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    secret: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('PrismaSecretVault', () => {
  const masterKey =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let vault: PrismaSecretVault;

  beforeEach(() => {
    jest.clearAllMocks();
    vault = new PrismaSecretVault(masterKey);
  });

  test('encrypts and decrypts secret correctly', async () => {
    const mockDb: Record<string, any> = {};

    (prisma.secret.upsert as jest.Mock).mockImplementation(
      async ({ create }) => {
        mockDb[create.name] = create;
        return create;
      }
    );

    (prisma.secret.findUnique as jest.Mock).mockImplementation(
      async ({ where }) => {
        return mockDb[where.teamId_name.name] || null;
      }
    );

    const secretValue = 'super_secret_api_key_123';
    await vault.put({
      teamId: 'team-1',
      userId: 'user-1',
      name: 'GITHUB_TOKEN',
      value: secretValue,
    });

    expect(prisma.secret.upsert).toHaveBeenCalledTimes(1);
    const stored = mockDb['GITHUB_TOKEN'];
    expect(stored.encryptedValue).not.toBe(secretValue);
    expect(stored.iv).toBeDefined();
    expect(stored.tag).toBeDefined();

    const retrieved = await vault.get({
      teamId: 'team-1',
      userId: 'user-1',
      name: 'GITHUB_TOKEN',
    });

    expect(retrieved).toBe(secretValue);
  });

  test('isolates team and user scopes', async () => {
    const storedSecret = {
      teamId: 'team-1',
      userId: 'user-1',
      name: 'SCOPED_KEY',
      encryptedValue: 'abc',
      iv: 'def',
      tag: 'ghi',
    };

    (prisma.secret.findUnique as jest.Mock).mockResolvedValue(storedSecret);

    const resultOtherUser = await vault.get({
      teamId: 'team-1',
      userId: 'user-2',
      name: 'SCOPED_KEY',
    });

    expect(resultOtherUser).toBeNull();
  });

  test('revokes secret successfully', async () => {
    (prisma.secret.findUnique as jest.Mock).mockResolvedValue({
      teamId: 'team-1',
      userId: 'user-1',
      name: 'REVOKE_ME',
    });

    await vault.revoke({
      teamId: 'team-1',
      userId: 'user-1',
      name: 'REVOKE_ME',
    });

    expect(prisma.secret.delete).toHaveBeenCalledWith({
      where: {
        teamId_name: {
          teamId: 'team-1',
          name: 'REVOKE_ME',
        },
      },
    });
  });
});
