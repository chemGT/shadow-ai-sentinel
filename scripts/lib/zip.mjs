/**
 * Écriture ZIP minimale et déterministe (Node seul, aucune dépendance, aucun binaire `zip`).
 *
 * Pourquoi : `scripts/package.mjs` appelait le binaire `zip`, absent d'un Windows standard, et
 * les archives embarquaient l'heure de modification des fichiers — deux builds du même commit
 * donnaient des SHA-256 différents, ce qui rendait `SHA256SUMS.txt` invérifiable par un tiers.
 * Ici : entrées triées, horodatage fixe, attributs fixes ⇒ même contenu = mêmes octets.
 *
 * Limites assumées (suffisantes pour un paquet d'extension) : pas de ZIP64 (fichiers et archive
 * < 4 Gio, < 65 535 entrées), pas de chiffrement, noms en UTF-8.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

/** 1980-01-01 00:00:00, plus petite date représentable au format DOS. */
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
const UTF8_FLAG = 0x0800;

/**
 * @param {{ name: string, data: Uint8Array }[]} entries chemins relatifs avec `/`
 * @returns {Buffer}
 */
export function buildZip(entries) {
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (sorted.length > 0xfffe) {
    throw new Error('zip : trop d’entrées (ZIP64 non géré)');
  }
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of sorted) {
    const nameBytes = Buffer.from(name, 'utf8');
    const raw = Buffer.from(data);
    const deflated = deflateRawSync(raw, { level: 9 });
    const stored = deflated.length >= raw.length;
    const body = stored ? raw : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version « made by » : 2.0, hôte MS-DOS (pas d'attributs Unix)
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);

    localParts.push(local, nameBytes, body);
    centralParts.push(central, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }

  const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
  if (offset + centralSize > 0xffffffff) {
    throw new Error('zip : archive trop volumineuse (ZIP64 non géré)');
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

/** Liste récursive des fichiers de `dir`, chemins relatifs avec `/`. */
async function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listFiles(join(dir, entry.name), rel)));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

/** Archive tout le contenu de `dir` (sans entrée de répertoire). */
export async function zipDirectory(dir) {
  const names = await listFiles(dir);
  const entries = await Promise.all(
    names.map(async (name) => ({ name, data: await readFile(join(dir, ...name.split('/'))) })),
  );
  return buildZip(entries);
}
