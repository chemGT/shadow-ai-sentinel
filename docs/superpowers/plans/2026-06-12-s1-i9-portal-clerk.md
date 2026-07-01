# S1-I9: Next.js Portal Skeleton + Clerk Auth EN/FR

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer `apps/portal/` — une app Next.js 15 App Router standalone avec Clerk (email + Google + Microsoft), i18n EN/FR via next-intl, layout shadcn/ui, et étendre le tenantMiddleware Express pour accepter les JWTs Clerk.

**Architecture:** App standalone dans `apps/portal/` (pas de pnpm workspaces), routing `[locale]` (en|fr) géré par next-intl, Clerk comme seul provider d'auth. Le backend vérifie les JWTs Clerk via JWKS + custom claim `tenant_id` (configuré dans un JWT Template Clerk). Les clés API existantes (`sk_live_*`) continuent de fonctionner en parallèle.

**Tech Stack:** Next.js 15 (App Router), @clerk/nextjs ^6, next-intl ^3, Tailwind CSS v4, shadcn/ui (composants inline), jose (JWKS/JWT côté backend Express), Vitest (tests backend uniquement).

---

## File Map

### Nouveaux fichiers — `apps/portal/`

| Fichier | Rôle |
|---|---|
| `apps/portal/package.json` | Dépendances Next.js, Clerk, next-intl, Tailwind |
| `apps/portal/next.config.ts` | Plugin next-intl |
| `apps/portal/tsconfig.json` | Paths + strict |
| `apps/portal/tailwind.config.ts` | Content paths |
| `apps/portal/postcss.config.mjs` | Tailwind plugin |
| `apps/portal/.env.local.example` | Variables Clerk requises |
| `apps/portal/middleware.ts` | Clerk + next-intl routing middleware |
| `apps/portal/i18n/routing.ts` | Définition locales + defaultLocale |
| `apps/portal/i18n/request.ts` | next-intl getRequestConfig |
| `apps/portal/messages/en.json` | Traductions EN |
| `apps/portal/messages/fr.json` | Traductions FR |
| `apps/portal/app/globals.css` | Tailwind base + variables CSS shadcn |
| `apps/portal/app/[locale]/layout.tsx` | Root layout : ClerkProvider + NextIntlClientProvider |
| `apps/portal/app/[locale]/page.tsx` | Home publique avec liens Login/Signup |
| `apps/portal/app/[locale]/(auth)/login/page.tsx` | Clerk SignIn component |
| `apps/portal/app/[locale]/(auth)/signup/page.tsx` | Clerk SignUp component |
| `apps/portal/app/[locale]/dashboard/page.tsx` | Dashboard placeholder (protégé) |
| `apps/portal/components/ui/button.tsx` | Composant Button (shadcn inline) |
| `apps/portal/components/ui/card.tsx` | Composant Card (shadcn inline) |

### Fichiers modifiés — backend

| Fichier | Changement |
|---|---|
| `package.json` (racine) | Ajouter `jose` aux dépendances |
| `src/backend/middleware/tenant.ts` | Chemin Clerk JWT en plus des clés `sk_live_*` |
| `src/backend/tenant-isolation.test.ts` | Tests pour le chemin JWT Clerk |

---

## Task 1 : Scaffold `apps/portal/` — package.json + config

**Files:**
- Create: `apps/portal/package.json`
- Create: `apps/portal/next.config.ts`
- Create: `apps/portal/tsconfig.json`
- Create: `apps/portal/tailwind.config.ts`
- Create: `apps/portal/postcss.config.mjs`
- Create: `apps/portal/.env.local.example`

- [ ] **Créer `apps/portal/package.json`**

```json
{
  "name": "@shadow-ai/portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.19.4",
    "next": "15.3.3",
    "next-intl": "^3.26.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.5",
    "tailwindcss": "^3.4.17",
    "typescript": "^6"
  }
}
```

- [ ] **Créer `apps/portal/next.config.ts`**

```ts
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withNextIntl(nextConfig);
```

- [ ] **Créer `apps/portal/tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Créer `apps/portal/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './i18n/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Créer `apps/portal/postcss.config.mjs`**

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Créer `apps/portal/.env.local.example`**

```env
# Clerk — obtenir sur dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# URLs de redirection Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/en/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/en/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/en/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/en/dashboard
```

- [ ] **Installer les dépendances**

```bash
cd apps/portal && npm install
```

- [ ] **Commit**

```bash
git add apps/portal/package.json apps/portal/next.config.ts apps/portal/tsconfig.json apps/portal/tailwind.config.ts apps/portal/postcss.config.mjs apps/portal/.env.local.example
git commit -m "feat(portal): scaffold Next.js 15 + Clerk + next-intl config [S1-I9]"
```

---

## Task 2 : i18n routing + messages EN/FR

**Files:**
- Create: `apps/portal/i18n/routing.ts`
- Create: `apps/portal/i18n/request.ts`
- Create: `apps/portal/messages/en.json`
- Create: `apps/portal/messages/fr.json`

- [ ] **Créer `apps/portal/i18n/routing.ts`**

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
```

- [ ] **Créer `apps/portal/i18n/request.ts`**

```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'en' | 'fr')) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Créer `apps/portal/messages/en.json`**

```json
{
  "nav": {
    "login": "Login",
    "signup": "Get started",
    "dashboard": "Dashboard"
  },
  "home": {
    "hero": "AI Shadow Protection for your team",
    "sub": "Monitor and control AI tool usage across your organisation.",
    "cta": "Start free trial"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to Shadow AI Sentinel",
    "placeholder": "Your analytics will appear here once events are received."
  },
  "auth": {
    "loginTitle": "Sign in to your account",
    "signupTitle": "Create your account"
  }
}
```

- [ ] **Créer `apps/portal/messages/fr.json`**

```json
{
  "nav": {
    "login": "Connexion",
    "signup": "Démarrer",
    "dashboard": "Tableau de bord"
  },
  "home": {
    "hero": "Protection IA Shadow pour votre équipe",
    "sub": "Surveillez et contrôlez l'usage des outils IA dans votre organisation.",
    "cta": "Démarrer l'essai gratuit"
  },
  "dashboard": {
    "title": "Tableau de bord",
    "welcome": "Bienvenue sur Shadow AI Sentinel",
    "placeholder": "Vos analytics apparaîtront ici dès réception des événements."
  },
  "auth": {
    "loginTitle": "Connexion à votre compte",
    "signupTitle": "Créer votre compte"
  }
}
```

- [ ] **Commit**

```bash
git add apps/portal/i18n/ apps/portal/messages/
git commit -m "feat(portal): next-intl routing + EN/FR messages [S1-I9]"
```

---

## Task 3 : Middleware Clerk + next-intl

**Files:**
- Create: `apps/portal/middleware.ts`

Le middleware combine Clerk (protection des routes) et next-intl (redirection vers locale). Ordre : next-intl d'abord pour le routing, puis Clerk pour la protection.

- [ ] **Créer `apps/portal/middleware.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  '/:locale/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

- [ ] **Commit**

```bash
git add apps/portal/middleware.ts
git commit -m "feat(portal): Clerk + next-intl combined middleware [S1-I9]"
```

---

## Task 4 : Composants UI inline (Button + Card)

**Files:**
- Create: `apps/portal/components/ui/button.tsx`
- Create: `apps/portal/components/ui/card.tsx`
- Create: `apps/portal/app/globals.css`

- [ ] **Créer `apps/portal/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --border: 214.3 31.8% 91.4%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Créer `apps/portal/components/ui/button.tsx`**

```tsx
import * as React from 'react';

type Variant = 'default' | 'outline' | 'ghost';
type Size = 'default' | 'sm' | 'lg';

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:opacity-90',
  outline: 'border border-border bg-background hover:bg-muted',
  ghost: 'hover:bg-muted',
};

const sizeClasses: Record<Size, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3 text-sm',
  lg: 'h-12 px-8 text-lg',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
```

- [ ] **Créer `apps/portal/components/ui/card.tsx`**

```tsx
import * as React from 'react';

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-border bg-background shadow-sm ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props} />
  );
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}
```

- [ ] **Commit**

```bash
git add apps/portal/app/globals.css apps/portal/components/
git commit -m "feat(portal): shadcn-style UI components inline [S1-I9]"
```

---

## Task 5 : Root layout + pages

**Files:**
- Create: `apps/portal/app/[locale]/layout.tsx`
- Create: `apps/portal/app/[locale]/page.tsx`
- Create: `apps/portal/app/[locale]/(auth)/login/page.tsx`
- Create: `apps/portal/app/[locale]/(auth)/signup/page.tsx`
- Create: `apps/portal/app/[locale]/dashboard/page.tsx`

- [ ] **Créer `apps/portal/app/[locale]/layout.tsx`**

```tsx
import '../globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shadow AI Sentinel',
  description: 'AI tool usage protection for your organisation',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'fr')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Créer `apps/portal/app/[locale]/page.tsx`**

```tsx
import { useTranslations } from 'next-intl';
import { Link } from 'next-intl/navigation';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        {t('home.hero')}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t('home.sub')}</p>
      <div className="flex gap-4">
        <Link href="/signup">
          <Button size="lg">{t('home.cta')}</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">{t('nav.login')}</Button>
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Créer `apps/portal/app/[locale]/(auth)/login/page.tsx`**

```tsx
import { SignIn } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('auth');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">{t('loginTitle')}</h1>
      <SignIn />
    </main>
  );
}
```

- [ ] **Créer `apps/portal/app/[locale]/(auth)/signup/page.tsx`**

```tsx
import { SignUp } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';

export default function SignupPage() {
  const t = useTranslations('auth');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">{t('signupTitle')}</h1>
      <SignUp />
    </main>
  );
}
```

- [ ] **Créer `apps/portal/app/[locale]/dashboard/page.tsx`**

```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  return <DashboardContent />;
}

function DashboardContent() {
  const t = useTranslations('dashboard');
  return (
    <main className="min-h-screen bg-muted/30 p-8">
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('welcome')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('placeholder')}</p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Commit**

```bash
git add apps/portal/app/
git commit -m "feat(portal): root layout + home + auth + dashboard pages [S1-I9]"
```

---

## Task 6 : Backend — Clerk JWT verification (jose + JWKS)

Le middleware tenant Express doit accepter deux types de tokens :
1. `sk_live_*` / `sk_test_*` → chemin existant (bcrypt API key)
2. `eyJ...` (JWT) → vérification JWKS Clerk, extraction du claim `tenant_id`

**Prérequis Clerk :** Dans le dashboard Clerk → JWT Templates → créer un template nommé `sentinel` avec claim supplémentaire :
```json
{ "tenant_id": "{{user.public_metadata.tenant_id}}" }
```

**Files:**
- Modify: `package.json` (racine) — ajouter `jose`
- Modify: `src/backend/middleware/tenant.ts` — ajouter chemin JWT
- Modify: `src/backend/config.ts` — ajouter `clerkJwksUrl`

- [ ] **Ajouter `jose` à package.json (racine)**

Dans `package.json` (racine), ajouter dans `"dependencies"` :
```json
"jose": "^5.10.0"
```

Puis : `npm install`

- [ ] **Étendre `src/backend/config.ts`**

Ajouter le champ `clerkJwksUrl` :

```ts
export type ApiConfig = {
  port: number;
  telemetryRetentionDays: number;
  rateLimitPoliciesPerMin: number;
  rateLimitTelemetryPerMin: number;
  corsOrigins: string[] | '*';
  trustProxy: boolean;
  clerkJwksUrl: string | null;
};

export function loadApiConfig(): ApiConfig {
  const retentionDays = Number(process.env.TELEMETRY_RETENTION_DAYS ?? 90);
  const corsRaw = process.env.CORS_ORIGINS?.trim();

  return {
    port: Number(process.env.PORT ?? 3000),
    telemetryRetentionDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 90,
    rateLimitPoliciesPerMin: Number(process.env.RATE_LIMIT_POLICIES_PER_MIN ?? 60),
    rateLimitTelemetryPerMin: Number(process.env.RATE_LIMIT_TELEMETRY_PER_MIN ?? 120),
    corsOrigins: corsRaw && corsRaw.length > 0 ? corsRaw.split(',').map((o) => o.trim()) : '*',
    trustProxy: process.env.TRUST_PROXY === 'true',
    clerkJwksUrl: process.env.CLERK_JWKS_URL ?? null,
  };
}
```

- [ ] **Étendre `src/backend/middleware/tenant.ts`**

Remplacer le contenu complet :

```ts
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getDb } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { getTenantStatus } from '../db/queries.js';

export type TenantContext = {
  tenantId: string;
  scopes: string[];
};

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: TenantContext;
  }
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return _jwks;
}

async function resolveViaClerkJwt(
  token: string,
  jwksUrl: string,
): Promise<TenantContext | null> {
  try {
    const jwks = getJwks(jwksUrl);
    const { payload } = await jwtVerify(token, jwks);
    const tenantId = typeof payload['tenant_id'] === 'string' ? payload['tenant_id'] : null;
    if (!tenantId) return null;
    return { tenantId, scopes: ['telemetry:read', 'telemetry:write', 'policies:read'] };
  } catch {
    return null;
  }
}

async function resolveViaApiKey(
  token: string,
  db: ReturnType<typeof getDb>,
): Promise<TenantContext | null> {
  if (token.length < 12) return null;
  const prefix = token.slice(0, 12);
  const now = new Date();
  const candidates = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, prefix),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
      ),
    );

  const matched = await Promise.all(
    candidates.map(async (k) => ({
      key: k,
      valid: await bcrypt.compare(token, k.keyHash),
    })),
  ).then((results) => results.find((r) => r.valid)?.key ?? null);

  if (!matched) return null;
  return { tenantId: matched.tenantId, scopes: matched.scopes };
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const token = authHeader.slice(7);

  let db;
  try {
    db = getDb();
  } catch {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  let ctx: TenantContext | null = null;

  const isJwt = token.startsWith('eyJ');
  if (isJwt) {
    const jwksUrl = process.env.CLERK_JWKS_URL ?? null;
    if (!jwksUrl) {
      res.status(401).json({ error: 'clerk_not_configured' });
      return;
    }
    ctx = await resolveViaClerkJwt(token, jwksUrl);
  } else {
    ctx = await resolveViaApiKey(token, db);
  }

  if (!ctx) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const status = await getTenantStatus(db, ctx.tenantId);
  if (status === 'suspended' || status === 'canceled') {
    res.status(403).json({ error: 'tenant_suspended' });
    return;
  }

  req.tenant = ctx;
  next();
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant?.scopes.includes(scope)) {
      res.status(403).json({ error: 'insufficient_scope', required: scope });
      return;
    }
    next();
  };
}
```

- [ ] **Commit**

```bash
git add package.json package-lock.json src/backend/middleware/tenant.ts src/backend/config.ts
git commit -m "feat(api): Clerk JWT verification via JWKS in tenantMiddleware [S1-I9]"
```

---

## Task 7 : Tests backend — chemin JWT Clerk

**Files:**
- Modify: `src/backend/tenant-isolation.test.ts`

On mocke `jose` pour tester les deux chemins sans vraie clé Clerk.

- [ ] **Lire le fichier existant `src/backend/tenant-isolation.test.ts`** pour voir les tests existants avant de modifier.

- [ ] **Ajouter les tests JWT à la fin du fichier**

Les tests à ajouter après les tests existants (ne pas supprimer l'existant) :

```ts
// ---- Tests chemin JWT Clerk ----

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: vi.fn(),
}));

import { jwtVerify, createRemoteJWKSet } from 'jose';

describe('tenantMiddleware — Clerk JWT path', () => {
  const VALID_JWT = 'eyJvalid.payload.signature';
  const CLERK_JWKS_URL = 'https://clerk.example.com/.well-known/jwks.json';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_JWKS_URL = CLERK_JWKS_URL;
  });

  afterEach(() => {
    delete process.env.CLERK_JWKS_URL;
  });

  it('JWT valide avec tenant_id → 200 et req.tenant rempli', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { tenant_id: 'tenant-from-jwt', sub: 'user_abc' },
    } as never);
    vi.mocked(getTenantStatus).mockResolvedValue('active');
    vi.mocked(getDb).mockReturnValue({} as never);

    const app = makeApp();
    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${VALID_JWT}`);

    expect(res.status).toBe(200);
    expect(res.body.tenantId).toBe('tenant-from-jwt');
  });

  it('JWT valide mais tenant_id absent → 401', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user_abc' },
    } as never);
    vi.mocked(getDb).mockReturnValue({} as never);

    const res = await request(makeApp())
      .get('/test')
      .set('Authorization', `Bearer ${VALID_JWT}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('JWT invalide (signature) → 401', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('JWSSignatureVerificationFailed'));
    vi.mocked(getDb).mockReturnValue({} as never);

    const res = await request(makeApp())
      .get('/test')
      .set('Authorization', `Bearer ${VALID_JWT}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('CLERK_JWKS_URL absent → 401 clerk_not_configured', async () => {
    delete process.env.CLERK_JWKS_URL;
    vi.mocked(getDb).mockReturnValue({} as never);

    const res = await request(makeApp())
      .get('/test')
      .set('Authorization', `Bearer ${VALID_JWT}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('clerk_not_configured');
  });

  it('JWT valide mais tenant suspendu → 403 tenant_suspended', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { tenant_id: 'tenant-suspended' },
    } as never);
    vi.mocked(getTenantStatus).mockResolvedValue('suspended');
    vi.mocked(getDb).mockReturnValue({} as never);

    const res = await request(makeApp())
      .get('/test')
      .set('Authorization', `Bearer ${VALID_JWT}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('tenant_suspended');
  });
});
```

> **Note :** `makeApp`, `getTenantStatus`, `getDb` sont déjà importés/définis dans le fichier existant — vérifier les imports avant d'ajouter.

- [ ] **Vérifier que tous les tests passent**

```bash
cd C:/Dev/projects/shadow-ai-sentinel && npx vitest run src/backend
```

Attendu : tous les tests verts, y compris les 5 nouveaux.

- [ ] **Commit**

```bash
git add src/backend/tenant-isolation.test.ts
git commit -m "test(api): Clerk JWT path in tenantMiddleware [S1-I9]"
```

---

## Task 8 : Vérification manuelle + doc setup Clerk

**Files:**
- Create: `apps/portal/.env.local` (à partir de `.env.local.example`, non commité)

- [ ] **Créer le compte Clerk et configurer les providers**

1. Aller sur [dashboard.clerk.com](https://dashboard.clerk.com)
2. Créer une application → activer Email + Google + Microsoft
3. Dans **JWT Templates** → créer un template `sentinel` :
   ```json
   {
     "tenant_id": "{{user.public_metadata.tenant_id}}"
   }
   ```
4. Copier `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`
5. Copier l'URL JWKS : `https://<your-clerk-domain>.clerk.accounts.dev/.well-known/jwks.json`

- [ ] **Remplir `apps/portal/.env.local`**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/en/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/en/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/en/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/en/dashboard
```

Et dans `.env` backend (racine) :

```env
CLERK_JWKS_URL=https://<your-clerk-domain>.clerk.accounts.dev/.well-known/jwks.json
```

- [ ] **Lancer le portail en dev**

```bash
cd apps/portal && npm run dev
```

Vérifier :
- `http://localhost:3001/en` → home page visible
- `http://localhost:3001/fr` → home en français
- `http://localhost:3001/en/login` → Clerk SignIn component affiché
- `http://localhost:3001/en/signup` → Clerk SignUp component affiché
- Se connecter avec Google → redirect vers `/en/dashboard` ✅
- `http://localhost:3001/en/dashboard` sans session → redirect vers login ✅

- [ ] **Commit final + mise à jour plan**

```bash
git add apps/portal/
git commit -m "feat(portal): Next.js 15 portal skeleton + Clerk auth EN/FR [S1-I9]"
```

Marquer S1-I9 ✅ dans `.ai/plans/commercialisation-sprint-1.md`.

---

## Checklist finale (DoD S1-I9)

- [ ] `npm run dev` dans `apps/portal/` démarre sans erreur
- [ ] Login OAuth Google fonctionne et redirige vers `/en/dashboard`
- [ ] `/fr/` affiche les textes en français
- [ ] `/en/dashboard` sans session → redirect login
- [ ] `npx vitest run src/backend` — tous les tests verts (y compris 5 tests JWT Clerk)
- [ ] `CLERK_JWKS_URL` absent → middleware retourne `clerk_not_configured`
- [ ] Tenant suspendu avec JWT valide → 403
