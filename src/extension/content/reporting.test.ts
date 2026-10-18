import { describe, expect, it } from 'vitest';
import { buildFalsePositiveIssueUrl } from './reporting.js';

describe('buildFalsePositiveIssueUrl', () => {
  it('pré-remplit le formulaire avec règle, site, contexte et version uniquement', () => {
    const url = new URL(buildFalsePositiveIssueUrl('iban', 'code', 'claude.ai', '1.2.3'));
    expect(url.origin + url.pathname).toBe(
      'https://github.com/chemGT/shadow-ai-sentinel/issues/new',
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      template: 'false-positive.yml',
      title: '[False positive] iban on claude.ai',
      rule: 'iban',
      site: 'claude.ai',
      context: 'code',
      version: '1.2.3',
    });
  });
});
