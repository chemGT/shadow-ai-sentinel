/**
 * Taille max lue en mémoire pour l'extraction PDF/DOCX/XLSX/PPTX (formats plus lourds que le
 * texte brut).
 */
export const MAX_BINARY_FILE_BYTES = 10 * 1024 * 1024;

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export function isPdfFile(file: File): boolean {
  if (file.size === 0) {
    return false;
  }
  return file.type.toLowerCase() === PDF_MIME || file.name.toLowerCase().endsWith('.pdf');
}

export function isDocxFile(file: File): boolean {
  if (file.size === 0) {
    return false;
  }
  return file.type.toLowerCase() === DOCX_MIME || file.name.toLowerCase().endsWith('.docx');
}

export function isXlsxFile(file: File): boolean {
  if (file.size === 0) {
    return false;
  }
  return file.type.toLowerCase() === XLSX_MIME || file.name.toLowerCase().endsWith('.xlsx');
}

export function isPptxFile(file: File): boolean {
  if (file.size === 0) {
    return false;
  }
  return file.type.toLowerCase() === PPTX_MIME || file.name.toLowerCase().endsWith('.pptx');
}

/** Formats binaires pris en charge par l'extraction locale. */
export function isBinaryScannableFile(file: File): boolean {
  return isPdfFile(file) || isDocxFile(file) || isXlsxFile(file) || isPptxFile(file);
}

export function isBinaryFileTooLarge(file: File): boolean {
  return file.size > MAX_BINARY_FILE_BYTES;
}
