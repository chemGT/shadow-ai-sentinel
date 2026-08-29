import { isDocxFile, isPdfFile } from '../../../core/binary-file.js';

/**
 * Import dynamique : pdfjs-dist/mammoth ne sont chargés (et n'alourdissent le bundle du content
 * script) que lorsqu'un utilisateur Pro dépose effectivement un PDF/DOCX.
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

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
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

export async function extractDocxText(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  // mammoth attend `{buffer}` via sa résolution Node par défaut (utilisée par Vitest) et
  // `{arrayBuffer}` via le remap `browser` de son package.json (appliqué par Vite en prod).
  // On fournit systématiquement la forme correspondant à l'environnement d'exécution réel.
  const input: Parameters<typeof mammoth.extractRawText>[0] =
    typeof Buffer !== 'undefined' ? { buffer: Buffer.from(arrayBuffer) } : { arrayBuffer };
  const result = await mammoth.extractRawText(input);
  return result.value;
}

/** Extrait le texte d'un fichier binaire pris en charge (PDF ou DOCX). */
export function extractBinaryText(file: File): Promise<string> {
  if (isPdfFile(file)) {
    return extractPdfText(file);
  }
  if (isDocxFile(file)) {
    return extractDocxText(file);
  }
  return Promise.reject(new Error('Unsupported binary file'));
}
