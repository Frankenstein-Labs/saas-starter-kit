import { PrismaSecretVault, encryptSecret, decryptSecret } from '@/lib/ml/secret-vault';

describe('PrismaSecretVault', () => {
  const testKey = Buffer.alloc(32, 5);

  it('correctly encrypts and decrypts secret values', () => {
    const encrypted = encryptSecret('super-secret-token', testKey);
    expect(encrypted).not.toEqual('super-secret-token');
    const decrypted = decryptSecret(encrypted, testKey);
    expect(decrypted).toEqual('super-secret-token');
  });

  it('puts, gets, and revokes secrets using Prisma mock', async () => {
    const db: any = {
      secret: {
        records: new Map<string, any>(),
        upsert: jest.fn().mockImplementation(async ({ where, create, update }) => {
          const key = `${where.teamId_name.teamId}:${where.teamId_name.name}`;
          const existing = db.secret.records.get(key);
          const record = {
            id: existing?.id || 'secret-1',
            teamId: create.teamId,
            projectId: create.projectId,
            name: create.name,
            encryptedValue: update.encryptedValue || create.encryptedValue,
            createdAt: existing?.createdAt || new Date(),
            updatedAt: new Date(),
          };
          db.secret.records.set(key, record);
          return record;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          const key = `${where.teamId_name.teamId}:${where.teamId_name.name}`;
          return db.secret.records.get(key) || null;
        }),
        deleteMany: jest.fn().mockImplementation(async ({ where }) => {
          const key = `${where.teamId}:${where.name}`;
          db.secret.records.delete(key);
          return { count: 1 };
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return Array.from(db.secret.records.values()).filter(
            (r: any) => r.teamId === where.teamId
          );
        }),
      },
    };

    const vault = new PrismaSecretVault(testKey, db);
    const scope = { teamId: 'team-123' };

    const putRes = await vault.put(scope, 'github_token', 'ghp_abc123');
    expect(putRes.name).toBe('github_token');

    const token = await vault.get(scope, 'github_token');
    expect(token).toBe('ghp_abc123');

    const secrets = await vault.list(scope);
    expect(secrets.length).toBe(1);
    expect(secrets[0].name).toBe('github_token');

    await vault.revoke(scope, 'github_token');
    const revokedToken = await vault.get(scope, 'github_token');
    expect(revokedToken).toBeNull();
  });
});
