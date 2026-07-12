import { describe, expect, it } from 'vitest';
import { ALL_RULE_TYPES, REDACT_TOKENS } from '../../core/constants.js';
import type { RuleType } from '../../core/types.js';
import {
  blockModalCopy,
  employeeNoticeSections,
  redactNotice,
} from './messages.js';

const LOCALES = ['fr', 'en'] as const;

describe('messages i18n (Phase 5)', () => {
  it.each(ALL_RULE_TYPES)('blockModalCopy couvre %s en FR et EN', (ruleType) => {
    for (const locale of LOCALES) {
      const copy = blockModalCopy(ruleType, locale);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.headline.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
      expect(copy.hint.length).toBeGreaterThan(0);
      expect(copy.closeLabel.length).toBeGreaterThan(0);
      expect(copy.headline.toLowerCase()).not.toMatch(/sk-|aws|iban\s*fr/i);
    }
  });

  it("bouton modale Block = J'ai compris / Got it", () => {
    expect(blockModalCopy('api_key', 'fr').closeLabel).toBe("J'ai compris");
    expect(blockModalCopy('api_key', 'en').closeLabel).toBe('Got it');
  });

  it.each(ALL_RULE_TYPES)('redactNotice mentionne le jeton pour %s', (ruleType) => {
    const token = REDACT_TOKENS[ruleType];
    expect(redactNotice([ruleType], 'fr')).toContain(token);
    expect(redactNotice([ruleType], 'en')).toContain(token);
  });

  it('redactNotice multi-types sans doublon de libellé', () => {
    const msg = redactNotice(['iban', 'phone'], 'en');
    expect(msg).toContain('IBAN');
    expect(msg).toContain('phone');
  });

  it('notice employé : sections FR/EN avec puces', () => {
    for (const locale of LOCALES) {
      const sections = employeeNoticeSections(locale);
      expect(sections.length).toBeGreaterThanOrEqual(4);
      const withBullets = sections.filter((s) => (s.bullets?.length ?? 0) > 0);
      expect(withBullets.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('aucun message ne contient de placeholder de donnée sensible', () => {
    const samples: RuleType[] = ['api_key', 'iban'];
    for (const locale of LOCALES) {
      for (const ruleType of samples) {
        const copy = blockModalCopy(ruleType, locale);
        const blob = [copy.title, copy.headline, copy.body, copy.hint].join(' ');
        expect(blob).not.toMatch(/AKIA|sk-[a-z0-9]|FR\d{2}/i);
      }
    }
  });
});
