# Shadow AI Sentinel

[![CI](https://github.com/chemGT/shadow-ai-sentinel/actions/workflows/ci.yml/badge.svg)](https://github.com/chemGT/shadow-ai-sentinel/actions/workflows/ci.yml)
[![Licence : Apache-2.0](https://img.shields.io/badge/licence-Apache--2.0-blue.svg)](LICENSE)

**DLP navigateur open source pour les IA publiques.** Shadow AI Sentinel arrête les secrets et les
données personnelles **avant** leur envoi à ChatGPT, Claude, Gemini et cinq autres assistants — en
bloquant le message ou en caviardant la valeur sensible sur place.

- **100 % local.** La détection tourne dans votre navigateur. L'extension **n'émet aucune requête
  réseau** : pas de backend, pas d'analytics, pas de télémétrie.
- **Auditable.** Tout le code qui touche à votre prompt est dans ce dépôt.
- **Pensé pour la « shadow AI ».** Logs, configs, données clients collés dans un LLM public : c'est
  une ceinture de sécurité pour ce moment-là, pas un outil de surveillance des salariés.

[English](README.md)

---

## Ce qui est détecté

| Règle | Exemples | Validation | Défaut |
|-------|----------|------------|--------|
| `api_key` | AWS `AKIA…`, OpenAI `sk-…`, Anthropic `sk-ant-…`, Stripe `sk_live_…`, GitHub `ghp_…`, GitLab `glpat-…`, Slack `xox…`, chaînes Azure Storage | Préfixes fixes, longueurs bornées | Bloquer |
| `generic_secret` | `Bearer …`, `Basic …`, JWT | Motifs bornés | Bloquer |
| `iban` | `FR76 3000 6000 0112 3456 7890 189`, `DE89-3704-…` | mod-97 (ISO 13616) | Caviarder |
| `card` | Visa / Mastercard / Amex | Luhn | Caviarder |
| `phone` | Formats FR nationaux et `+33`, E.164 | Format | Caviarder |
| `internal_ip` | Adresses RFC 1918 | Plages | Caviarder |
| `pro_email` | Adresses sur les domaines que **vous** configurez | Domaine exact | Désactivé |

Chaque règle passe en **Bloquer** / **Caviarder** ou se désactive depuis les options. Une
**allowlist** neutralise les valeurs connues (clés de test, votre e-mail public…).

**Pièces jointes** analysées : fichiers texte/code (`.env`, `.json`, `.csv`, sources…) et
**PDF / DOCX** (extraction locale via pdf.js et mammoth).

**Durcissement anti-contournement :** le texte est normalisé avant analyse (caractères invisibles
supprimés, espaces insécables repliés, homoglyphes cyrilliques/grecs et pleine chasse ramenés à
l'ASCII). Le caviardage porte exactement sur ce que vous avez saisi.

## Sites couverts

Claude · ChatGPT · Gemini · Mistral Le Chat · DeepSeek · Perplexity · Grok · Microsoft Copilot

## Installation

Publication sur le Chrome Web Store et Firefox Add-ons prévue. En attendant :

```bash
git clone https://github.com/chemGT/shadow-ai-sentinel.git
cd shadow-ai-sentinel
npm ci
npm run build            # Chromium → dist/
npm run build:firefox    # Firefox  → dist-firefox/
```

- **Chrome / Edge / Brave :** `chrome://extensions` → Mode développeur → *Charger l'extension non empaquetée* → `dist/`
- **Firefox :** `about:debugging` → Ce Firefox → *Charger un module temporaire* → `dist-firefox/manifest.json`

## Ce que l'outil ne fait **pas**

Il protège contre la **fuite par inadvertance**, pas contre un initié déterminé : secrets encodés
(base64, hex…), images, XLSX/PPTX, archives, PDF scannés et appels hors de la zone de saisie ne sont
pas couverts. Modèle de menace complet :
[`docs/security/evasion-threat-model.md`](docs/security/evasion-threat-model.md).

## Conformité

Outil d'appoint pour une politique d'usage de l'IA générative : il aide à réduire le risque de
divulgation de données personnelles (RGPD art. 32 — mesures techniques) et de secrets techniques
(hygiène cyber NIS2). Il ne remplace ni une analyse d'impact, ni une politique d'usage, ni la
sensibilisation des équipes. Notes et modèles de notice salarié :
[`docs/compliance/`](docs/compliance/README.md).

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) (en anglais) et [SECURITY.md](SECURITY.md).

## Licence

[Apache-2.0](LICENSE).
