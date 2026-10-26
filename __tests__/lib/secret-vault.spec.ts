import { PrismaSecretVault, encryptSecret, decryptSecret } from '@/lib/ml/secret-vault';
import { prisma } from '@/lib/prisma';

describe('Secret Vault Tests', () => {
  it('encrypts and decrypts secret correctly', () => {
    const originalText = 'my-super-secret-token-123';
    const encrypted = encryptSecret(originalText);
    expect(encrypted.encryptedValue).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();

    const decrypted = decryptSecret(encrypted.encryptedValue, encrypted.iv, encrypted.tag);
    expect(decrypted).toEqual(originalText);
  });

  it('PrismaSecretVault calls prisma correctly on put/get', async () => {
    const vault = new PrismaSecretVault();
    const teamId = 'team-123';
    const name = 'github_token';
    const value = 'ghp_secret123';

    const spyUpsert = jest.spyOn(prisma.secret, 'upsert').mockResolvedValue({
      id: 'sec-1',
      teamId,
      name,
      encryptedValue: 'enc',
      iv: 'iv',
      tag: 'tag',
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: null,
      integrationId: null,
    });

    await vault.put(teamId, name, value);
    expect(spyUpsert).toHaveBeenCalled();

    spyUpsert.mockRestore();
  });
});
