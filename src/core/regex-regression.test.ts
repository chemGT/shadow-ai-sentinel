import { describe, expect, it } from 'vitest';
import { detectSensitiveData } from './regex-engine.js';
import { createDefaultPolicy } from './defaults.js';
import {
  REGEX_NEGATIVE_CASES,
  REGEX_POSITIVE_CASES,
} from '../test/fixtures/regex-regression.js';

describe('regex regression — positifs', () => {
  it.each(REGEX_POSITIVE_CASES)('$id', ({ text, expectTypes, buildPolicy }) => {
    const policy = buildPolicy?.() ?? createDefaultPolicy();
    const matches = detectSensitiveData(text, policy);
    const found = new Set(matches.map((m) => m.ruleType));
    for (const type of expectTypes) {
      expect(found.has(type)).toBe(true);
    }
  });
});

describe('regex regression — négatifs', () => {
  it.each(REGEX_NEGATIVE_CASES)('$id', ({ text, expectTypes, buildPolicy }) => {
    const policy = buildPolicy?.() ?? createDefaultPolicy();
    const matches = detectSensitiveData(text, policy);
    expect(matches.map((m) => m.ruleType)).toEqual(expectTypes);
  });
});
