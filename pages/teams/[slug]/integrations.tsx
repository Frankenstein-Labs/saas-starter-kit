import { ReactElement } from 'react';
import type { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { AccountLayout } from '@/components/layouts';
import TeamTab from '@/components/team/TeamTab';
import { Integrations } from '@/components/integrations';
import { getTeam, throwIfNoTeamAccess } from 'models/team';
import env from '@/lib/env';

export default function TeamIntegrationsPage({ team }: { team: any }) {
  return (
    <div className="space-y-6">
      <TeamTab activeTab="integrations" team={team} teamFeatures={env.teamFeatures} />
      <Integrations teamSlug={team.slug} />
    </div>
  );
}

TeamIntegrationsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, res, locale } = context;
  await throwIfNoTeamAccess(req as any, res as any);

  const team = await getTeam({ slug: context.query.slug as string });

  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
      team,
    },
  };
}
