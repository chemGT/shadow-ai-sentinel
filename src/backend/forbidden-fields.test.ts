import { describe, expect, it } from 'vitest';
import { findForbiddenKeysDeep } from './forbidden-fields.js';

describe('findForbiddenKeysDeep', () => {
  it('détecte une clé interdite à la racine', () => {
    const errors = findForbiddenKeysDeep({ text: 'secret prompt' });
    expect(errors.some((e) => e.includes('text'))).toBe(true);
  });

  it('détecte une clé interdite imbriquée', () => {
    const errors = findForbiddenKeysDeep({
      events: [{ eventId: 'x', nested: { snippet: 'iban' } }],
    });
    expect(errors.some((e) => e.includes('snippet'))).toBe(true);
  });

  it('accepte un payload conforme', () => {
    const errors = findForbiddenKeysDeep({
      events: [{ eventId: 'a', ruleType: 'iban', action: 'block' }],
    });
    expect(errors).toHaveLength(0);
  });
});
