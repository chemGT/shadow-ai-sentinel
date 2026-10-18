import { describe, expect, it } from 'vitest';
import { normalizeForScan } from './normalize.js';

describe('normalizeForScan', () => {
  it('texte ASCII : renvoyé tel quel, offsets identité', () => {
    const n = normalizeForScan('AKIA 123');
    expect(n.text).toBe('AKIA 123');
    expect(n.toOriginal(2, 5)).toEqual({ start: 2, end: 5 });
  });

  it('supprime les invisibles et replie les espaces Unicode', () => {
    expect(normalizeForScan('a​b﻿c­d').text).toBe('abcd');
    expect(normalizeForScan('1 2 3　4').text).toBe('1 2 3 4');
  });

  it('replie homoglyphes cyrilliques/grecs et pleine chasse (NFKC)', () => {
    expect(normalizeForScan('АКІА').text).toBe('AKIA');
    expect(normalizeForScan('ΑΒΚ').text).toBe('ABK');
    expect(normalizeForScan('４１１１').text).toBe('4111');
  });

  it('ne translittère pas les autres lettres non latines', () => {
    expect(normalizeForScan('Жд').text).toBe('Жд');
  });

  it('carte d’index : un invisible supprimé reste inclus dans l’intervalle original', () => {
    const original = 'x A​B y';
    const n = normalizeForScan(original);
    expect(n.text).toBe('x AB y');
    const span = n.toOriginal(2, 4);
    expect(original.slice(span.start, span.end)).toBe('A​B');
  });

  it('carte d’index : expansion NFKC (ligature ﬁ) et paires de substitution', () => {
    const original = '😀ﬁx';
    const n = normalizeForScan(original);
    expect(n.text).toBe('😀fix');
    // « fi » (2 caractères repliés) provient du seul point de code « ﬁ » (index 2).
    expect(n.toOriginal(2, 4)).toEqual({ start: 2, end: 3 });
    expect(n.toOriginal(0, 2)).toEqual({ start: 0, end: 2 });
    expect(n.toOriginal(4, 5)).toEqual({ start: 3, end: 4 });
  });
});
