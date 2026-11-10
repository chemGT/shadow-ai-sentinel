export function buildZip(entries: { name: string; data: Uint8Array }[]): Buffer;
export function zipDirectory(dir: string): Promise<Buffer>;
