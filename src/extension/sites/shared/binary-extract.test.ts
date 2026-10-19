/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractBinaryText, extractDocxText, extractPdfText } from './binary-extract.js';

function fixturePath(name: string): string {
  return join(process.cwd(), 'test', 'fixtures', name);
}

function fixtureFile(name: string, type: string): File {
  const buf = readFileSync(fixturePath(name));
  return new File([buf], name, { type });
}

describe('binary-extract', () => {
  it('extrait le texte complet d’un PDF sensible', async () => {
    const file = fixtureFile('pdf-sensitive.pdf', 'application/pdf');
    const text = await extractPdfText(file);
    expect(text).toContain('AKIAIOSFODNN7EXAMPLE');
    expect(text).toContain('sk-');
  });

  it('extrait le texte d’un PDF bénin', async () => {
    const file = fixtureFile('pdf-benign.pdf', 'application/pdf');
    const text = await extractPdfText(file);
    expect(text).toContain('Quarterly report summary');
  });

  it('rejette un PDF corrompu plutôt que de renvoyer un texte partiel silencieux', async () => {
    const file = fixtureFile('pdf-corrupt.pdf', 'application/pdf');
    await expect(extractPdfText(file)).rejects.toThrow();
  });

  it('extrait le texte d’un DOCX sensible (IBAN)', async () => {
    const file = fixtureFile(
      'docx-sensitive.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    const text = await extractDocxText(file);
    expect(text).toContain('DE89 3704 0044 0532 0130 00');
  });

  it('extrait le texte d’un DOCX bénin', async () => {
    const file = fixtureFile(
      'docx-benign.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    const text = await extractDocxText(file);
    expect(text).toContain('Nothing sensitive here');
  });

  it('extractBinaryText route selon le type de fichier', async () => {
    const pdf = fixtureFile('pdf-benign.pdf', 'application/pdf');
    const docx = fixtureFile(
      'docx-benign.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    await expect(extractBinaryText(pdf)).resolves.toContain('Quarterly');
    await expect(extractBinaryText(docx)).resolves.toContain('Meeting notes');
  });

  it('extractBinaryText route XLSX et PPTX vers l’extracteur OOXML', async () => {
    const xlsx = fixtureFile(
      'xlsx-benign.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const pptx = fixtureFile(
      'pptx-benign.pptx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    await expect(extractBinaryText(xlsx)).resolves.toContain('Revenue');
    await expect(extractBinaryText(pptx)).resolves.toContain('Team offsite');
  });

  it('extractBinaryText rejette un format non pris en charge', async () => {
    const other = new File(['plain text'], 'notes.txt', { type: 'text/plain' });
    await expect(extractBinaryText(other)).rejects.toThrow();
  });
});
