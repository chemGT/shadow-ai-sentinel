/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createSiteDom } from './dom-factory.js';

// Sélecteur d'envoi volontairement périmé : simule une refonte d'UI du site.
const dom = createSiteDom({
  inputSelectors: ['textarea#prompt'],
  sendSelectors: ['button[data-testid="old-send-button"]'],
  composerSelectors: ['form#composer'],
});

function mount(buttonHtml: string): HTMLElement {
  document.body.innerHTML = `
    <form id="composer">
      <textarea id="prompt"></textarea>
      ${buttonHtml}
    </form>
    <button id="outside" aria-label="Send feedback">x</button>`;
  // happy-dom ne calcule pas de mise en page : le focus rend la zone « visible » pour l'adaptateur.
  document.querySelector<HTMLTextAreaElement>('#prompt')?.focus();
  return document.querySelector<HTMLElement>('form#composer [data-under-test]') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dom-factory — repli générique du bouton d’envoi (F8)', () => {
  it('bouton type="submit" dans le composer : reconnu malgré un sélecteur périmé', () => {
    const button = mount('<button type="submit" data-under-test>→</button>');
    expect(dom.isSendButtonTarget(button)).toBe(true);
  });

  it('bouton libellé « Send » / « Envoyer » : reconnu, y compris via un enfant (icône)', () => {
    const button = mount('<button type="button" aria-label="Envoyer le message" data-under-test><span id="icon">→</span></button>');
    expect(dom.isSendButtonTarget(button)).toBe(true);
    expect(dom.isSendButtonTarget(document.getElementById('icon'))).toBe(true);
  });

  it('autre bouton du composer (pièce jointe) : ignoré', () => {
    const button = mount('<button type="button" aria-label="Attach file" data-under-test>+</button>');
    expect(dom.isSendButtonTarget(button)).toBe(false);
  });

  it('bouton « Send » hors du composer : ignoré', () => {
    mount('<button type="submit" data-under-test>→</button>');
    expect(dom.isSendButtonTarget(document.getElementById('outside'))).toBe(false);
  });
});
