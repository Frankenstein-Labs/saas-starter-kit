import type { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import fetcher from '@/lib/fetcher';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  _count: {
    workspaces: number;
    notebooks: number;
    datasets: number;
    models: number;
    trainingJobs: number;
    deployments: number;
  };
};

const Projects: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const slug = router.query.slug as string;
  const endpoint = `/api/teams/${slug}/projects`;
  const { data, error, isLoading, mutate } = useSWR<{ data: Project[] }>(
    slug ? endpoint : null,
    fetcher
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || t('unknown-error'));
      }
      setName('');
      setDescription('');
      await mutate();
      toast.success(t('ai-project-created'));
    } catch (createError: any) {
      toast.error(createError.message);
    } finally {
      setIsCreating(false);
    }
  };

  const projects = data?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">{t('ai-cloud')}</p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('ai-projects')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('ai-projects-description')}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t('compute-status')}</p>
          <p>{t('no-compute-available')}</p>
        </div>
      </div>

      <form
        onSubmit={createProject}
        className="max-w-2xl space-y-4 rounded-lg border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('create-ai-project')}
        </h2>
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="project-name"
          >
            {t('name')}
          </label>
          <input
            id="project-name"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder={t('project-name-placeholder')}
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="project-description"
          >
            {t('project-description')}
          </label>
          <textarea
            id="project-description"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            placeholder={t('project-placeholder')}
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? t('creating') : t('create-project')}
        </button>
      </form>

      {isLoading && (
        <p className="text-sm text-gray-500">{t('loading-projects')}</p>
      )}
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {!isLoading && !error && projects.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
          {t('no-ai-projects')}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-lg border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  href={`/teams/${slug}/projects/${project.id}`}
                >
                  {project.name}
                </Link>
                <p className="text-xs text-gray-500">/{project.slug}</p>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                {project.status}
              </span>
            </div>
            <p className="mt-3 min-h-10 text-sm text-gray-600 dark:text-gray-300">
              {project.description || t('no-description')}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
              <span>
                {project._count.models} {t('models-count')}
              </span>
              <span>
                {project._count.datasets} {t('datasets-count')}
              </span>
              <span>
                {project._count.notebooks} {t('notebooks-count')}
              </span>
            </div>
          </article>
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

export default Projects;
