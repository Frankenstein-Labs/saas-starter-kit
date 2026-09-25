import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

export type SecretScope = {
  teamId: string;
  ownerUserId?: string;
  projectId?: string;
};
export type SecretMetadata = {
  name: string;
  createdAt: Date;
  revokedAt?: Date;
};

export interface SecretVault {
  put(scope: SecretScope, name: string, value: string): Promise<SecretMetadata>;
  get(scope: SecretScope, name: string): Promise<string | null>;
  revoke(scope: SecretScope, name: string): Promise<void>;
  list(scope: SecretScope): Promise<SecretMetadata[]>;
}

const keyFromEnv = () => {
  const raw = process.env.SECRET_VAULT_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
};

export const encryptSecret = (value: string, key = keyFromEnv()) => {
  if (!key)
    throw new Error('SECRET_VAULT_KEY must be a base64-encoded 32-byte key');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key as any, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ciphertext.toString('base64')}`;
};

export const decryptSecret = (encoded: string, key = keyFromEnv()) => {
  if (!key)
    throw new Error('SECRET_VAULT_KEY must be a base64-encoded 32-byte key');
  const [ivPart, tagPart, ciphertextPart] = encoded.split('.');
  if (!ivPart || !tagPart || !ciphertextPart)
    throw new Error('Invalid encrypted secret');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key as any,
    Buffer.from(ivPart, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

type StoredSecret = SecretMetadata & { scope: SecretScope; ciphertext: string };

export class PrismaSecretVault implements SecretVault {
  private readonly db: PrismaClient;
  private readonly key?: Buffer;

  constructor(key?: Buffer, dbClient: PrismaClient = defaultPrisma) {
    this.key = key;
    this.db = dbClient;
  }

  async put(scope: SecretScope, name: string, value: string): Promise<SecretMetadata> {
    const encryptedValue = encryptSecret(value, this.key as any);
    const secret = await this.db.secret.upsert({
      where: {
        teamId_name: {
          teamId: scope.teamId,
          name,
        },
      },
      update: {
        encryptedValue,
        projectId: scope.projectId ?? null,
      },
      create: {
        teamId: scope.teamId,
        projectId: scope.projectId ?? null,
        name,
        encryptedValue,
      },
    });

    return {
      name: secret.name,
      createdAt: secret.createdAt,
    };
  }

  async get(scope: SecretScope, name: string): Promise<string | null> {
    const secret = await this.db.secret.findUnique({
      where: {
        teamId_name: {
          teamId: scope.teamId,
          name,
        },
      },
    });

    if (!secret) return null;
    try {
      return decryptSecret(secret.encryptedValue, this.key as any);
    } catch {
      return null;
    }
  }

  async revoke(scope: SecretScope, name: string): Promise<void> {
    await this.db.secret.deleteMany({
      where: {
        teamId: scope.teamId,
        name,
      },
    });
  }

  async list(scope: SecretScope): Promise<SecretMetadata[]> {
    const secrets = await this.db.secret.findMany({
      where: {
        teamId: scope.teamId,
        ...(scope.projectId ? { projectId: scope.projectId } : {}),
      },
      select: {
        name: true,
        createdAt: true,
      },
    });

    return secrets.map((s) => ({
      name: s.name,
      createdAt: s.createdAt,
    }));
  }
}

export class InMemorySecretVault implements SecretVault {
  private readonly records = new Map<string, StoredSecret>();
  private readonly key: Buffer;

  constructor(key = randomBytes(32)) {
    this.key = key;
  }

  private id(scope: SecretScope, name: string) {
    return `${scope.teamId}:${scope.ownerUserId ?? '*'}:${name}`;
  }

  async put(scope: SecretScope, name: string, value: string) {
    const metadata = { name, createdAt: new Date() };
    this.records.set(this.id(scope, name), {
      ...metadata,
      scope,
      ciphertext: encryptSecret(value, this.key as any),
    });
    return metadata;
  }

  async get(scope: SecretScope, name: string) {
    const exact = this.records.get(this.id(scope, name));
    const teamSecret = this.records.get(
      this.id({ teamId: scope.teamId }, name)
    );
    const record = exact ?? teamSecret;
    if (!record || record.revokedAt) return null;
    return decryptSecret(record.ciphertext, this.key as any);
  }

  async revoke(scope: SecretScope, name: string) {
    const record = this.records.get(this.id(scope, name));
    if (record) record.revokedAt = new Date();
  }

  async list(scope: SecretScope) {
    return Array.from(this.records.values())
      .filter(
        (record) =>
          record.scope.teamId === scope.teamId &&
          (!record.scope.ownerUserId ||
            record.scope.ownerUserId === scope.ownerUserId)
      )
      .map(({ name, createdAt, revokedAt }) => ({
        name,
        createdAt,
        revokedAt,
      }));
  }
}
