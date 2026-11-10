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

/**
 * Lit les octets d'un fichier et les RECOPIE dans un tableau appartenant au contexte appelant.
 *
 * Firefox : un `File` issu de la page (input, glisser-déposer) appartient au compartiment de la
 * page ; le content script n'en voit qu'une enveloppe Xray, et le tampon rendu par
 * `file.arrayBuffer()` comme par `FileReader` reste dans ce compartiment (`instanceof
 * ArrayBuffer` y est faux). Tout ce qu'on construit dessus (flux, pdf.js, `DecompressionStream`)
 * échoue par « Permission denied to access property … » : l'extraction PDF/DOCX/XLSX/PPTX
 * échouait donc systématiquement sous Firefox et le fichier partait sans analyse.
 * La copie ci-dessous alloue le tableau de destination par sa LONGUEUR (donc dans le contexte
 * appelant) puis y recopie les octets : le résultat est utilisable partout, sur tout navigateur.
 */
function copyBytes(buffer: ArrayBuffer): Uint8Array {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(new Uint8Array(buffer));
  return copy;
}

export function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof FileReader === 'undefined') {
    return file.arrayBuffer().then(copyBytes);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result === null || typeof result === 'string') {
        reject(new Error('FileReader: résultat inattendu'));
        return;
      }
      try {
        resolve(copyBytes(result));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('copie des octets impossible'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

/** Octets → base64, par blocs (un `apply` sur 10 Mo dépasserait la pile d'appels). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
