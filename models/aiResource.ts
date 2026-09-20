import {
  DatasetSource,
  ModelSource,
  Prisma,
  WorkspaceStatus,
  NotebookStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AiResource = 'workspaces' | 'notebooks' | 'models' | 'datasets';

const resourceNames: Record<AiResource, string> = {
  workspaces: 'Workspace',
  notebooks: 'Notebook',
  models: 'Model',
  datasets: 'Dataset',
};

export const isAiResource = (value: string): value is AiResource =>
  value in resourceNames;

export const getAiResourceName = (resource: AiResource) =>
  resourceNames[resource];

export const listAiResources = async (
  resource: AiResource,
  projectId: string
) => {
  switch (resource) {
    case 'workspaces':
      return prisma.workspace.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
      });
    case 'notebooks':
      return prisma.notebook.findMany({
        where: { projectId },
        orderBy: { updatedAt: 'desc' },
      });
    case 'models':
      return prisma.model.findMany({
        where: { projectId },
        include: { _count: { select: { versions: true, deployments: true } } },
        orderBy: { updatedAt: 'desc' },
      });
    case 'datasets':
      return prisma.dataset.findMany({
        where: { projectId },
        include: { _count: { select: { versions: true } } },
        orderBy: { updatedAt: 'desc' },
      });
  }
};

export const createAiResource = async (
  resource: AiResource,
  projectId: string,
  input: {
    name: string;
    description?: string;
    workspaceId?: string;
    content?: Prisma.InputJsonValue;
    source?: ModelSource | DatasetSource;
    framework?: string;
    format?: string;
    license?: string;
  }
) => {
  switch (resource) {
    case 'workspaces':
      return prisma.workspace.create({
        data: {
          projectId,
          name: input.name,
          description: input.description,
          status: WorkspaceStatus.UNAVAILABLE,
        },
      });
    case 'notebooks':
      return prisma.notebook.create({
        data: {
          projectId,
          workspaceId: input.workspaceId,
          name: input.name,
          content: input.content ?? {
            cells: [],
            metadata: {},
            nbformat: 4,
            nbformat_minor: 5,
          },
          status: NotebookStatus.DRAFT,
        },
      });
    case 'models':
      return prisma.model.create({
        data: {
          projectId,
          name: input.name,
          description: input.description,
          source:
            (input.source as ModelSource | undefined) ?? ModelSource.LOCAL,
          framework: input.framework,
          format: input.format,
          license: input.license,
        },
      });
    case 'datasets':
      return prisma.dataset.create({
        data: {
          projectId,
          name: input.name,
          description: input.description,
          source:
            (input.source as DatasetSource | undefined) ?? DatasetSource.LOCAL,
          license: input.license,
        },
      });
  }
};

export const getAiResource = async (
  resource: AiResource,
  projectId: string,
  resourceId: string
) => {
  switch (resource) {
    case 'workspaces':
      return prisma.workspace.findFirst({
        where: { id: resourceId, projectId },
      });
    case 'notebooks':
      return prisma.notebook.findFirst({
        where: { id: resourceId, projectId },
      });
    case 'models':
      return prisma.model.findFirst({
        where: { id: resourceId, projectId },
        include: {
          versions: true,
          _count: { select: { deployments: true, experiments: true } },
        },
      });
    case 'datasets':
      return prisma.dataset.findFirst({
        where: { id: resourceId, projectId },
        include: { versions: true, _count: { select: { experiments: true } } },
      });
  }
};

export const updateAiResource = async (
  resource: AiResource,
  projectId: string,
  resourceId: string,
  input: {
    name?: string;
    description?: string | null;
    workspaceId?: string | null;
    content?: Prisma.InputJsonValue;
    framework?: string | null;
    format?: string | null;
    license?: string | null;
  }
) => {
  switch (resource) {
    case 'workspaces':
      return prisma.workspace.updateMany({
        where: { id: resourceId, projectId },
        data: input,
      });
    case 'notebooks':
      return prisma.notebook.updateMany({
        where: { id: resourceId, projectId },
        data: input,
      });
    case 'models':
      return prisma.model.updateMany({
        where: { id: resourceId, projectId },
        data: input,
      });
    case 'datasets':
      return prisma.dataset.updateMany({
        where: { id: resourceId, projectId },
        data: input,
      });
  }
};

export const deleteAiResource = async (
  resource: AiResource,
  projectId: string,
  resourceId: string
) => {
  switch (resource) {
    case 'workspaces':
      return prisma.workspace.deleteMany({
        where: { id: resourceId, projectId },
      });
    case 'notebooks':
      return prisma.notebook.deleteMany({
        where: { id: resourceId, projectId },
      });
    case 'models':
      return prisma.model.deleteMany({ where: { id: resourceId, projectId } });
    case 'datasets':
      return prisma.dataset.deleteMany({
        where: { id: resourceId, projectId },
      });
  }
};
