import { prisma } from '@/lib/prisma';
import { getCurrentUserWithTeam, throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { ApiError } from '@/lib/errors';
import { assertTrainingTransition } from '@/lib/ml/compute';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await throwIfNoTeamAccess(req, res);
    const user = await getCurrentUserWithTeam(req, res);
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } });
    }
    throwIfNotAllowed(user, 'team', req.method === 'GET' ? 'read' : 'update');
    const job = await prisma.trainingJob.findFirst({
      where: { id: String(req.query.jobId), project: { teamId: user.team.id } },
    });
    if (!job) throw new ApiError(404, 'Training job not found');
    if (req.method === 'GET') return res.status(200).json({ data: job });
    assertTrainingTransition(job.status, 'CANCELLED');
    const cancelled = await prisma.trainingJob.update({
      where: { id: job.id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    return res.status(200).json({ data: cancelled });
  } catch (error: any) {
    return res.status(error.status || 409).json({ error: { message: error.message || 'Something went wrong' } });
  }
}
