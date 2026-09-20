import type { Prisma, ProjectStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const getProjects = async (
  teamId: string,
  options: { skip: number; take: number }
) => {
  const [data, total] = await prisma.$transaction([
    prisma.project.findMany({
      where: { teamId },
      skip: options.skip,
      take: options.take,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            workspaces: true,
            notebooks: true,
            datasets: true,
            models: true,
            trainingJobs: true,
            deployments: true,
          },
        },
      },
    }),
    prisma.project.count({ where: { teamId } }),
  ]);

  return { data, total };
};

export const getProject = async (id: string, teamId: string) => {
  return prisma.project.findFirst({
    where: { id, teamId },
    include: {
      _count: {
        select: {
          workspaces: true,
          notebooks: true,
          datasets: true,
          models: true,
          trainingJobs: true,
          deployments: true,
        },
      },
    },
  });
};

export const createProject = async (data: {
  teamId: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
}) => {
  return prisma.project.create({
    data,
    include: { _count: true },
  });
};

export const updateProject = async (
  id: string,
  teamId: string,
  data: Prisma.ProjectUpdateInput
) => {
  return prisma.project.updateMany({
    where: { id, teamId },
    data,
  });
};

export const archiveProject = async (id: string, teamId: string) => {
  return updateProject(id, teamId, { status: 'ARCHIVED' as ProjectStatus });
};
