import { SignIn } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <SignIn
        path={`/${locale}/login`}
        routing="path"
        signUpUrl={`/${locale}/signup`}
        fallbackRedirectUrl={`/${locale}/dashboard`}
      />
    </main>
  );
}
