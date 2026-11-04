import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

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

    switch (method) {
      case 'GET': {
        const projects = await prisma.project.findMany({
          where: { teamId: team.id },
          include: { repositories: true },
        });

        return res.status(200).json({ data: projects });
      }

      case 'POST': {
        const { name, description, repository } = req.body;
        if (!name) {
          return res
            .status(400)
            .json({ error: { message: 'Project name is required' } });
        }

        const project = await prisma.project.create({
          data: {
            teamId: team.id,
            name,
            description,
            ...(repository
              ? {
                  repositories: {
                    create: {
                      repoId: String(repository.id),
                      repoName: repository.name,
                      provider: repository.provider || 'github',
                    },
                  },
                }
              : {}),
          },
          include: { repositories: true },
        });

        return res.status(201).json({ data: project });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
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
