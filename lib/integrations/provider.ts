import type { IntegrationProvider, IntegrationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PrismaSecretVault } from '@/lib/ml/secret-vault';
import { GitHubClient } from './github';
import { HuggingFaceClient } from './huggingface';
import { GoogleColabClient } from './colab';
import type { IntegrationClient, IntegrationTestResult } from './types';

export function getIntegrationClient(provider: IntegrationProvider): IntegrationClient {
  switch (provider) {
    case 'GITHUB':
      return new GitHubClient();
    case 'HUGGINGFACE':
      return new HuggingFaceClient();
    case 'GOOGLE':
      return new GoogleColabClient();
    default:
      throw new Error(`Unsupported integration provider: ${provider}`);
  }
}

export async function testIntegrationCredentials(
  provider: IntegrationProvider,
  credentials: Record<string, any>
): Promise<IntegrationTestResult> {
  const client = getIntegrationClient(provider);
  return client.testConnection(credentials);
}

export async function saveTeamIntegration(
  teamId: string,
  provider: IntegrationProvider,
  credentials: Record<string, any>
) {
  const testResult = await testIntegrationCredentials(provider, credentials);
  const status: IntegrationStatus = testResult.success ? 'CONNECTED' : 'ERROR';

  const vault = new PrismaSecretVault();
  const secretName = `integration_${provider.toLowerCase()}`;

  if (testResult.success) {
    await vault.put({ teamId }, secretName, JSON.stringify(credentials));
  }

  const integration = await prisma.integration.upsert({
    where: {
      teamId_provider: {
        teamId,
        provider,
      },
    },
    update: {
      status,
      metadata: {
        lastTestedAt: new Date().toISOString(),
        message: testResult.message,
        details: testResult.details || null,
      },
    },
    create: {
      teamId,
      provider,
      status,
      metadata: {
        lastTestedAt: new Date().toISOString(),
        message: testResult.message,
        details: testResult.details || null,
      },
    },
  });

  return { integration, testResult };
}

export async function disconnectTeamIntegration(
  teamId: string,
  provider: IntegrationProvider
) {
  const vault = new PrismaSecretVault();
  const secretName = `integration_${provider.toLowerCase()}`;
  await vault.revoke({ teamId }, secretName);

  return prisma.integration.upsert({
    where: {
      teamId_provider: {
        teamId,
        provider,
      },
    },
    update: {
      status: 'DISCONNECTED',
      metadata: {
        disconnectedAt: new Date().toISOString(),
        message: 'Integration disconnected by user.',
      },
    },
    create: {
      teamId,
      provider,
      status: 'DISCONNECTED',
      metadata: {
        disconnectedAt: new Date().toISOString(),
        message: 'Integration disconnected by user.',
      },
    },
  });
}

export async function getTeamIntegrationCredentials(
  teamId: string,
  provider: IntegrationProvider
): Promise<Record<string, any> | null> {
  const vault = new PrismaSecretVault();
  const secretName = `integration_${provider.toLowerCase()}`;
  const raw = await vault.get({ teamId }, secretName);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { token: raw };
  }
}
