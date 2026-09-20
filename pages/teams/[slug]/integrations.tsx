/* eslint-disable i18next/no-literal-string */
import { Error, Loading } from '@/components/shared';
import { TeamTab } from '@/components/team';
import { IntegrationsList } from '@/components/integrations/IntegrationsList';
import env from '@/lib/env';
import useTeam from 'hooks/useTeam';
import type { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { TeamFeature } from 'types';

const IntegrationsPage = ({ teamFeatures }: { teamFeatures: TeamFeature }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!team) {
    return <Error message={t('team-not-found')} />;
  }

  return (
    <>
      <TeamTab activeTab="integrations" team={team} teamFeatures={teamFeatures} />
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
            Platform Integrations
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Connect external services to your AI Cloud platform. Securely configure GitHub, Hugging Face, and Google Drive / Colab.
          </p>
        </div>
        <IntegrationsList teamSlug={team.slug} />
      </div>
    </>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      teamFeatures: env.teamFeatures,
    },
  };
}

export default IntegrationsPage;
