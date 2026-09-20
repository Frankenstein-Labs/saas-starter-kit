import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { validateWithSchema } from '@/lib/zod';
import { updateAiResourceSchema } from '@/lib/aiResourceSchemas';
import { throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { getProject } from 'models/project';
import {
  deleteAiResource,
  getAiResource,
  getAiResourceName,
  isAiResource,
  updateAiResource,
} from 'models/aiResource';

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  resource: z.string(),
  resourceId: z.string().uuid(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);
    const { projectId, resource, resourceId } = validateWithSchema(
      paramsSchema,
      req.query
    );
    if (!isAiResource(resource))
      throw new ApiError(404, 'AI resource not found.');
    const project = await getProject(projectId, teamMember.team.id);
    if (!project) throw new ApiError(404, 'Project not found.');
    const permission = `ai_${resource.slice(0, -1)}` as any;
    const existing = await getAiResource(resource, projectId, resourceId);
    if (!existing)
      throw new ApiError(404, `${getAiResourceName(resource)} not found.`);

    if (req.method === 'GET') {
      throwIfNotAllowed(teamMember, permission, 'read');
      return res.status(200).json({ data: existing });
    }
    if (req.method === 'PATCH') {
      throwIfNotAllowed(teamMember, permission, 'update');
      const input = validateWithSchema(updateAiResourceSchema, req.body);
      if (resource === 'notebooks' && input.workspaceId) {
        const workspace = await getAiResource(
          'workspaces',
          projectId,
          input.workspaceId
        );
        if (!workspace)
          throw new ApiError(422, 'Workspace does not belong to this project.');
      }
      await updateAiResource(resource, projectId, resourceId, input);
      return res
        .status(200)
        .json({ data: await getAiResource(resource, projectId, resourceId) });
    }
    if (req.method === 'DELETE') {
      throwIfNotAllowed(teamMember, permission, 'delete');
      await deleteAiResource(resource, projectId, resourceId);
      return res.status(204).end();
    }
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  } catch (error: any) {
    const status =
      error instanceof ApiError ? error.status : error.status || 500;
    const message = error.message || 'Something went wrong';
    return res.status(status).json({ error: { message } });
  }
}
