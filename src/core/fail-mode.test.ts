import { describe, expect, it } from 'vitest';
import { shouldBlockUnscannable } from './fail-mode.js';

describe('shouldBlockUnscannable', () => {
  it('ne bloque qu’en fail_mode closed ; absent = défaut warn', () => {
    expect(shouldBlockUnscannable('closed')).toBe(true);
    expect(shouldBlockUnscannable('warn')).toBe(false);
    expect(shouldBlockUnscannable('open')).toBe(false);
    expect(shouldBlockUnscannable(undefined)).toBe(false);
  });
});
