/**
 * Configuration de build de l'extension (valeurs publiques, jamais de secret).
 * Les identifiants Lemon Squeezy (store / product) ne sont pas sensibles :
 * ils figurent déjà dans le lien de checkout public.
 */

interface ExtensionEnv {
  VITE_LEMONSQUEEZY_STORE_ID?: string;
  VITE_LEMONSQUEEZY_PRODUCT_ID?: string;
  VITE_LEMONSQUEEZY_CHECKOUT_URL?: string;
}

const env = (import.meta as unknown as { env?: ExtensionEnv }).env ?? {};

/** Store Lemon Squeezy attendu (vérif d'appartenance de la clé). */
export const LEMONSQUEEZY_STORE_ID = env.VITE_LEMONSQUEEZY_STORE_ID ?? '';

/** Produit Lemon Squeezy attendu (vérif d'appartenance de la clé). */
export const LEMONSQUEEZY_PRODUCT_ID = env.VITE_LEMONSQUEEZY_PRODUCT_ID ?? '';

/** Lien de checkout public (CTA « Passer en Pro »). */
export const LEMONSQUEEZY_CHECKOUT_URL =
  env.VITE_LEMONSQUEEZY_CHECKOUT_URL ?? 'https://lemonsqueezy.com';

/** Jours de grâce hors-ligne avant de rétrograder une licence non revérifiable. */
export const LICENSE_GRACE_DAYS = 7;
