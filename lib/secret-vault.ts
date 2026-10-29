import crypto from 'crypto';
import { prisma } from './prisma';

export interface SecretVault {
  put(params: {
    teamId: string;
    userId?: string;
    name: string;
    value: string;
  }): Promise<void>;
  get(params: {
    teamId: string;
    userId?: string;
    name: string;
  }): Promise<string | null>;
  revoke(params: {
    teamId: string;
    userId?: string;
    name: string;
  }): Promise<void>;
  list(params: {
    teamId: string;
    userId?: string;
  }): Promise<{ name: string; createdAt: Date; updatedAt: Date }[]>;
}

export class PrismaSecretVault implements SecretVault {
  private key: Buffer;

  constructor(secretKeyHex?: string) {
    const keySource = secretKeyHex || process.env.SECRET_VAULT_KEY;
    if (!keySource) {
      throw new Error(
        'SECRET_VAULT_KEY environment variable or key hex is required'
      );
    }
    // Handle 32-byte key (64 hex characters) or raw string filled/hashed to 32 bytes
    if (keySource.length === 64 && /^[0-9a-fA-F]+$/.test(keySource)) {
      this.key = Buffer.from(keySource, 'hex');
    } else {
      this.key = crypto.createHash('sha256').update(keySource).digest();
    }
  }

  private encrypt(plainText: string): {
    encryptedValue: string;
    iv: string;
    tag: string;
  } {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      tag,
    };
  }

  private decrypt(
    encryptedValue: string,
    ivHex: string,
    tagHex: string
  ): string {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async put(params: {
    teamId: string;
    userId?: string;
    name: string;
    value: string;
  }): Promise<void> {
    const { teamId, userId, name, value } = params;
    const { encryptedValue, iv, tag } = this.encrypt(value);

    await prisma.secret.upsert({
      where: {
        teamId_name: {
          teamId,
          name,
        },
      },
      create: {
        teamId,
        userId: userId || null,
        name,
        encryptedValue,
        iv,
        tag,
      },
      update: {
        userId: userId || null,
        encryptedValue,
        iv,
        tag,
      },
    });
  }

  async get(params: {
    teamId: string;
    userId?: string;
    name: string;
  }): Promise<string | null> {
    const { teamId, userId, name } = params;
    const secret = await prisma.secret.findUnique({
      where: {
        teamId_name: {
          teamId,
          name,
        },
      },
    });

    if (!secret) return null;

    // Enforce userId isolation if userId was provided during scope query or creation
    if (userId && secret.userId && secret.userId !== userId) {
      return null;
    }

    return this.decrypt(secret.encryptedValue, secret.iv, secret.tag);
  }

  async revoke(params: {
    teamId: string;
    userId?: string;
    name: string;
  }): Promise<void> {
    const { teamId, userId, name } = params;
    const secret = await prisma.secret.findUnique({
      where: {
        teamId_name: {
          teamId,
          name,
        },
      },
    });

    if (!secret) return;

    if (userId && secret.userId && secret.userId !== userId) {
      return;
    }

    await prisma.secret.delete({
      where: {
        teamId_name: {
          teamId,
          name,
        },
      },
    });
  }

  async list(params: {
    teamId: string;
    userId?: string;
  }): Promise<{ name: string; createdAt: Date; updatedAt: Date }[]> {
    const { teamId, userId } = params;
    const secrets = await prisma.secret.findMany({
      where: {
        teamId,
        ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      },
      select: {
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return secrets;
  }
}
