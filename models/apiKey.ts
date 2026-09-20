import { prisma } from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';

interface CreateApiKeyParams {
  name: string;
  teamId: string;
  scopes?: string[];
  projectId?: string;
  deploymentId?: string;
}

const hashApiKey = (apiKey: string) => {
  return createHash('sha256').update(apiKey).digest('hex');
};

const generateUniqueApiKey = () => {
  const apiKey = randomBytes(16).toString('hex');

  return [hashApiKey(apiKey), apiKey];
};

export const createApiKey = async (params: CreateApiKeyParams) => {
  const { name, teamId } = params;

  const [hashedKey, apiKey] = generateUniqueApiKey();

  await prisma.apiKey.create({
    data: {
      name,
      hashedKey: hashedKey,
      scopes: params.scopes ?? [],
      teamId,
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(params.deploymentId ? { deploymentId: params.deploymentId } : {}),
    },
  });

  return apiKey;
};

export const fetchApiKeys = async (teamId: string) => {
  return prisma.apiKey.findMany({
    where: {
      teamId,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      scopes: true,
      projectId: true,
      deploymentId: true,
    },
  });
};

export const deleteApiKey = async (id: string) => {
  return prisma.apiKey.delete({
    where: {
      id,
    },
  });
};

export const getApiKey = async (apiKey: string) => {
  return prisma.apiKey.findUnique({
    where: {
      hashedKey: hashApiKey(apiKey),
    },
    select: {
      id: true,
      teamId: true,
      hashedKey: true,
      scopes: true,
      projectId: true,
      deploymentId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
};

export const getApiKeyById = async (id: string) => {
  return prisma.apiKey.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      teamId: true,
    },
  });
};

export const touchApiKey = async (id: string) => {
  return prisma.apiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
};
