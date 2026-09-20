import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { archiveProject, getProject, updateProject } from 'models/project';
import { validateWithSchema } from '@/lib/zod';

const projectIdSchema = z.object({
  projectId: z.string().uuid(),
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);
    const { projectId } = validateWithSchema(projectIdSchema, req.query);
    const project = await getProject(projectId, teamMember.team.id);

    if (!project) {
      throw new ApiError(404, 'Project not found.');
    }

    if (req.method === 'GET') {
      throwIfNotAllowed(teamMember, 'ai_project', 'read');
      return res.status(200).json({ data: project });
    }

    if (req.method === 'PATCH') {
      throwIfNotAllowed(teamMember, 'ai_project', 'update');
      const input = validateWithSchema(updateProjectSchema, req.body);
      await updateProject(projectId, teamMember.team.id, input);
      return res.status(200).json({
        data: await getProject(projectId, teamMember.team.id),
      });
    }

    if (req.method === 'DELETE') {
      throwIfNotAllowed(teamMember, 'ai_project', 'delete');
      await archiveProject(projectId, teamMember.team.id);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({
      error: { message: `Method ${req.method} Not Allowed` },
    });
  } catch (error: any) {
    const status =
      error instanceof ApiError ? error.status : error.status || 500;
    const message = error.message || 'Something went wrong';
    return res.status(status).json({ error: { message } });
  }
}
