import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildZip } from '../../scripts/lib/zip.mjs';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** Relit l'archive via son répertoire central (lecteur indépendant de l'écrivain). */
function readZip(zip: Buffer): Map<string, string> {
  const eocd = zip.length - 22;
  expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
  const count = zip.readUInt16LE(eocd + 10);
  let pos = zip.readUInt32LE(eocd + 16);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i += 1) {
    expect(zip.readUInt32LE(pos)).toBe(0x02014b50);
    const method = zip.readUInt16LE(pos + 10);
    const compressedSize = zip.readUInt32LE(pos + 20);
    const nameLength = zip.readUInt16LE(pos + 28);
    const localOffset = zip.readUInt32LE(pos + 42);
    const name = zip.subarray(pos + 46, pos + 46 + nameLength).toString('utf8');
    const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const body = zip.subarray(dataStart, dataStart + compressedSize);
    files.set(name, (method === 8 ? inflateRawSync(body) : body).toString('utf8'));
    pos += 46 + nameLength;
  }
  return files;
}

describe('scripts/lib/zip.mjs — paquets reproductibles (F15)', () => {
  const entries = [
    { name: 'manifest.json', data: enc('{"manifest_version":3}') },
    { name: 'assets/app.js', data: enc('console.log(1);'.repeat(200)) },
    { name: 'icons/é.txt', data: enc('x') },
  ];

  it('relit le contenu exact de chaque fichier (compressé ou stocké)', () => {
    const files = readZip(buildZip(entries));
    expect([...files.keys()]).toEqual(['assets/app.js', 'icons/é.txt', 'manifest.json']);
    expect(files.get('manifest.json')).toBe('{"manifest_version":3}');
    expect(files.get('assets/app.js')).toBe('console.log(1);'.repeat(200));
  });

  it('est déterministe : mêmes fichiers, ordre d’entrée différent ⇒ mêmes octets', () => {
    const a = buildZip(entries);
    const b = buildZip([...entries].reverse());
    expect(a.equals(b)).toBe(true);
  });
});
