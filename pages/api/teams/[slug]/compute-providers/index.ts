import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { validateWithSchema } from '@/lib/zod';
import { throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import {
  createComputeProvider,
  listComputeProviders,
} from 'models/computeProvider';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['PLATFORM', 'USER', 'EXTERNAL']),
  metadata: z.record(z.string().max(500)).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);
    if (req.method === 'GET') {
      throwIfNotAllowed(teamMember, 'ai_compute', 'read');
      return res
        .status(200)
        .json({ data: await listComputeProviders(teamMember.team.id) });
    }
    if (req.method === 'POST') {
      throwIfNotAllowed(teamMember, 'ai_compute', 'create');
      const input = validateWithSchema(createSchema, req.body);
      const data = await createComputeProvider({
        teamId: teamMember.team.id,
        ...input,
      });
      return res.status(201).json({ data });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res
      .status(405)
      .json({ error: { message: `Method ${req.method} Not Allowed` } });
  } catch (error: any) {
    const status =
      error instanceof ApiError ? error.status : error.status || 500;
    return res
      .status(status)
      .json({ error: { message: error.message || 'Something went wrong' } });
  }
}
