import type { IntegrationProvider } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const getIntegrations = async (teamId: string) => {
  return prisma.integration.findMany({
    where: { teamId },
    select: {
      id: true,
      teamId: true,
      provider: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
};

export const getIntegration = async (
  teamId: string,
  provider: IntegrationProvider
) => {
  return prisma.integration.findUnique({
    where: {
      teamId_provider: {
        teamId,
        provider,
      },
    },
  });
};
