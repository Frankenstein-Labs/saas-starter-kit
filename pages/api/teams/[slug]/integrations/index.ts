import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUserWithTeam, throwIfNoTeamAccess } from 'models/team';
import { throwIfNotAllowed } from 'models/user';
import { prisma } from '@/lib/prisma';
import { secretVault } from '@/lib/ml/secret-vault';
import { githubClient, huggingFaceClient, googleColabClient } from '@/lib/integrations';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await throwIfNoTeamAccess(req, res);

    switch (req.method) {
      case 'GET':
        await handleGET(req, res);
        break;
      case 'POST':
        await handlePOST(req, res);
        break;
      case 'DELETE':
        await handleDELETE(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, DELETE');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

// Get integrations status for the team
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithTeam(req, res);
  throwIfNotAllowed(user, 'ai_integration', 'read');

  const integrations = await prisma.integration.findMany({
    where: { teamId: user.team.id },
  });

  const providers = ['github', 'huggingface', 'google_colab'];
  const data = await Promise.all(
    providers.map(async (provider) => {
      const found = integrations.find((i) => i.provider === provider);
      let status = found ? found.status : 'NOT_CONFIGURED';

      if (provider === 'github') {
        status = await githubClient.getStatus(user.team.id);
      } else if (provider === 'huggingface') {
        status = await huggingFaceClient.getStatus(user.team.id);
      } else if (provider === 'google_colab') {
        status = await googleColabClient.getStatus(user.team.id);
      }

      return {
        provider,
        status,
        config: found?.config || null,
        updatedAt: found?.updatedAt || null,
      };
    })
  );

  res.status(200).json({ data });
};

// Configure / save integration credentials or token
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithTeam(req, res);
  throwIfNotAllowed(user, 'ai_integration', 'create');

  const { provider, token, config } = req.body;

  if (!provider || !['github', 'huggingface', 'google_colab'].includes(provider)) {
    return res.status(400).json({ error: { message: 'Invalid or missing provider' } });
  }

  if (token) {
    const secretName = `${provider}_token`;
    await secretVault.put(user.team.id, secretName, token);
  }

  const status = token ? 'CONFIGURED' : 'UNVERIFIED';

  const integration = await prisma.integration.upsert({
    where: {
      teamId_provider: {
        teamId: user.team.id,
        provider,
      },
    },
    update: {
      status,
      config: config || {},
    },
    create: {
      teamId: user.team.id,
      provider,
      status,
      config: config || {},
    },
  });

  res.status(200).json({ data: integration });
};

// Delete/Disconnect integration
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await getCurrentUserWithTeam(req, res);
  throwIfNotAllowed(user, 'ai_integration', 'delete');

  const { provider } = req.query;

  if (!provider || typeof provider !== 'string') {
    return res.status(400).json({ error: { message: 'Provider parameter required' } });
  }

  await prisma.integration.deleteMany({
    where: {
      teamId: user.team.id,
      provider,
    },
  });

  await secretVault.revoke(user.team.id, `${provider}_token`);

  res.status(200).json({ data: { success: true } });
};
