import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface SecretVault {
  put(teamId: string, name: string, value: string, options?: { projectId?: string; integrationId?: string }): Promise<void>;
  get(teamId: string, name: string): Promise<string | null>;
  revoke(teamId: string, name: string): Promise<boolean>;
  list(teamId: string): Promise<{ name: string; createdAt: Date; updatedAt: Date }[]>;
}

const ALGORITHM = 'aes-256-gcm';

function getVaultKey(): Buffer {
  const secretKey = process.env.SECRET_VAULT_KEY;
  if (!secretKey) {
    // Default fallback 32-byte key for local dev / testing if env var not set
    return Buffer.from('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex');
  }
  if (secretKey.length === 64) {
    return Buffer.from(secretKey, 'hex');
  }
  return Buffer.from(secretKey, 'base64');
}

export function encryptSecret(plainText: string): { encryptedValue: string; iv: string; tag: string } {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

export function decryptSecret(encryptedValue: string, ivHex: string, tagHex: string): string {
  const key = getVaultKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export class InMemorySecretVault implements SecretVault {
  private secrets = new Map<string, { value: string; createdAt: Date; updatedAt: Date }>();

  async put(teamId: string, name: string, value: string): Promise<void> {
    const key = `${teamId}:${name}`;
    const now = new Date();
    const existing = this.secrets.get(key);
    this.secrets.set(key, {
      value,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    });
  }

  async get(teamId: string, name: string): Promise<string | null> {
    const secret = this.secrets.get(`${teamId}:${name}`);
    return secret ? secret.value : null;
  }

  async revoke(teamId: string, name: string): Promise<boolean> {
    return this.secrets.delete(`${teamId}:${name}`);
  }

  async list(teamId: string): Promise<{ name: string; createdAt: Date; updatedAt: Date }[]> {
    const result: { name: string; createdAt: Date; updatedAt: Date }[] = [];
    this.secrets.forEach((val, key) => {
      if (key.startsWith(`${teamId}:`)) {
        const name = key.substring(teamId.length + 1);
        result.push({ name, createdAt: val.createdAt, updatedAt: val.updatedAt });
      }
    });
    return result;
  }
}

export class PrismaSecretVault implements SecretVault {
  async put(teamId: string, name: string, value: string, options?: { projectId?: string; integrationId?: string }): Promise<void> {
    const { encryptedValue, iv, tag } = encryptSecret(value);

    await prisma.secret.upsert({
      where: {
        teamId_name: {
          teamId,
          name,
        },
      },
      update: {
        encryptedValue,
        iv,
        tag,
        projectId: options?.projectId,
        integrationId: options?.integrationId,
      },
      create: {
        teamId,
        name,
        encryptedValue,
        iv,
        tag,
        projectId: options?.projectId,
        integrationId: options?.integrationId,
      },
    });
  }

  async get(teamId: string, name: string): Promise<string | null> {
    const secret = await prisma.secret.findUnique({
      where: {
        teamId_name: {
          teamId,
          name,
        },
      },
    });

    if (!secret) return null;

    return decryptSecret(secret.encryptedValue, secret.iv, secret.tag);
  }

  async revoke(teamId: string, name: string): Promise<boolean> {
    try {
      await prisma.secret.delete({
        where: {
          teamId_name: {
            teamId,
            name,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async list(teamId: string): Promise<{ name: string; createdAt: Date; updatedAt: Date }[]> {
    const secrets = await prisma.secret.findMany({
      where: { teamId },
      select: {
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return secrets;
  }
}

export const secretVault: SecretVault = new PrismaSecretVault();
