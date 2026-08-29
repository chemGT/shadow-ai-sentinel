/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import {
  consumeReplacedInputMark,
  isTextLikeFile,
  MAX_TEXT_FILE_BYTES,
  readFileAsText,
  replaceInputFiles,
  TEXT_FILE_EXTENSIONS,
} from './text-file.js';

function mockFile(name: string, content: string, type = ''): File {
  return new File([content], name, { type });
}

describe('text-file', () => {
  it('détecte les extensions texte courantes', () => {
    expect(isTextLikeFile(mockFile('secrets.env', 'KEY=1'))).toBe(true);
    expect(isTextLikeFile(mockFile('data.csv', 'a,b'))).toBe(true);
    expect(isTextLikeFile(mockFile('readme.md', '# hi'))).toBe(true);
    expect(isTextLikeFile(mockFile('archive.zip', 'PK'))).toBe(false);
    expect(isTextLikeFile(mockFile('image.png', 'PNG', 'image/png'))).toBe(false);
  });

  it('accepte les MIME text/* et application/json', () => {
    expect(isTextLikeFile(mockFile('x', '{}', 'application/json'))).toBe(true);
    expect(isTextLikeFile(mockFile('x', 'a', 'text/plain'))).toBe(true);
  });

  it('rejette les fichiers vides', () => {
    expect(isTextLikeFile(mockFile('empty.txt', ''))).toBe(false);
  });

  it('lit le contenu intégralement (le plafond de scan est géré par le moteur de détection)', async () => {
    const content = 'x'.repeat(150_000);
    const text = await readFileAsText(mockFile('big.txt', content));
    expect(text.length).toBe(150_000);
  });

  it('rejette les fichiers trop volumineux', async () => {
    const huge = new File([new Uint8Array(MAX_TEXT_FILE_BYTES + 1)], 'huge.txt', {
      type: 'text/plain',
    });
    await expect(readFileAsText(huge)).rejects.toThrow(/too large/i);
  });

  it('expose une liste d’extensions non vide', () => {
    expect(TEXT_FILE_EXTENSIONS.length).toBeGreaterThan(10);
  });

  it('marque le change re-dispatché par replaceInputFiles (one-shot, anti-boucle)', () => {
    const input = document.createElement('input');
    input.type = 'file';

    expect(consumeReplacedInputMark(input)).toBe(false);

    let changeCount = 0;
    input.addEventListener('change', () => {
      changeCount += 1;
    });
    replaceInputFiles(input, [mockFile('notes.txt', 'contenu anodin', 'text/plain')]);

    expect(changeCount).toBe(1);
    expect(input.files?.length).toBe(1);
    // Premier consume = true (événement du re-dispatch), puis le marqueur est purgé.
    expect(consumeReplacedInputMark(input)).toBe(true);
    expect(consumeReplacedInputMark(input)).toBe(false);
  });
});
