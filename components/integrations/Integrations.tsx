import React, { useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'next-i18next';
import { Card } from '@/components/shared';
import fetcher from '@/lib/fetcher';

interface Integration {
  provider: 'github' | 'huggingface' | 'google_colab';
  status: 'CONFIGURED' | 'UNVERIFIED' | 'NOT_CONFIGURED' | 'ERROR';
  config?: any;
}

interface IntegrationsProps {
  teamSlug: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  github: 'GitHub',
  huggingface: 'Hugging Face',
  google_colab: 'Google Colab',
};

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  github: 'Connect GitHub repositories to track source code and trigger workflows.',
  huggingface: 'Connect Hugging Face to browse models and run inference API.',
  google_colab: 'Connect Google Drive to create, edit, and launch Colab notebooks.',
};

export const Integrations: React.FC<IntegrationsProps> = ({ teamSlug }) => {
  const { t } = useTranslation('common');
  const { data, mutate, isLoading } = useSWR(`/api/teams/${teamSlug}/integrations`, fetcher);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const integrations: Integration[] = data?.data || [];

  const handleSave = async (provider: string) => {
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamSlug}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, token: tokenInput }),
      });
      setSelectedProvider(null);
      setTokenInput('');
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await fetch(`/api/teams/${teamSlug}/integrations?provider=${provider}`, {
        method: 'DELETE',
      });
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <Card.Body>Loading integrations...</Card.Body>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>{t('integrations')}</Card.Title>
          <Card.Description>
            {t('manage-integrations')}
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <div className="divide-y divide-gray-200">
            {['github', 'huggingface', 'google_colab'].map((provider) => {
              const integration = integrations.find((i) => i.provider === provider);
              const status = integration?.status || 'NOT_CONFIGURED';

              return (
                <div key={provider} className="py-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {PROVIDER_NAMES[provider]}
                    </h4>
                    <p className="text-sm text-gray-500">{PROVIDER_DESCRIPTIONS[provider]}</p>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status === 'CONFIGURED'
                            ? 'bg-green-100 text-green-800'
                            : status === 'UNVERIFIED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  <div>
                    {selectedProvider === provider ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="password"
                          placeholder="Enter Access Token / API Key"
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm dark:bg-gray-800"
                        />
                        <button
                          onClick={() => handleSave(provider)}
                          disabled={saving}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          {t('save')}
                        </button>
                        <button
                          onClick={() => setSelectedProvider(null)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedProvider(provider)}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 dark:text-gray-200 rounded text-sm hover:bg-gray-50"
                        >
                          {status === 'NOT_CONFIGURED' ? t('connect') : t('configure')}
                        </button>
                        {status !== 'NOT_CONFIGURED' && (
                          <button
                            onClick={() => handleDisconnect(provider)}
                            className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
                          >
                            {t('disconnect')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};
