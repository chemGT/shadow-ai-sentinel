import { SignUp } from '@clerk/nextjs';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <SignUp
        path={`/${locale}/signup`}
        routing="path"
        signInUrl={`/${locale}/login`}
        fallbackRedirectUrl={`/${locale}/dashboard`}
      />
    </main>
  );
}
