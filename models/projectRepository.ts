import { IntegrationProvider } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const getProjectRepositories = async (projectId: string) => {
  return prisma.projectRepository.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
};

export const addProjectRepository = async (data: {
  projectId: string;
  provider?: IntegrationProvider;
  repo: string;
  installationId?: string;
  metadata?: any;
}) => {
  return prisma.projectRepository.upsert({
    where: {
      projectId_provider_repo: {
        projectId: data.projectId,
        provider: data.provider || IntegrationProvider.GITHUB,
        repo: data.repo,
      },
    },
    update: {
      installationId: data.installationId ?? null,
      metadata: data.metadata ?? null,
    },
    create: {
      projectId: data.projectId,
      provider: data.provider || IntegrationProvider.GITHUB,
      repo: data.repo,
      installationId: data.installationId ?? null,
      metadata: data.metadata ?? null,
    },
  });
};

export const removeProjectRepository = async (
  id: string,
  projectId: string
) => {
  return prisma.projectRepository.deleteMany({
    where: { id, projectId },
  });
};
