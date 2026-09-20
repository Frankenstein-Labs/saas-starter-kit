import type { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import type { NextPageWithLayout } from 'types';
import fetcher from '@/lib/fetcher';

type Resource = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  source?: string;
  framework?: string | null;
  format?: string | null;
  _count?: { versions?: number; deployments?: number };
};

const resourceTypes = [
  { key: 'workspaces', label: 'Workspaces', permission: 'ai_workspace' },
  { key: 'notebooks', label: 'Notebooks', permission: 'ai_notebook' },
  { key: 'models', label: 'Models', permission: 'ai_model' },
  { key: 'datasets', label: 'Datasets', permission: 'ai_dataset' },
] as const;

const ResourcePanel = ({
  slug,
  projectId,
  resource,
}: {
  slug: string;
  projectId: string;
  resource: (typeof resourceTypes)[number];
}) => {
  const { t } = useTranslation('common');
  const endpoint = `/api/teams/${slug}/projects/${projectId}/${resource.key}`;
  const { data, error } = useSWR<{ data: Resource[] }>(endpoint, fetcher);

  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {resource.label}
        </h2>
        <span className="text-sm text-gray-500">{data?.data.length ?? 0}</span>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
      {!error && data?.data.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">{t('no-resources-yet')}</p>
      )}
      <ul className="mt-3 space-y-2">
        {data?.data.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm dark:border-gray-700"
          >
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-gray-500">
              {item.status || item.source || item.format || t('configured')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const ProjectDetail: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const slug = router.query.slug as string;
  const projectId = router.query.projectId as string;
  const [name, setName] = useState('');
  const [resourceType, setResourceType] =
    useState<(typeof resourceTypes)[number]['key']>('workspaces');
  const [isCreating, setIsCreating] = useState(false);

  const createResource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const response = await fetch(
        `/api/teams/${slug}/projects/${projectId}/${resourceType}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message || t('unknown-error'));
      setName('');
      await router.replace(router.asPath);
      toast.success(t('ai-resource-created'));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            className="text-sm text-blue-600 hover:underline"
            href={`/teams/${slug}/projects`}
          >
            {t('back-to-ai-projects')}
          </Link>
          <p className="mt-3 text-sm font-medium text-blue-600">
            {t('ai-cloud')}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('project-resources')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('project-resources-description')}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t('notebook-execution')}</p>
          <p>{t('no-compute-available')}</p>
        </div>
      </div>

      <form
        onSubmit={createResource}
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="resource-type"
          >
            {t('resource-type')}
          </label>
          <select
            id="resource-type"
            value={resourceType}
            onChange={(event) =>
              setResourceType(event.target.value as typeof resourceType)
            }
            className="rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            {resourceTypes.map((resource) => (
              <option key={resource.key} value={resource.key}>
                {resource.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-64 flex-1">
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="resource-name"
          >
            {t('name')}
          </label>
          <input
            id="resource-name"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder={t('resource-name-placeholder')}
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? t('creating') : t('create-resource')}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {resourceTypes.map((resource) => (
          <ResourcePanel
            key={resource.key}
            slug={slug}
            projectId={projectId}
            resource={resource}
          />
        ))}
      </div>
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default ProjectDetail;
