/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  extractPptxText,
  extractXlsxText,
  MAX_OOXML_UNCOMPRESSED_BYTES,
} from './ooxml-extract.js';

function fixtureFile(name: string): File {
  return new File([readFileSync(join(process.cwd(), 'test', 'fixtures', name))], name);
}

interface TestEntry {
  name: string;
  xml: string;
  method?: 0 | 8;
  flags?: number;
}

/** ZIP minimal (CRC à 0 : le lecteur ne le vérifie pas). */
function zipFile(name: string, entries: TestEntry[]): File {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name: entryName, xml, method = 8, flags = 0 } of entries) {
    const raw = Buffer.from(xml, 'utf8');
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const nameBuf = Buffer.from(entryName, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new File([Buffer.concat([...locals, cd, end])], name);
}

const slide = (text: string) =>
  `<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;

describe('extractXlsxText', () => {
  it('résout les chaînes partagées (texte riche), inlineStr, nombres et commentaires', async () => {
    const text = await extractXlsxText(fixtureFile('xlsx-sensitive.xlsx'));
    expect(text).toContain('DE89 3704 0044 0532 0130 00');
    expect(text).toContain('ACME & Co');
    expect(text).toContain('AKIAIOSFODNN7EXAMPLE');
    expect(text).toContain('1200');
    expect(text).toContain('Reviewed by finance');
    // Une ligne par <row>, cellules séparées par des tabulations.
    expect(text).toContain('Supplier\tIBAN\tAmount');
  });

  it('ne laisse pas une ligne auto-fermante avaler la suivante', async () => {
    const file = zipFile('t.xlsx', [
      {
        name: 'xl/worksheets/sheet1.xml',
        xml:
          '<worksheet><sheetData><row r="1"/>' +
          '<row r="2"><c r="A2" t="inlineStr"><is><t>a</t></is></c><c r="B2"/><c r="C2"><v>7</v></c></row>' +
          '</sheetData></worksheet>',
      },
    ]);
    expect(await extractXlsxText(file)).toBe('\na\t7');
  });

  it('décode les entités XML numériques et nommées', async () => {
    const file = zipFile('t.xlsx', [
      {
        name: 'xl/worksheets/sheet1.xml',
        xml: '<worksheet><sheetData><row><c t="inlineStr"><is><t>&#65;&#x42;&lt;&amp;&gt;</t></is></c></row></sheetData></worksheet>',
      },
    ]);
    expect(await extractXlsxText(file)).toBe('AB<&>');
  });
});

describe('extractPptxText', () => {
  it('extrait diapositives et notes de l’orateur', async () => {
    const text = await extractPptxText(fixtureFile('pptx-sensitive.pptx'));
    expect(text).toContain('Roadmap 2027');
    expect(text).toContain('Use the shared account');
    expect(text).toContain(`sk-${'a'.repeat(48)}`);
  });

  it('ordonne les diapositives numériquement (slide2 avant slide10)', async () => {
    const file = zipFile('t.pptx', [
      { name: 'ppt/slides/slide10.xml', xml: slide('ten') },
      { name: 'ppt/slides/slide2.xml', xml: slide('two'), method: 0 },
    ]);
    expect(await extractPptxText(file)).toBe('two\nten');
  });
});

describe('garde-fous ZIP', () => {
  it('rejette un fichier qui n’est pas un ZIP', async () => {
    await expect(extractXlsxText(new File([new Uint8Array(64)], 'x.xlsx'))).rejects.toThrow();
  });

  it('rejette une entrée chiffrée', async () => {
    const file = zipFile('t.pptx', [{ name: 'ppt/slides/slide1.xml', xml: slide('x'), flags: 1 }]);
    await expect(extractPptxText(file)).rejects.toThrow(/encrypted/);
  });

  it('rejette une méthode de compression inconnue', async () => {
    const file = zipFile('t.pptx', [{ name: 'ppt/slides/slide1.xml', xml: slide('x') }]);
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Méthode 14 (LZMA) dans l'en-tête central.
    const cd = bytes.length - 22 - 46 - 'ppt/slides/slide1.xml'.length;
    bytes[cd + 10] = 14;
    await expect(extractPptxText(new File([bytes], 't.pptx'))).rejects.toThrow(/compression/);
  });

  it('interrompt une « zip bomb » au-delà du plafond décompressé', async () => {
    const huge = `<worksheet>${' '.repeat(MAX_OOXML_UNCOMPRESSED_BYTES + 1)}</worksheet>`;
    const file = zipFile('bomb.xlsx', [{ name: 'xl/worksheets/sheet1.xml', xml: huge }]);
    expect(file.size).toBeLessThan(1024 * 1024);
    await expect(extractXlsxText(file)).rejects.toThrow(/size limit/);
  });
});
