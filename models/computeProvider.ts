import { ComputeProviderType, ProviderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const listComputeProviders = (teamId: string) =>
  prisma.computeProvider.findMany({
    where: { teamId },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
      resources: {
        select: {
          id: true,
          name: true,
          cpu: true,
          ramMb: true,
          gpu: true,
          storageGb: true,
          available: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

export const createComputeProvider = (input: {
  teamId: string;
  name: string;
  type: ComputeProviderType;
  metadata?: object;
}) =>
  prisma.computeProvider.create({
    data: {
      teamId: input.teamId,
      name: input.name,
      type: input.type,
      status: ProviderStatus.NOT_CONFIGURED,
      metadata: input.metadata,
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
