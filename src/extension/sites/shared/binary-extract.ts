import {
  bytesToBase64,
  isDocxFile,
  isPdfFile,
  isPptxFile,
  isXlsxFile,
  readFileBytes,
} from '../../../core/binary-file.js';
import { sendMessage } from '../../platform/runtime.js';

/**
 * Import dynamique : pdfjs-dist/mammoth/ooxml-extract ne sont chargés (et n'alourdissent le bundle
 * du content script) que lorsqu'un utilisateur dépose effectivement un PDF/DOCX/XLSX/PPTX.
 */
let pdfWorkerConfigured = false;

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (!pdfWorkerConfigured) {
    pdfWorkerConfigured = true;
    // En contexte extension (content script), pdf.js a besoin d'un workerSrc résolu en
    // `chrome-extension://…` (asset bundlé par crxjs, cf. web_accessible_resources généré).
    // Hors extension (tests Node/Vitest), pdf.js bascule seul sur son fake-worker interne :
    // ne pas toucher `workerSrc` dans ce cas.
    const hasExtensionRuntime =
      typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function';
    if (hasExtensionRuntime) {
      const { default: workerSrc } = await import(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
      );
      pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(workerSrc);
    }
  }

  return pdfjs;
}

/** Extraction pdf.js à partir d'octets appartenant au contexte courant. */
export async function extractPdfTextFromBytes(data: Uint8Array): Promise<string> {
  const pdfjs = await loadPdfjs();
  // Le cleanup (`destroy`) vit sur la loading task, pas sur le PDFDocumentProxy résolu.
  const loadingTask = pdfjs.getDocument({ data });

  try {
    const doc = await loadingTask.promise;
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => ('str' in item ? item.str : ''));
      pageTexts.push(strings.join(' '));
    }
    return pageTexts.join('\n');
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Tente `direct`, puis `fallback` si `direct` échoue. Si les deux échouent, c'est l'erreur du
 * repli qui remonte (le fichier est alors traité comme non analysable par le file guard).
 */
export async function withFallback<T>(
  direct: () => Promise<T>,
  fallback: (() => Promise<T>) | null,
): Promise<T> {
  try {
    return await direct();
  } catch (error) {
    if (fallback === null) {
      throw error;
    }
    return fallback();
  }
}

/**
 * Repli : extraction par la page d'arrière-plan de l'extension.
 *
 * Firefox : dans un content script, `ReadableStream` est le constructeur de la PAGE (vu à
 * travers Xray) ; pdf.js lui passe des objets du content script que la page n'a pas le droit de
 * lire (« Permission denied to access property "autoAllocateChunkSize" ») — `getTextContent`
 * échoue donc toujours. L'arrière-plan, lui, est un contexte d'extension ordinaire où pdf.js
 * fonctionne. Les octets transitent par la messagerie interne de l'extension (aucun réseau,
 * rien n'est stocké), encodés en base64 car Chromium sérialise les messages en JSON.
 */
async function extractPdfTextInBackground(data: Uint8Array): Promise<string> {
  const response = (await sendMessage({
    type: 'EXTRACT_PDF_TEXT',
    payload: bytesToBase64(data),
  })) as { text?: unknown; error?: unknown } | undefined;
  if (typeof response?.text !== 'string') {
    throw new Error('extraction PDF en arrière-plan impossible');
  }
  return response.text;
}

export async function extractPdfText(file: File): Promise<string> {
  const data = await readFileBytes(file);
  const hasExtensionRuntime =
    typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
  return withFallback(
    // Copie : pdf.js peut transférer (détacher) le tampon reçu, or le repli en a encore besoin.
    () => extractPdfTextFromBytes(data.slice()),
    hasExtensionRuntime ? () => extractPdfTextInBackground(data) : null,
  );
}

export async function extractDocxText(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth');
  const bytes = await readFileBytes(file);
  const arrayBuffer = bytes.buffer as ArrayBuffer;
  // mammoth attend `{buffer}` via sa résolution Node par défaut (utilisée par Vitest) et
  // `{arrayBuffer}` via le remap `browser` de son package.json (appliqué par Vite en prod).
  // On fournit systématiquement la forme correspondant à l'environnement d'exécution réel.
  const input: Parameters<typeof mammoth.extractRawText>[0] =
    typeof Buffer !== 'undefined' ? { buffer: Buffer.from(bytes) } : { arrayBuffer };
  const result = await mammoth.extractRawText(input);
  return result.value;
}

export async function extractXlsxText(file: File): Promise<string> {
  const { extractXlsxText: extract } = await import('./ooxml-extract.js');
  return extract(file);
}

export async function extractPptxText(file: File): Promise<string> {
  const { extractPptxText: extract } = await import('./ooxml-extract.js');
  return extract(file);
}

/** Extrait le texte d'un fichier binaire pris en charge (PDF, DOCX, XLSX ou PPTX). */
export function extractBinaryText(file: File): Promise<string> {
  if (isPdfFile(file)) {
    return extractPdfText(file);
  }
  if (isDocxFile(file)) {
    return extractDocxText(file);
  }
  if (isXlsxFile(file)) {
    return extractXlsxText(file);
  }
  if (isPptxFile(file)) {
    return extractPptxText(file);
  }
  return Promise.reject(new Error('Unsupported binary file'));
}
