import { truncateForDetection } from './detection/limits.js';

/** Taille max lue en mémoire (évite blocage UI sur gros fichiers). */
export const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

export const TEXT_FILE_EXTENSIONS: readonly string[] = [
  '.txt',
  '.csv',
  '.tsv',
  '.json',
  '.env',
  '.md',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
  '.sql',
  '.ini',
  '.cfg',
  '.conf',
  '.properties',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.sh',
  '.bash',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.less',
] as const;

const TEXT_MIME_PREFIXES = ['text/'] as const;

const TEXT_MIME_EXACT = new Set([
  'application/json',
  'application/javascript',
  'application/xml',
  'application/x-yaml',
  'application/csv',
]);

export function isTextLikeFile(file: File): boolean {
  if (file.size === 0) {
    return false;
  }

  const type = file.type.toLowerCase();
  if (TEXT_MIME_PREFIXES.some((p) => type.startsWith(p))) {
    return true;
  }
  if (TEXT_MIME_EXACT.has(type)) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  return TEXT_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export function readFileAsText(file: File): Promise<string> {
  if (!isTextLikeFile(file)) {
    return Promise.reject(new Error('Not a supported text file'));
  }
  if (file.size > MAX_TEXT_FILE_BYTES) {
    return Promise.reject(new Error('File too large'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      resolve(truncateForDetection(raw));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsText(file);
  });
}

export function replaceInputFiles(input: HTMLInputElement, files: File[]): void {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function buildRedactedFile(file: File, redactedText: string): File {
  const type = file.type || 'text/plain';
  return new File([redactedText], file.name, { type, lastModified: Date.now() });
}
