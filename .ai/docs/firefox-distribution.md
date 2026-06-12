# Distribution Firefox — pilote B2B

> Phase 6 · aligné [ADR 001](../adr/001-dual-browser-build.md) et plan MVP.

## Artefacts

| Commande | Sortie |
|----------|--------|
| `npm run build:firefox` | Dossier `dist-firefox/` (chargement temporaire dev) |
| `npm run package:firefox` | `dist-firefox/shadow-ai-sentinel-unsigned.xpi` (ZIP, **non signé**) |

## Développement / test local

1. `npm run build:firefox`
2. Firefox → `about:debugging` → **Ce Firefox** → **Charger un module temporaire**
3. Sélectionner `dist-firefox/manifest.json`

> Module temporaire : disparaît au redémarrage du navigateur. Pour le pilote prod, utiliser un XPI **signé**.

## Signature Mozilla (retenu : distribution non répertoriée)

1. Créer un compte sur [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. **Soumettre** le module :
   - Source : dépôt ou ZIP des sources si demandé en review
   - Artefact : `shadow-ai-sentinel-unsigned.xpi` (après `npm run package:firefox`)
3. Choisir la distribution **« sur votre propre site »** / unlisted (pas de listing public AMO).
4. Attendre la review Mozilla → télécharger le **XPI signé**.
5. Héberger le fichier sur une **URL HTTPS** accessible aux postes pilote (intranet client ou CDN projet).

## Déploiement entreprise (post-pilote)

| Méthode | Usage |
|---------|--------|
| Lien interne HTTPS | Pilote 20–50 postes |
| `policies.json` Firefox | `ExtensionSettings` / installation forcée ESR |

Exemple d’ID extension (manifest build) : `shadow-ai-sentinel@pilot.sentinel` — **ne pas changer** après première signature sans nouvelle soumission AMO.

## Calendrier recommandé

Soumettre à AMO **dès le gel de version** pilote (Phase 6), la review Mozilla pouvant prendre plusieurs jours (risque R-3 dans SUIVI-ACTIONS).

## Chromium (rappel)

Pour comparaison pilote : extension non empaquetée `dist/` (dev) ou Chrome Web Store **non répertoriée** / `ExtensionInstallForcelist` — voir §9 du guide INSTALLATION.
