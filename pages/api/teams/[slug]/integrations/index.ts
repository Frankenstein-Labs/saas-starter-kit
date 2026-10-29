import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { PrismaSecretVault } from '@/lib/secret-vault';
import { GitHubAppProvider } from '@/lib/integrations/github';
import { HuggingFaceProvider } from '@/lib/integrations/huggingface';
import { GoogleColabProvider } from '@/lib/integrations/google-colab';
import { IntegrationStatus } from '@/lib/integrations/provider';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    const session = await getSession(req, res);
    if (!session || !session.user) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const { slug } = req.query;
    if (typeof slug !== 'string') {
      return res.status(400).json({ error: { message: 'Invalid team slug' } });
    }

    const team = await prisma.team.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!team) {
      return res.status(404).json({ error: { message: 'Team not found' } });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: team.id,
          userId: session.user.id,
        },
      },
    });

    if (!teamMember) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const vault = new PrismaSecretVault();

    switch (method) {
      case 'GET': {
        const dbIntegrations = await prisma.integration.findMany({
          where: { teamId: team.id },
        });

        const providers = ['github', 'huggingface', 'google'];
        const integrations = await Promise.all(
          providers.map(async (providerName) => {
            const dbIntegration = dbIntegrations.find(
              (i) => i.provider === providerName
            );
            let status =
              dbIntegration?.status || IntegrationStatus.NOT_CONFIGURED;

            if (providerName === 'github') {
              const appId = await vault.get({
                teamId: team.id,
                name: 'GITHUB_APP_ID',
              });
              const privateKey = await vault.get({
                teamId: team.id,
                name: 'GITHUB_PRIVATE_KEY',
              });
              const installationId = await vault.get({
                teamId: team.id,
                name: 'GITHUB_INSTALLATION_ID',
              });

              const ghProvider = new GitHubAppProvider({
                teamId: team.id,
                provider: 'github',
                appConfig:
                  appId && privateKey && installationId
                    ? { appId, privateKey, installationId }
                    : undefined,
              });
              status = await ghProvider.getStatus();
            } else if (providerName === 'huggingface') {
              const accessToken = await vault.get({
                teamId: team.id,
                name: 'HF_ACCESS_TOKEN',
              });
              const hfProvider = new HuggingFaceProvider({
                teamId: team.id,
                provider: 'huggingface',
                hfConfig: accessToken ? { accessToken } : undefined,
              });
              status = await hfProvider.getStatus();
            } else if (providerName === 'google') {
              const accessToken = await vault.get({
                teamId: team.id,
                name: 'GOOGLE_ACCESS_TOKEN',
              });
              const gProvider = new GoogleColabProvider({
                teamId: team.id,
                provider: 'google',
                googleConfig: accessToken ? { accessToken } : undefined,
              });
              status = await gProvider.getStatus();
            }

            return {
              provider: providerName,
              status,
              updatedAt: dbIntegration?.updatedAt || null,
            };
          })
        );

        return res.status(200).json({ data: integrations });
      }

      case 'POST': {
        const { provider, credentials } = req.body;
        if (!provider || !credentials) {
          return res.status(400).json({
            error: { message: 'Provider and credentials are required' },
          });
        }

        if (provider === 'github') {
          if (credentials.appId)
            await vault.put({
              teamId: team.id,
              name: 'GITHUB_APP_ID',
              value: credentials.appId,
            });
          if (credentials.privateKey)
            await vault.put({
              teamId: team.id,
              name: 'GITHUB_PRIVATE_KEY',
              value: credentials.privateKey,
            });
          if (credentials.installationId)
            await vault.put({
              teamId: team.id,
              name: 'GITHUB_INSTALLATION_ID',
              value: credentials.installationId,
            });
        } else if (provider === 'huggingface') {
          if (credentials.accessToken)
            await vault.put({
              teamId: team.id,
              name: 'HF_ACCESS_TOKEN',
              value: credentials.accessToken,
            });
        } else if (provider === 'google') {
          if (credentials.accessToken)
            await vault.put({
              teamId: team.id,
              name: 'GOOGLE_ACCESS_TOKEN',
              value: credentials.accessToken,
            });
        }

        await prisma.integration.upsert({
          where: { teamId_provider: { teamId: team.id, provider } },
          create: {
            teamId: team.id,
            provider,
            status: IntegrationStatus.CONNECTED,
          },
          update: { status: IntegrationStatus.CONNECTED },
        });

        return res
          .status(200)
          .json({ data: { message: 'Integration connected successfully' } });
      }

      case 'DELETE': {
        const { provider } = req.body;
        if (!provider) {
          return res
            .status(400)
            .json({ error: { message: 'Provider is required' } });
        }

        if (provider === 'github') {
          await vault.revoke({ teamId: team.id, name: 'GITHUB_APP_ID' });
          await vault.revoke({ teamId: team.id, name: 'GITHUB_PRIVATE_KEY' });
          await vault.revoke({
            teamId: team.id,
            name: 'GITHUB_INSTALLATION_ID',
          });
        } else if (provider === 'huggingface') {
          await vault.revoke({ teamId: team.id, name: 'HF_ACCESS_TOKEN' });
        } else if (provider === 'google') {
          await vault.revoke({ teamId: team.id, name: 'GOOGLE_ACCESS_TOKEN' });
        }

        await prisma.integration.upsert({
          where: { teamId_provider: { teamId: team.id, provider } },
          create: {
            teamId: team.id,
            provider,
            status: IntegrationStatus.DISCONNECTED,
          },
          update: { status: IntegrationStatus.DISCONNECTED },
        });

        return res
          .status(200)
          .json({ data: { message: 'Integration disconnected successfully' } });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res
          .status(405)
          .json({ error: { message: `Method ${method} Not Allowed` } });
    }
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: { message: error.message || 'Internal Server Error' } });
  }
}
