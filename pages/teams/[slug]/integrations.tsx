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
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );
  const [formInputs, setFormInputs] = useState<Record<string, string>>({});

  const integrations = integrationsData?.data || [];

  const handleConnect = async (provider: string) => {
    try {
      await fetch(`/api/teams/${slug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials: formInputs }),
      });
      setConnectingProvider(null);
      setFormInputs({});
      mutate();
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
        team={{ slug } as any}
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
                              setFormInputs({
                                ...formInputs,
                                appId: e.target.value,
                              })
                            }
                          />
                          <textarea
                            placeholder="Private Key (PEM)"
                            className="textarea textarea-bordered w-full text-sm"
                            onChange={(e) =>
                              setFormInputs({
                                ...formInputs,
                                privateKey: e.target.value,
                              })
                            }
                          />
                          <input
                            type="text"
                            placeholder="Installation ID"
                            className="input input-bordered w-full text-sm"
                            onChange={(e) =>
                              setFormInputs({
                                ...formInputs,
                                installationId: e.target.value,
                              })
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
                            setFormInputs({
                              ...formInputs,
                              accessToken: e.target.value,
                            })
                          }
                        />
                      )}
                      {provider === 'google' && (
                        <input
                          type="password"
                          placeholder="Google OAuth Token"
                          className="input input-bordered w-full text-sm"
                          onChange={(e) =>
                            setFormInputs({
                              ...formInputs,
                              accessToken: e.target.value,
                            })
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
