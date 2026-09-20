import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { validateWithSchema } from '@/lib/zod';
import {
  listAiResourcesSchema,
  createAiResourceSchema,
} from '@/lib/aiResourceSchemas';
import { throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { getProject } from 'models/project';
import {
  createAiResource,
  getAiResource,
  isAiResource,
  listAiResources,
} from 'models/aiResource';

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  resource: z.string(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);
    const { projectId, resource } = validateWithSchema(paramsSchema, req.query);
    if (!isAiResource(resource)) {
      throw new ApiError(404, 'AI resource not found.');
    }
    const project = await getProject(projectId, teamMember.team.id);
    if (!project) {
      throw new ApiError(404, 'Project not found.');
    }

    if (req.method === 'GET') {
      throwIfNotAllowed(
        teamMember,
        `ai_${resource.slice(0, -1)}` as any,
        'read'
      );
      const { page, pageSize } = validateWithSchema(
        listAiResourcesSchema,
        req.query
      );
      const all = await listAiResources(resource, projectId);
      const total = all.length;
      const data = all.slice((page - 1) * pageSize, page * pageSize);
      return res.status(200).json({
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    }

    if (req.method === 'POST') {
      throwIfNotAllowed(
        teamMember,
        `ai_${resource.slice(0, -1)}` as any,
        'create'
      );
      const input = validateWithSchema(createAiResourceSchema, req.body);
      if (
        resource === 'notebooks' &&
        input.content !== undefined &&
        typeof input.content !== 'object'
      ) {
        throw new ApiError(
          422,
          'Notebook content must be a JSON object or array.'
        );
      }
      if (resource === 'notebooks' && input.workspaceId) {
        const workspace = await getAiResource(
          'workspaces',
          projectId,
          input.workspaceId
        );
        if (!workspace)
          throw new ApiError(422, 'Workspace does not belong to this project.');
      }
      const data = await createAiResource(resource, projectId, input as any);
      return res.status(201).json({ data });
    }

    res.setHeader('Allow', ['GET', 'POST']);
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
