/**
 * Configuration de build de l'extension (valeurs publiques, jamais de secret).
 * Le product_id Gumroad n'est pas sensible : il figure déjà dans le lien d'achat public.
 */

interface ExtensionEnv {
  VITE_GUMROAD_PRODUCT_ID?: string;
  VITE_GUMROAD_PRODUCT_URL?: string;
}

const env = (import.meta as unknown as { env?: ExtensionEnv }).env ?? {};

/** Identifiant produit Gumroad utilisé pour vérifier les licences. */
export const GUMROAD_PRODUCT_ID = env.VITE_GUMROAD_PRODUCT_ID ?? '';

/** Lien d'achat public (CTA « Passer en Pro »). */
export const GUMROAD_PRODUCT_URL =
  env.VITE_GUMROAD_PRODUCT_URL ?? 'https://gumroad.com';

/** Jours de grâce hors-ligne avant de rétrograder une licence non revérifiable. */
export const LICENSE_GRACE_DAYS = 7;
