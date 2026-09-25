import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '@/lib/errors';
import { throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { getIntegrations } from 'models/integration';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);

    if (req.method === 'GET') {
      throwIfNotAllowed(teamMember, 'ai_integration', 'read');
      const data = await getIntegrations(teamMember.team.id);
      return res.status(200).json({ data });
    }

    res.setHeader('Allow', ['GET']);
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
