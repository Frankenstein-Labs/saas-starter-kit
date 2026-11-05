import { useState } from 'react';
import { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import TeamTab from '@/components/team/TeamTab';
import AppShell from '@/components/shared/shell/AppShell';

export default function IntegrationsPage({ slug }: { slug: string }) {
  const { t } = useTranslation('common');
  const { data: integrationsData, mutate } = useSWR(
    `/api/teams/${slug}/integrations`,
    fetcher
  );
  const { data: teamData } = useSWR(`/api/teams/${slug}`, fetcher);
  const { data: projectsData, mutate: mutateProjects } = useSWR(
    `/api/teams/${slug}/projects`,
    fetcher
  );

  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );
  const [providerInputs, setProviderInputs] = useState<
    Record<string, Record<string, string>>
  >({});
  const [newProjectName, setNewProjectName] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [isLinkingRepo, setIsLinkingRepo] = useState(false);

  const integrations = integrationsData?.data || [];
  const team = teamData?.data || { name: slug, slug };
  const projects = projectsData?.data || [];

  const handleConnect = async (provider: string) => {
    try {
      const credentials = providerInputs[provider] || {};
      await fetch(`/api/teams/${slug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials }),
      });
      setConnectingProvider(null);
      setProviderInputs((prev) => ({ ...prev, [provider]: {} }));
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newRepoName) return;
    try {
      await fetch(`/api/teams/${slug}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          repository: {
            id: newRepoName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: newRepoName,
            provider: 'github',
          },
        }),
      });
      setNewProjectName('');
      setNewRepoName('');
      setIsLinkingRepo(false);
      mutateProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await fetch(`/api/teams/${slug}/integrations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell>
      <TeamTab
        activeTab="integrations"
        team={team as any}
        teamFeatures={{
          sso: true,
          dsync: true,
          auditLog: true,
          webhook: true,
          apiKey: true,
          payments: true,
          deleteTeam: true,
        }}
      />
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <h1 className="text-2xl font-bold">
          {t('platform-integrations', 'Platform Integrations')}
        </h1>
        <p className="text-gray-500">
          {t(
            'platform-integrations-desc',
            'Manage team-scoped platform integrations for GitHub, Hugging Face, and Google Colab.'
          )}
        </p>

        <div className="grid grid-cols-1 gap-6">
          {['github', 'huggingface', 'google'].map((provider) => {
            const item = integrations.find(
              (i: any) => i.provider === provider
            ) || {
              provider,
              status: 'NOT_CONFIGURED',
            };

            return (
              <div
                key={provider}
                className="border rounded-lg p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold capitalize">
                      {provider}
                    </h2>
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 uppercase">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {provider === 'github' &&
                      t(
                        'github-desc',
                        'Connect GitHub App for repository synchronization.'
                      )}
                    {provider === 'huggingface' &&
                      t(
                        'hf-desc',
                        'Connect Hugging Face for models, datasets, and inference.'
                      )}
                    {provider === 'google' &&
                      t(
                        'google-desc',
                        'Connect Google Drive for Jupyter Notebooks and Colab links.'
                      )}
                  </p>
                </div>

                <div className="mt-4">
                  {connectingProvider === provider ? (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-md">
                      {provider === 'github' && (
                        <>
                          <input
                            type="text"
                            placeholder="App ID"
                            className="input input-bordered w-full text-sm"
                            onChange={(e) =>
                              setProviderInputs((prev) => ({
                                ...prev,
                                [provider]: {
                                  ...(prev[provider] || {}),
                                  appId: e.target.value,
                                },
                              }))
                            }
                          />
                          <textarea
                            placeholder="Private Key (PEM)"
                            className="textarea textarea-bordered w-full text-sm"
                            onChange={(e) =>
                              setProviderInputs((prev) => ({
                                ...prev,
                                [provider]: {
                                  ...(prev[provider] || {}),
                                  privateKey: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            type="text"
                            placeholder="Installation ID"
                            className="input input-bordered w-full text-sm"
                            onChange={(e) =>
                              setProviderInputs((prev) => ({
                                ...prev,
                                [provider]: {
                                  ...(prev[provider] || {}),
                                  installationId: e.target.value,
                                },
                              }))
                            }
                          />
                        </>
                      )}
                      {provider === 'huggingface' && (
                        <input
                          type="password"
                          placeholder="User Access Token"
                          className="input input-bordered w-full text-sm"
                          onChange={(e) =>
                            setProviderInputs((prev) => ({
                              ...prev,
                              [provider]: {
                                ...(prev[provider] || {}),
                                accessToken: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                      {provider === 'google' && (
                        <input
                          type="password"
                          placeholder="Google OAuth Token"
                          className="input input-bordered w-full text-sm"
                          onChange={(e) =>
                            setProviderInputs((prev) => ({
                              ...prev,
                              [provider]: {
                                ...(prev[provider] || {}),
                                accessToken: e.target.value,
                              },
                            }))
                          }
                        />
                      )}
                      <div className="flex space-x-2">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConnect(provider)}
                        >
                          {t('save-connect', 'Save & Connect')}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConnectingProvider(null)}
                        >
                          {t('cancel', 'Cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      {item.status === 'CONNECTED' ? (
                        <button
                          className="btn btn-outline btn-error btn-sm"
                          onClick={() => handleDisconnect(provider)}
                        >
                          {t('disconnect', 'Disconnect')}
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setConnectingProvider(provider)}
                        >
                          {t('configure', 'Configure')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Project & Repository Linking Section ("Connecter le dépôt") */}
        <div className="mt-12 border-t pt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">
                {t('project-repositories', 'Linked Repositories & Projects')}
              </h2>
              <p className="text-sm text-gray-500">
                {t(
                  'link-repo-desc',
                  'Associate external GitHub repositories with specific projects.'
                )}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsLinkingRepo(!isLinkingRepo)}
            >
              {t('connect-repo', 'Connecter le dépôt')}
            </button>
          </div>

          {isLinkingRepo && (
            <form
              onSubmit={handleLinkRepository}
              className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3"
            >
              <h3 className="text-sm font-semibold">
                {t('link-new-repo', 'Connect a repository to a project')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder={t(
                    'project-name',
                    'Project Name (e.g. My AI App)'
                  )}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input input-bordered w-full text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder={t(
                    'repo-name',
                    'GitHub Repository (e.g. org/repo)'
                  )}
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="input input-bordered w-full text-sm"
                />
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary btn-sm">
                  {t('connect', 'Connect')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsLinkingRepo(false)}
                >
                  {t('cancel', 'Cancel')}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y border rounded-lg">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {t(
                  'no-linked-repos',
                  'No projects or repositories linked yet.'
                )}
              </div>
            ) : (
              projects.map((proj: any) => (
                <div
                  key={proj.id}
                  className="p-4 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-semibold text-sm">{proj.name}</h4>
                    {proj.repositories && proj.repositories.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {proj.repositories.map((repo: any) => (
                          <span
                            key={repo.id}
                            className="badge badge-outline text-xs"
                          >
                            {repo.provider}: {repo.repoName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {t('no-repos', 'No repository connected')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export async function getServerSideProps({
  locale,
  params,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
      slug: params?.slug,
    },
  };
}
