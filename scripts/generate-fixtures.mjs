#!/usr/bin/env node
/**
 * Génère les fixtures PDF/DOCX de test/fixtures/ (pas de dépendance externe : PDF et ZIP/DOCX
 * sont écrits à la main, formats minimaux mais valides). Ré-exécuter après modification :
 *   node scripts/generate-fixtures.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'test', 'fixtures');

// ---------------------------------------------------------------------------
// PDF (minimal, texte extractible via une police standard non-embarquée)
// ---------------------------------------------------------------------------

function pdfEscape(text) {
  if (!/^[\x20-\x7e]*$/.test(text)) {
    throw new Error('buildPdf: only printable ASCII is supported by this minimal writer');
  }
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(text) {
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  // MediaBox volontairement très large : le texte est écrit sur une seule ligne (pas de retour
  // à la ligne dans ce writer minimal) — un texte plus long que la page serait tronqué par pdf.js
  // au bord de la MediaBox (texte hors clip = hors extraction), pas seulement hors rendu visuel.
  objects[3] =
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 4000 200] ' +
    '/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const stream = `BT /F1 18 Tf 20 100 Td (${pdfEscape(text)}) Tj ET`;
  objects[5] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  const count = objects.length;
  pdf += `xref\n0 ${count}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < count; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

function buildCorruptPdf(text) {
  const valid = buildPdf(text);
  // Tronque avant la table xref : header + objets présents, structure de fin détruite.
  // pdf.js ne peut pas localiser le xref/trailer -> rejet du parsing.
  return valid.subarray(0, Math.floor(valid.length * 0.6));
}

// ---------------------------------------------------------------------------
// DOCX (ZIP "stored"/non compressé contenant word/document.xml)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const { name, content } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(content);
    const size = content.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // method = stored
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // method = stored
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + content.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(centralChunks);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralBuf, end]);
}

function buildDocx(paragraphs) {
  const contentTypes = Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ' +
      'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
    'utf8',
  );

  const rels = Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" ' +
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
      'Target="word/document.xml"/>' +
      '</Relationships>',
    'utf8',
  );

  const xmlEscape = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`)
    .join('');

  const documentXml = Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${body}</w:body>` +
      '</w:document>',
    'utf8',
  );

  return buildZip([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rels },
    { name: 'word/document.xml', content: documentXml },
  ]);
}

// ---------------------------------------------------------------------------

mkdirSync(FIXTURES_DIR, { recursive: true });

const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const OPENAI_KEY = `sk-${'a'.repeat(48)}`;
const IBAN = 'DE89 3704 0044 0532 0130 00';

const fixtures = [
  {
    file: 'pdf-sensitive.pdf',
    build: () =>
      buildPdf(
        `Internal notes. AWS key: ${AWS_KEY} OpenAI key: ${OPENAI_KEY} - do not share.`,
      ),
  },
  {
    file: 'pdf-benign.pdf',
    build: () => buildPdf('Quarterly report summary. No sensitive data in this document.'),
  },
  {
    file: 'pdf-corrupt.pdf',
    build: () => buildCorruptPdf('This PDF will be truncated to simulate corruption.'),
  },
  {
    file: 'docx-sensitive.docx',
    build: () =>
      buildDocx(['Wire transfer details', `IBAN: ${IBAN}`, 'Please process before Friday.']),
  },
  {
    file: 'docx-benign.docx',
    build: () => buildDocx(['Meeting notes', 'Nothing sensitive here.', 'See you next week.']),
  },
];

for (const { file, build } of fixtures) {
  const buf = build();
  writeFileSync(join(FIXTURES_DIR, file), buf);
  console.log(`wrote ${file} (${buf.length} bytes)`);
}
