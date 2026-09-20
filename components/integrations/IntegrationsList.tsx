/* eslint-disable i18next/no-literal-string */
import React, { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import fetcher from '@/lib/fetcher';

interface IntegrationData {
  id?: string;
  provider: 'GITHUB' | 'HUGGINGFACE' | 'GOOGLE';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  metadata?: any;
}

interface IntegrationsListProps {
  teamSlug: string;
}

export const IntegrationsList: React.FC<IntegrationsListProps> = ({ teamSlug }) => {
  const { data, mutate, isLoading } = useSWR<{ data: IntegrationData[] }>(
    `/api/teams/${teamSlug}/integrations`,
    fetcher
  );

  const [inputToken, setInputToken] = useState<{ [key: string]: string }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  const integrationsMap: Record<string, IntegrationData> = {};
  if (data?.data) {
    data.data.forEach((item) => {
      integrationsMap[item.provider] = item;
    });
  }

  const providers = [
    {
      key: 'GITHUB',
      name: 'GitHub',
      description: 'Connect GitHub Repositories, branches, commits, PRs and sync with projects.',
      placeholder: 'GitHub Access Token or Installation Token',
    },
    {
      key: 'HUGGINGFACE',
      name: 'Hugging Face',
      description: 'Connect Hugging Face Models, Datasets and Inference API.',
      placeholder: 'Hugging Face Access Token (hf_...)',
    },
    {
      key: 'GOOGLE',
      name: 'Google / Colab',
      description: 'Google Drive notebook sync (.ipynb) and Open in Colab links.',
      placeholder: 'Google Drive Access Token',
    },
  ];

  const handleConnect = async (provider: string) => {
    const token = inputToken[provider];
    if (!token) {
      toast.error('Please enter a valid token');
      return;
    }

    setSaving((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`/api/teams/${teamSlug}/integrations/${provider.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();
      if (res.ok && result.testResult?.success) {
        toast.success(`${provider} connected successfully!`);
        setInputToken((prev) => ({ ...prev, [provider]: '' }));
        mutate();
      } else {
        toast.error(result.testResult?.message || result.error?.message || 'Connection failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error connecting provider');
    } finally {
      setSaving((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleTest = async (provider: string) => {
    setTesting((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`/api/teams/${teamSlug}/integrations/${provider.toLowerCase()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const result = await res.json();
      if (res.ok && result.testResult?.success) {
        toast.success(`${provider} connection test passed!`);
        mutate();
      } else {
        toast.error(result.testResult?.message || result.error?.message || 'Test failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Test error');
    } finally {
      setTesting((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    try {
      const res = await fetch(`/api/teams/${teamSlug}/integrations/${provider.toLowerCase()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`${provider} disconnected`);
        mutate();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (err: any) {
      toast.error(err.message || 'Disconnect error');
    }
  };

  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading integrations...</div>;
  }

  return (
    <div className="space-y-6">
      {providers.map((p) => {
        const current = integrationsMap[p.key] || {
          provider: p.key as any,
          status: 'NOT_CONFIGURED',
        };
        const isConnected = current.status === 'CONNECTED';

        return (
          <div
            key={p.key}
            className="border rounded-lg p-6 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {p.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {p.description}
                </p>
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isConnected
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : current.status === 'ERROR'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : current.status === 'UNAVAILABLE'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {current.status}
                </span>
              </div>
            </div>

            {current.metadata?.message && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {current.metadata.message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {!isConnected && (
                <input
                  type="password"
                  placeholder={p.placeholder}
                  value={inputToken[p.key] || ''}
                  onChange={(e) =>
                    setInputToken((prev) => ({ ...prev, [p.key]: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border rounded-md text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                />
              )}

              <div className="flex items-center gap-2">
                {!isConnected ? (
                  <button
                    onClick={() => handleConnect(p.key)}
                    disabled={saving[p.key]}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    {saving[p.key] ? 'Connecting...' : 'Connect'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleTest(p.key)}
                      disabled={testing[p.key]}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      {testing[p.key] ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(p.key)}
                      className="btn-danger text-sm px-4 py-2"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
