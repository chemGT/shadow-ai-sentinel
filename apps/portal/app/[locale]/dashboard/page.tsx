import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// TODO S1-I9b: require Clerk auth via clerkMiddleware route matcher
// For now the page is publicly accessible to allow UI development without Clerk credentials.

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardContent />;
}

function DashboardContent() {
  const t = useTranslations('dashboard');
  return (
    <main className="min-h-screen bg-muted/30 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('welcome')}</CardTitle>
            <CardDescription>{t('placeholder')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              ⚠️ {t('todoAuth')}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
