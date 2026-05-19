import { FORBIDDEN_TELEMETRY_KEYS } from '../core/constants.js';

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_TELEMETRY_KEYS);

/** Parcourt récursivement un JSON pour détecter des clés interdites. */
export function findForbiddenKeysDeep(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenKeysDeep(item, `${path}[${index}].`),
    );
  }

  const errors: string[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const keyPath = `${path}${key}`;
    if (FORBIDDEN_SET.has(key)) {
      errors.push(`champ interdit: ${keyPath}`);
    }
    errors.push(...findForbiddenKeysDeep(nested, `${keyPath}.`));
  }

  return errors;
}
