import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations();

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t('home.hero')}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t('home.sub')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">{t('home.cta')}</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              {t('nav.login')}
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('home.feature1Title')}</CardTitle>
            <CardDescription>{t('home.feature1Body')}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('home.feature2Title')}</CardTitle>
            <CardDescription>{t('home.feature2Body')}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('home.feature3Title')}</CardTitle>
            <CardDescription>{t('home.feature3Body')}</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
