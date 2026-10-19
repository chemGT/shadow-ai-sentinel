# Contournements DLP confirmés — septembre 2026

**Date :** 2026-09-15 · **Méthode :** chaque contournement listé est **confirmé par exécution** du
corpus `src/core/detection/evasion-corpus.test.ts` (`npx vitest run src/core/detection/evasion-corpus.test.ts`,
35 tests verts) — ce ne sont **pas** des hypothèses. Modèle de menace détaillé :
`evasion-threat-model.md`. Suite complète : **325 tests verts**, `tsc` propre.

Gravité : **haute** = fuite probable sans intention de contourner (format courant) · **moyenne** =
fuite réaliste, action simple ou copier-coller · **basse** = nécessite une intention claire de
contourner (encodage/outil), le produit ne prétend pas l'arrêter.

---

## A. Contournements corrigés dans ce lot

### A1 — [HAUTE] Téléphone au format international `+33…` totalement non détecté — **CORRIGÉ**
- **Repro (avant fix)** : `+33612345678`, `+33 6 12 34 56 78`, `+33.6.12.34.56.78` → aucune détection.
- **Test de verrou** : `describe('CORRECTIF — téléphone +33 (international) désormais détecté')`.
- **Cause racine** : `src/core/detection/phone.ts:4` (le motif FR démarrait par `\b`, impossible
  avant un `+` précédé d'un espace/début de chaîne) **combiné à** `phone.ts:55` (le motif E.164
  exclut explicitement `+33`, en supposant à tort que le motif FR le couvre). Résultat : aucun des
  deux ne voyait un numéro français en notation internationale — un format de carnet d'adresses
  standard, donc une **fuite par inadvertance**.
- **Correctif appliqué** : ancrage de tête `\b` → `(?<![\w+])` (`phone.ts:11`). Couvre les trois
  formes `+33`, conserve à l'identique le comportement national et les cas négatifs
  (`ticketX0612345678` toujours ignoré). 0 régression sur les 290 tests préexistants.

---

## B. Contournements confirmés — à corriger (correctif proposé, non implémenté)

### B1 — [MOYENNE] IBAN séparé par tirets ou NBSP échappe — **CORRIGÉ (2026-10-18)**
- **Correctif appliqué** : séparateur IBAN `[ -]?` + strip `[\s-]` dans le mod-97 (`iban.ts`) ;
  NBSP replié par la normalisation **D**. Verrou : `CORRECTIF — unicode normalisé avant scan`.
- **Repro** : tests `[BYPASS CONNU] IBAN séparé par tirets` et `… par NBSP`
  (`DE89-3704-0044-0532-0130-00`, `DE89 3704 …` en U+00A0) → non détecté, alors que la version
  espaces ASCII et la version contiguë le sont.
- **Cause racine** : `src/core/detection/iban.ts:10` — séparateur `[ ]?` (espace ASCII littéral).
- **Correctif proposé** : élargir la classe de séparation aux espaces Unicode + tiret,
  ex. `(?:[   -]?[A-Z0-9]{4}){2,7}`. Le garde-fou mod-97 (`iban.ts:12`) rend le risque de
  faux positif négligeable. (Mieux : normalisation défensive commune — voir **D**.)

### B2 — [MOYENNE] Carte bancaire séparée par NBSP / espace fine échappe — **CORRIGÉ (2026-10-18)**
- **Correctif appliqué** : normalisation **D** (espaces Unicode → ASCII, BOM supprimé). Le point
  reste exclu (C2).
- **Repro** : tests `[BYPASS CONNU] carte séparée par NBSP` et `… par NNBSP fine`
  (`4111 1111 1111 1111` en U+00A0 / U+202F) → non détecté.
- **Cause racine** : `src/core/detection/card.ts:12` — séparateur `[ -]` (espace ASCII / tiret).
- **Correctif proposé** : ajouter NBSP + NNBSP à la classe, ex. `(?:\d[   -]?){12,18}\d`.
  **Ne pas** ajouter le point (voir C2). Luhn (`card.ts:15`) borne les FP.

### B3 — [MOYENNE] `pro_email` : les sous-domaines du domaine configuré échappent — ✅ **CORRIGÉ 2026-10-19 (issue #11)**
- **Repro** : test `[BYPASS CONNU] sous-domaine du domaine configuré`
  (`jean@mail.acme.com`, `jean@eu.acme.com` avec policy `acme.com`) → non détecté.
- **Cause racine** : `src/core/detection/pro-email.ts:14` — le `@` doit précéder immédiatement le
  domaine ; aucun préfixe de sous-domaine n'est autorisé.
- **Correctif appliqué 2026-10-19** (issue #11) : insérer `(?:[a-z0-9-]+\.)*` avant le domaine :
  `@(?:[a-z0-9-]+\.)*(?:${domainPart})`. Vérifier qu'un domaine `acme.com` ne matche pas
  `evilacme.com` (le `.` littéral l'empêche déjà) — vérifié par les tests
  `CORRECTIF — pro_email sous-domaines (B3)` dans `src/core/detection/evasion-corpus.test.ts`
  (le test `[BYPASS CONNU]` correspondant est passé en positif).

### B4 — [MOYENNE] Zero-width / BOM / homoglyphes / pleine chasse dans un secret — **CORRIGÉ (2026-10-18)**
- **Correctif appliqué** : normalisation **D** + table d'homoglyphes cyrilliques/grecs stricts
  (NFKC seul ne replie pas `А` cyrillique).
- **Repro** : tests `[BYPASS CONNU] zero-width … dans une clé`, `BOM … dans une carte`,
  `homoglyphe cyrillique …`, `chiffre pleine chasse …`.
- **Cause racine** : aucune **normalisation Unicode** avant scan (pipeline `run-detectors.ts` /
  `regex-engine.ts`). Les motifs sont ASCII ; tout caractère invisible intercalé ou tout homoglyphe
  de compatibilité casse le match.
- **Correctif proposé** : passe de normalisation défensive avant `runAllDetectors` (voir **D**).
  Ferme d'un coup B1, B2 et B4 (zero-width, NBSP, pleine chasse, homoglyphes de compatibilité NFKC).

### B5 — [MOYENNE] Formats de fichier non scannés (XLSX, PPTX, RTF, ZIP, images)
- **Repro** : test `[BYPASS CONNU] XLSX / PPTX / archives / images ne sont ni texte ni binaire
  scannable` — `isTextLikeFile` et `isBinaryScannableFile` renvoient tous deux `false` → le fichier
  passe **sans aucun scan**.
- **Cause racine** : `src/extension/sites/shared/file-guard.ts:277-284` (`isScannableFile`) +
  `src/core/binary-file.ts:23` + `src/core/text-file.ts:44` — seuls texte/PDF/DOCX sont couverts.
- **Correctif proposé** : a minima **bloquer par défaut** (ou avertir explicitement) les formats
  bureautiques non extractibles (XLSX/PPTX/ODT) plutôt que les laisser passer en silence ; à terme,
  ajouter un extracteur XLSX (`sheetjs`) au pipeline binaire. Décision produit — coût vs surface.

---

## C. Contournements confirmés — à **documenter, ne pas corriger** (limite assumée ou FP)

### C1 — [BASSE] Encodages (base64, hex, URL-encoding) et transformations réversibles
- **Repro** : tests `[BYPASS CONNU] encodages` (base64/hex/URL) + `manipulations de chaîne`
  (découpage sur deux lignes, séparateurs internes dans la clé, enrobage `_`, inversion).
- **Cause racine** : le moteur scanne le **texte brut**, sans décodage (choix assumé :
  `run-detectors.ts`). Un décodeur généraliste exploserait faux positifs et coût CPU.
- **Décision** : **limite de périmètre**, pas un défaut à corriger. Le produit arrête la fuite par
  inadvertance, pas l'exfiltration motivée. À refléter dans le discours commercial / la privacy page.

### C2 — [BASSE] Carte séparée par des points
- **Repro** : test `[BYPASS CONNU] carte séparée par des points`.
- **Cause racine** : `card.ts:12`.
- **Décision** : **ne pas corriger**. Ajouter `.` comme séparateur ferait matcher numéros de
  version, ratios et séquences pointées de 13-19 chiffres passant Luhn par hasard (~10 %) — perte de
  clients (faux positifs sur du code/texte technique) supérieure au trou. Cf. la contrainte du lot.

---

## D. Recommandation transverse à plus fort levier — **IMPLÉMENTÉE (2026-10-18)**

> Implémentation : `src/core/detection/normalize.ts`, appelée par `detectSensitiveData`
> (`regex-engine.ts`). Option retenue pour les offsets : **carte d'index creuse** (seuls les
> points de code dont le repli change la longueur sont enregistrés, recherche dichotomique) →
> `start/end` désignent le texte original, le caviardage couvre le segment réellement saisi
> (invisibles intercalés inclus). NFKC limité aux formes de compatibilité imitant l'ASCII
> (pleine chasse, ligatures, exposants, chiffres cerclés, alphanumériques mathématiques).
> L'allowlist applique le même repli. Coût mesuré (2 Mo, conteneur CI) : ASCII/français
> ~15 ms (inchangé), cyrillique dense ~150–200 ms, une seule passe à l'envoi.
> Tests : `normalize.test.ts`, `evasion-corpus.test.ts`, `analyze.test.ts`.

Texte d'origine de la recommandation :


Une **normalisation défensive avant scan** — insérée en tête de `runAllDetectors`
(`src/core/detection/run-detectors.ts`) ou dans `detectSensitiveData`
(`src/core/regex-engine.ts`) — fermerait B1, B2 et B4 d'un seul correctif localisé, à faible risque
de faux positif :

1. **Supprimer** les caractères zero-width : `U+200B`, `U+200C`, `U+200D`, `U+FEFF`.
2. **Replier** les espaces Unicode (`U+00A0`, `U+202F`, `U+2000-200A`, `U+3000`) vers l'espace ASCII.
3. **Normaliser NFKC** (replie chiffres pleine chasse et ligatures/homoglyphes de compatibilité).

⚠️ Subtilité **offsets** : la normalisation peut changer la longueur du texte ; les `start/end`
renvoyés servent au caviardage sur le texte **original** (`analyze.ts:59`). Il faut soit scanner le
texte normalisé **en conservant une carte d'index** vers l'original, soit — plus simple et sûr —
n'utiliser la version normalisée que pour **décider** (block/allow) et élargir la redaction au
segment original correspondant. À concevoir avant implémentation : ce n'est pas un one-liner, d'où
le classement « recommandation » et non « correctif appliqué ».

---

## E. Ce qui a été testé et s'est révélé **SOLIDE**

Confirmé par le bloc `describe('SOLIDE — détections robustes')` (régressions permanentes) :

- **Clés API** brutes en contexte : AWS `AKIA…`, OpenAI `sk-…`, tokens JWT/`Bearer`.
- **IBAN** contigu **et** espacé ASCII (avec garde-fou mod-97 : un IBAN au checksum faux est rejeté).
- **Carte** contiguë, espacée **et** tiretée ASCII (avec Luhn : un n° de commande de 16 chiffres passe).
- **IP RFC1918** au format canonique (une IP publique `8.8.8.8` est ignorée).
- **E-mail pro** sur domaine exact, insensible à la casse.
- **Téléphone FR** national contigu/espacé, **NBSP toléré** (la classe `\s` du motif téléphone
  couvre l'insécable — c'est précisément ce qui manque à IBAN/carte), et désormais **`+33`
  international** (correctif A1).
- **Robustesse taille** : le chunking (`limits.ts`) couvre tout le texte ≤ 2 Mo sans perte ; au-delà,
  troncature **signalée** à l'utilisateur (`wasTextTruncated`).
- **Pas de faux positifs** sur texte anodin, suites de chiffres non-cartes, IP publiques.

Le cœur « fuite accidentelle d'un secret collé » est correctement couvert. Les trous restants sont
soit des **formats de séparation** inhabituels (B1/B2, corrigeables), soit des **évasions
délibérées** (C1) hors périmètre d'un DLP local côté client.
