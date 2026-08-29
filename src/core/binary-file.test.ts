/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import {
  isBinaryFileTooLarge,
  isBinaryScannableFile,
  isDocxFile,
  isPdfFile,
  MAX_BINARY_FILE_BYTES,
} from './binary-file.js';

function mockFile(name: string, size: number, type = ''): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('binary-file', () => {
  it('détecte un PDF par extension', () => {
    expect(isPdfFile(mockFile('report.pdf', 10))).toBe(true);
  });

  it('détecte un PDF par MIME', () => {
    expect(isPdfFile(mockFile('upload', 10, 'application/pdf'))).toBe(true);
  });

  it('détecte un DOCX par extension', () => {
    expect(isDocxFile(mockFile('report.docx', 10))).toBe(true);
  });

  it('détecte un DOCX par MIME', () => {
    expect(
      isDocxFile(
        mockFile(
          'upload',
          10,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ),
    ).toBe(true);
  });

  it('rejette les fichiers vides', () => {
    expect(isPdfFile(mockFile('empty.pdf', 0))).toBe(false);
    expect(isDocxFile(mockFile('empty.docx', 0))).toBe(false);
  });

  it('rejette les formats non pris en charge', () => {
    expect(isPdfFile(mockFile('archive.zip', 10))).toBe(false);
    expect(isDocxFile(mockFile('archive.zip', 10))).toBe(false);
    expect(isBinaryScannableFile(mockFile('image.png', 10, 'image/png'))).toBe(false);
  });

  it('isBinaryScannableFile couvre PDF et DOCX', () => {
    expect(isBinaryScannableFile(mockFile('a.pdf', 10))).toBe(true);
    expect(isBinaryScannableFile(mockFile('a.docx', 10))).toBe(true);
  });

  it('applique la limite de taille binaire', () => {
    expect(isBinaryFileTooLarge(mockFile('a.pdf', MAX_BINARY_FILE_BYTES))).toBe(false);
    expect(isBinaryFileTooLarge(mockFile('a.pdf', MAX_BINARY_FILE_BYTES + 1))).toBe(true);
  });
});
