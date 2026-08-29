/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDefaultPolicy } from '../../../core/defaults.js';
import { MAX_BINARY_FILE_BYTES } from '../../../core/binary-file.js';
import type { Policy } from '../../../core/types.js';
import { guardFileList, hasScannableInList, type FileGuardOptions } from './file-guard.js';

// Stub minimal de l'API WebExtension : `reportDlpAction` en dépend.
// `chrome.storage.local.get/set` sont Promise-only ici (cf. storage.ts) : pas de callback,
// contrairement à l'API historique chrome.* callback-based.
// `chrome.runtime.getURL` est volontairement absent : en son absence, pdf.js utilise son
// fake-worker Node par défaut (cf. binary-extract.ts) au lieu de tenter un vrai Worker inexistant
// sous Vitest.
beforeAll(() => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      id: 'test-extension-id',
      lastError: undefined,
      sendMessage: (_msg: unknown, cb?: (response: unknown) => void) => {
        cb?.(undefined);
      },
    },
    storage: {
      local: {
        get: (_keys: unknown) => Promise.resolve({}),
        set: (_items: unknown) => Promise.resolve(),
      },
    },
  };
});

function fixturePath(name: string): string {
  return join(process.cwd(), 'test', 'fixtures', name);
}

function fixtureFile(name: string, type: string): File {
  const buf = readFileSync(fixturePath(name));
  return new File([buf], name, { type });
}

const PDF_TYPE = 'application/pdf';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function pdfSensitive(): File {
  return fixtureFile('pdf-sensitive.pdf', PDF_TYPE);
}
function pdfBenign(): File {
  return fixtureFile('pdf-benign.pdf', PDF_TYPE);
}
function pdfCorrupt(): File {
  return fixtureFile('pdf-corrupt.pdf', PDF_TYPE);
}
function docxSensitive(): File {
  return fixtureFile('docx-sensitive.docx', DOCX_TYPE);
}
function docxBenign(): File {
  return fixtureFile('docx-benign.docx', DOCX_TYPE);
}

function policyWithIbanAction(action: 'block' | 'redact'): Policy {
  const policy = createDefaultPolicy();
  return {
    ...policy,
    rules: policy.rules.map((r) => (r.type === 'iban' ? { ...r, action } : r)),
  };
}

function options(overrides: Partial<FileGuardOptions> = {}): FileGuardOptions {
  return {
    getPolicy: () => createDefaultPolicy(),
    host: 'claude.ai',
    isFileScanEnabled: () => true,
    ...overrides,
  };
}

describe('hasScannableInList (régression du gate texte-only)', () => {
  it('reconnaît une liste 100% PDF comme scannable', () => {
    expect(hasScannableInList([pdfBenign()])).toBe(true);
  });

  it('reconnaît une liste 100% DOCX comme scannable', () => {
    expect(hasScannableInList([docxBenign()])).toBe(true);
  });

  it('ignore une liste sans fichier texte/PDF/DOCX', () => {
    const image = new File([new Uint8Array(10)], 'photo.png', { type: 'image/png' });
    expect(hasScannableInList([image])).toBe(false);
  });
});

describe('guardFileList — PDF/DOCX (Pro)', () => {
  it('bloque un PDF contenant une clé AWS/OpenAI', async () => {
    const result = await guardFileList([pdfSensitive()], options());
    expect(result.blocked).toBe(true);
    expect(result.allowed).toHaveLength(0);
  });

  it('bloque un DOCX contenant un IBAN quand la policy IBAN = block', async () => {
    const policy = policyWithIbanAction('block');
    const result = await guardFileList([docxSensitive()], options({ getPolicy: () => policy }));
    expect(result.blocked).toBe(true);
    expect(result.allowed).toHaveLength(0);
  });

  it('bloque aussi un DOCX contenant un IBAN quand la policy IBAN = redact (binaire non réécrivable)', async () => {
    const policy = policyWithIbanAction('redact');
    const result = await guardFileList([docxSensitive()], options({ getPolicy: () => policy }));
    expect(result.blocked).toBe(true);
    expect(result.allowed).toHaveLength(0);
  });

  it('laisse passer un PDF bénin sans blocage', async () => {
    const result = await guardFileList([pdfBenign()], options());
    expect(result.blocked).toBe(false);
    expect(result.allowed).toHaveLength(1);
  });

  it('laisse passer un DOCX bénin sans blocage', async () => {
    const result = await guardFileList([docxBenign()], options());
    expect(result.blocked).toBe(false);
    expect(result.allowed).toHaveLength(1);
  });

  it('bloque une liste mixte [texte bénin + PDF sensible]', async () => {
    const benignText = new File(['just some notes, nothing sensitive'], 'notes.txt', {
      type: 'text/plain',
    });
    const result = await guardFileList([benignText, pdfSensitive()], options());
    expect(result.blocked).toBe(true);
  });

  it('applique le scan DLP à une liste 100% PDF (régression texte-only)', async () => {
    const result = await guardFileList([pdfSensitive()], options());
    expect(result.blocked).toBe(true);
  });

  it('laisse passer sans scan en Free tier, même avec un PDF sensible', async () => {
    const result = await guardFileList(
      [pdfSensitive()],
      options({ isFileScanEnabled: () => false }),
    );
    expect(result.blocked).toBe(false);
    expect(result.allowed).toHaveLength(1);
  });

  it('laisse passer un binaire trop volumineux avec avertissement (pas de blocage)', async () => {
    const oversized = new File([new Uint8Array(MAX_BINARY_FILE_BYTES + 1)], 'huge.pdf', {
      type: PDF_TYPE,
    });
    const result = await guardFileList([oversized], options());
    expect(result.blocked).toBe(false);
    expect(result.allowed).toHaveLength(1);
  });

  it('laisse passer un PDF corrompu avec avertissement (pas de blocage)', async () => {
    const result = await guardFileList([pdfCorrupt()], options());
    expect(result.blocked).toBe(false);
    expect(result.allowed).toHaveLength(1);
  });
});
