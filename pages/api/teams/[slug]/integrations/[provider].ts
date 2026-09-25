import type { NextApiRequest, NextApiResponse } from 'next';
import { IntegrationProvider } from '@prisma/client';
import { ApiError } from '@/lib/errors';
import { throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import {
  saveTeamIntegration,
  disconnectTeamIntegration,
  getTeamIntegrationCredentials,
  testIntegrationCredentials,
} from '@/lib/integrations/provider';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const teamMember = await throwIfNoTeamAccess(req, res);
    const providerParam = String(req.query.provider).toUpperCase();

    if (!(providerParam in IntegrationProvider)) {
      throw new ApiError(400, `Invalid integration provider: ${req.query.provider}`);
    }

    const provider = providerParam as IntegrationProvider;

    if (req.method === 'POST') {
      throwIfNotAllowed(teamMember, 'ai_integration', 'create');
      const credentials = typeof req.body === 'object' ? req.body : {};
      const { integration, testResult } = await saveTeamIntegration(
        teamMember.team.id,
        provider,
        credentials
      );
      return res.status(200).json({ data: integration, testResult });
    }

    if (req.method === 'PUT') {
      throwIfNotAllowed(teamMember, 'ai_integration', 'update');
      const existingCredentials = await getTeamIntegrationCredentials(
        teamMember.team.id,
        provider
      );

      if (!existingCredentials) {
        throw new ApiError(404, `No stored credentials found for ${provider}`);
      }

      const testResult = await testIntegrationCredentials(
        provider,
        existingCredentials
      );

      return res.status(200).json({ testResult });
    }

    if (req.method === 'DELETE') {
      throwIfNotAllowed(teamMember, 'ai_integration', 'delete');
      const integration = await disconnectTeamIntegration(
        teamMember.team.id,
        provider
      );
      return res.status(200).json({ data: integration });
    }

    res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
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
