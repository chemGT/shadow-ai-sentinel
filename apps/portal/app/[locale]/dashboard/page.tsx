import { getTranslations, setRequestLocale } from 'next-intl/server';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? '';

  return (
    <main className="min-h-screen bg-muted/30 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <UserButton />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{t('welcome')}</CardTitle>
            <CardDescription>
              {t('signedInAs', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              {t('placeholder')}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
