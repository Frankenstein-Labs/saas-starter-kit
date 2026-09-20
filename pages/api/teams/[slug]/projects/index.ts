import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { throwIfNotAllowed } from 'models/user';
import { throwIfNoTeamAccess } from 'models/team';
import { createProject, getProjects } from 'models/project';
import { slugify } from '@/lib/server-common';
import { validateWithSchema } from '@/lib/zod';

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
});

const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);

    if (req.method === 'GET') {
      throwIfNotAllowed(teamMember, 'ai_project', 'read');
      const { page, pageSize } = validateWithSchema(
        listProjectsSchema,
        req.query
      );
      const { data, total } = await getProjects(teamMember.team.id, {
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
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
      throwIfNotAllowed(teamMember, 'ai_project', 'create');
      const input = validateWithSchema(createProjectSchema, req.body);
      const slug = slugify(input.slug || input.name);

      if (!slug) {
        throw new ApiError(422, 'Project slug cannot be empty.');
      }

      const project = await createProject({
        teamId: teamMember.team.id,
        ownerId: teamMember.user.id,
        name: input.name,
        slug,
        description: input.description,
      });

      return res.status(201).json({ data: project });
    }

    res.setHeader('Allow', ['GET', 'POST']);
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
