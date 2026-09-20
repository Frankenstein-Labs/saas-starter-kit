import { prisma } from '@/lib/prisma';
import { getCurrentUserWithTeam, throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { ApiError } from '@/lib/errors';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const createTrainingJobSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  modelVersionId: z.string().uuid().optional(),
  datasetVersionId: z.string().uuid().optional(),
  computeProviderId: z.string().uuid().optional(),
  parameters: z.record(z.unknown()).default({}),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await throwIfNoTeamAccess(req, res);
    const user = await getCurrentUserWithTeam(req, res);
    if (req.method === 'GET') {
      throwIfNotAllowed(user, 'team', 'read');
      const jobs = await prisma.trainingJob.findMany({
        where: { project: { teamId: user.team.id } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return res.status(200).json({ data: jobs });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
    throwIfNotAllowed(user, 'team', 'create');
    const input = createTrainingJobSchema.safeParse(req.body);
    if (!input.success) throw new ApiError(422, input.error.errors[0]?.message ?? 'Invalid training job');
    const body = input.data;
    const project = await prisma.project.findFirst({ where: { id: body.projectId, teamId: user.team.id }, select: { id: true } });
    if (!project) throw new ApiError(404, 'Project not found');
    if (body.modelVersionId) {
      const version = await prisma.modelVersion.findFirst({ where: { id: body.modelVersionId, model: { projectId: project.id } }, select: { id: true } });
      if (!version) throw new ApiError(404, 'Model version not found');
    }
    if (body.datasetVersionId) {
      const version = await prisma.datasetVersion.findFirst({ where: { id: body.datasetVersionId, dataset: { projectId: project.id } }, select: { id: true } });
      if (!version) throw new ApiError(404, 'Dataset version not found');
    }
    const job = await prisma.trainingJob.create({
      data: {
        projectId: project.id,
        name: body.name,
        modelVersionId: body.modelVersionId,
        datasetVersionId: body.datasetVersionId,
        computeProviderId: body.computeProviderId,
        parameters: body.parameters as any,
      },
    });
    return res.status(201).json({ data: job });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: { message: error.message || 'Something went wrong' } });
  }
}
