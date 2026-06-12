import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// TODO S1-I9b: replace placeholder with <SignUp /> from @clerk/nextjs

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignupContent />;
}

function SignupContent() {
  const t = useTranslations('auth');
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('signupTitle')}</CardTitle>
          <CardDescription>{t('comingSoon')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('comingSoonBody')}</p>
          <Link href="/">
            <Button variant="outline">{t('backHome')}</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
