/**
 * Accès unifié à l'API WebExtension (Chromium `chrome.*`, Firefox `browser.*`).
 * Phase Firefox : ajouter webextension-polyfill si besoin ; la détection native suffit en MV3.
 */
export type ExtensionApi = typeof chrome;

export function getExtensionApi(): ExtensionApi {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined) {
    return chrome;
  }

  const browserGlobal = (globalThis as { browser?: ExtensionApi }).browser;
  if (browserGlobal?.runtime?.id !== undefined) {
    return browserGlobal;
  }

  throw new Error('[Shadow AI Sentinel] API WebExtension indisponible');
}

export function getBrowserFamily(): 'chromium' | 'firefox' {
  const api = getExtensionApi();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (ua.includes('Firefox/')) {
    return 'firefox';
  }
  if ('browser' in globalThis && api === (globalThis as { browser?: ExtensionApi }).browser) {
    return 'firefox';
  }
  return 'chromium';
}

export function getExtensionVersion(): string {
  return getExtensionApi().runtime.getManifest().version;
}
