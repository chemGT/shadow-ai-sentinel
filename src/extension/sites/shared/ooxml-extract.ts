/**
 * Extraction locale du texte des classeurs XLSX et présentations PPTX (conteneurs ZIP de XML,
 * comme le DOCX). Aucune dépendance : lecteur ZIP minimal (répertoire central) + décompression
 * native `DecompressionStream('deflate-raw')` + extraction XML par scan `indexOf` linéaire.
 *
 * Garde-fous anti « zip bomb » : nombre d'entrées lues et volume décompressé plafonnés ; un
 * dépassement lève une erreur (le file guard traite alors le fichier comme non scannable).
 */

/** Volume décompressé max cumulé, toutes entrées confondues. */
export const MAX_OOXML_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
/** Nombre max d'entrées dans le répertoire central. */
export const MAX_ZIP_ENTRIES = 10_000;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const ZIP_COMMENT_MAX = 0xffff;

interface ZipEntry {
  name: string;
  method: number;
  flags: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  const minOffset = Math.max(0, view.byteLength - EOCD_MIN_SIZE - ZIP_COMMENT_MAX);
  for (let i = view.byteLength - EOCD_MIN_SIZE; i >= minOffset; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      return i;
    }
  }
  throw new Error('ZIP: end of central directory not found');
}

function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const count = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  // ZIP64 (marqueurs 0xFFFF/0xFFFFFFFF) non pris en charge : improbable sous la limite de taille.
  if (count === 0xffff || cdOffset === 0xffffffff) {
    throw new Error('ZIP: ZIP64 not supported');
  }
  if (count > MAX_ZIP_ENTRIES) {
    throw new Error('ZIP: too many entries');
  }

  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (p + 46 > bytes.byteLength || view.getUint32(p, true) !== CENTRAL_SIGNATURE) {
      throw new Error('ZIP: corrupt central directory');
    }
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    entries.push({
      flags: view.getUint16(p + 8, true),
      method: view.getUint16(p + 10, true),
      compressedSize: view.getUint32(p + 20, true),
      uncompressedSize: view.getUint32(p + 24, true),
      localHeaderOffset: view.getUint32(p + 42, true),
      name: decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength)),
    });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array, budget: { remaining: number }): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    // Contrôle en flux : la taille déclarée dans l'en-tête n'est pas fiable (zip bomb).
    if (total > budget.remaining) {
      await reader.cancel();
      throw new Error('ZIP: uncompressed size limit exceeded');
    }
    chunks.push(value);
  }
  budget.remaining -= total;

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function readEntry(
  bytes: Uint8Array,
  entry: ZipEntry,
  budget: { remaining: number },
): Promise<string> {
  if (entry.flags & 0x1) {
    throw new Error('ZIP: encrypted entry');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const p = entry.localHeaderOffset;
  if (p + 30 > bytes.byteLength || view.getUint32(p, true) !== LOCAL_SIGNATURE) {
    throw new Error('ZIP: corrupt local header');
  }
  const start = p + 30 + view.getUint16(p + 26, true) + view.getUint16(p + 28, true);
  const end = start + entry.compressedSize;
  if (end > bytes.byteLength) {
    throw new Error('ZIP: truncated entry');
  }
  const raw = bytes.subarray(start, end);

  let data: Uint8Array;
  if (entry.method === 0) {
    if (raw.byteLength > budget.remaining) {
      throw new Error('ZIP: uncompressed size limit exceeded');
    }
    budget.remaining -= raw.byteLength;
    data = raw;
  } else if (entry.method === 8) {
    data = await inflateRaw(raw, budget);
  } else {
    throw new Error(`ZIP: unsupported compression method ${entry.method}`);
  }
  return new TextDecoder().decode(data);
}

const XML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-z]{2,4});/g, (match, ref: string) => {
    if (ref.startsWith('#')) {
      const code = ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return XML_ENTITIES[ref] ?? match;
  });
}

/**
 * Éléments `<tag …>…</tag>` d'un fragment XML, avec leurs attributs bruts et leur contenu.
 * Scan par `indexOf` (linéaire, aucune regex : pas de backtracking possible sur un XML
 * malformé). Gère la forme auto-fermante `<tag …/>` — sans quoi `<row r="5"/>` avalerait
 * la ligne suivante. Suppose l'absence d'imbrication du même tag, vrai pour les parties lues ici.
 */
function* elements(xml: string, tag: string): Generator<{ attrs: string; body: string }> {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let i = xml.indexOf(open);
  while (i !== -1) {
    const afterName = i + open.length;
    // `<a:p` ne doit pas matcher `<a:pPr`, ni `<c` matcher `<col`.
    if (!/[\s/>]/.test(xml.charAt(afterName))) {
      i = xml.indexOf(open, afterName);
      continue;
    }
    const tagEnd = xml.indexOf('>', afterName);
    if (tagEnd === -1) {
      return;
    }
    if (xml.charAt(tagEnd - 1) === '/') {
      yield { attrs: xml.slice(afterName, tagEnd - 1), body: '' };
      i = xml.indexOf(open, tagEnd + 1);
      continue;
    }
    const closeAt = xml.indexOf(close, tagEnd + 1);
    if (closeAt === -1) {
      return;
    }
    yield { attrs: xml.slice(afterName, tagEnd), body: xml.slice(tagEnd + 1, closeAt) };
    i = xml.indexOf(open, closeAt + close.length);
  }
}

/** Concatène le contenu des éléments texte (`t` en SpreadsheetML, `a:t` en DrawingML). */
function textRuns(xml: string, tag: 't' | 'a:t'): string {
  const parts: string[] = [];
  for (const { body } of elements(xml, tag)) {
    parts.push(decodeXmlEntities(body));
  }
  return parts.join('');
}

/** Tri naturel : slide2.xml avant slide10.xml. */
function byPartNumber(a: ZipEntry, b: ZipEntry): number {
  const n = (e: ZipEntry) => Number(/(\d+)\.xml$/.exec(e.name)?.[1] ?? 0);
  return n(a) - n(b) || a.name.localeCompare(b.name);
}

async function openZip(file: File): Promise<{
  entries: ZipEntry[];
  read: (entry: ZipEntry) => Promise<string>;
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = readCentralDirectory(bytes);
  const budget = { remaining: MAX_OOXML_UNCOMPRESSED_BYTES };
  return { entries, read: (entry) => readEntry(bytes, entry, budget) };
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  // `<si>` = une chaîne partagée, éventuellement en texte riche (plusieurs `<r><t>`).
  for (const { body } of elements(xml, 'si')) {
    strings.push(textRuns(body, 't'));
  }
  return strings;
}

function sheetText(xml: string, shared: readonly string[]): string {
  const rows: string[] = [];
  for (const row of elements(xml, 'row')) {
    const cells: string[] = [];
    for (const { attrs, body } of elements(row.body, 'c')) {
      const type = /\st="([^"]*)"/.exec(attrs)?.[1];
      if (type === 'inlineStr') {
        cells.push(textRuns(body, 't'));
        continue;
      }
      const value = /<v>([^<]*)<\/v>/.exec(body)?.[1];
      if (value === undefined) {
        continue;
      }
      cells.push(type === 's' ? (shared[Number(value)] ?? '') : decodeXmlEntities(value));
    }
    rows.push(cells.join('\t'));
  }
  return rows.join('\n');
}

/**
 * Texte d'un XLSX : toutes les feuilles (y compris masquées), cellules résolues via la table des
 * chaînes partagées, plus les commentaires de cellule.
 */
export async function extractXlsxText(file: File): Promise<string> {
  const zip = await openZip(file);
  const sharedEntry = zip.entries.find((e) => e.name === 'xl/sharedStrings.xml');
  const shared = sharedEntry ? parseSharedStrings(await zip.read(sharedEntry)) : [];

  const out: string[] = [];
  const sheets = zip.entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort(byPartNumber);
  for (const sheet of sheets) {
    out.push(sheetText(await zip.read(sheet), shared));
  }
  const comments = zip.entries
    .filter((e) => /^xl\/comments\d+\.xml$/.test(e.name))
    .sort(byPartNumber);
  for (const comment of comments) {
    out.push(textRuns(await zip.read(comment), 't'));
  }
  return out.join('\n');
}

function slideText(xml: string): string {
  // Un `<a:p>` = un paragraphe ; ses `<a:t>` (runs) sont concaténés.
  const paragraphs: string[] = [];
  for (const { body } of elements(xml, 'a:p')) {
    paragraphs.push(textRuns(body, 'a:t'));
  }
  return paragraphs.join('\n');
}

/** Parties lues dans un PPTX, dans cet ordre : diapositives, puis notes de l'orateur. */
const PPTX_TEXT_PARTS = [/^ppt\/slides\/slide\d+\.xml$/, /^ppt\/notesSlides\/notesSlide\d+\.xml$/];

/** Texte d'un PPTX : diapositives dans l'ordre, puis notes de l'orateur. */
export async function extractPptxText(file: File): Promise<string> {
  const zip = await openZip(file);
  const out: string[] = [];
  for (const pattern of PPTX_TEXT_PARTS) {
    const parts = zip.entries.filter((e) => pattern.test(e.name)).sort(byPartNumber);
    for (const part of parts) {
      out.push(slideText(await zip.read(part)));
    }
  }
  return out.join('\n');
}
