import type { RawMatch } from './types.js';

const IPV4_PATTERN =
  /\b(?:(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(?:172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})|(?:192\.168\.\d{1,3}\.\d{1,3}))\b/g;

function isValidOctet(value: number): boolean {
  return value >= 0 && value <= 255;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || !isValidOctet(n))) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}

export function findInternalIpMatches(text: string): RawMatch[] {
  const matches: RawMatch[] = [];
  IPV4_PATTERN.lastIndex = 0;

  let result = IPV4_PATTERN.exec(text);
  while (result !== null) {
    const ip = result[0];
    if (isPrivateIpv4(ip)) {
      matches.push({
        ruleType: 'internal_ip',
        start: result.index,
        end: result.index + ip.length,
      });
    }
    result = IPV4_PATTERN.exec(text);
  }

  return matches;
}
