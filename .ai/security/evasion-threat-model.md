# Modèle de menace — évasions du moteur DLP local

**Date :** 2026-09-15 · **Périmètre :** moteur de détection `src/core/detection/**` +
pipeline `src/core/regex-engine.ts` + interception content-script
(`src/extension/sites/shared/{guard-adapter,file-guard}.ts`, `src/extension/content/analyze.ts`).
**Méthode :** chaque affirmation ci-dessous est vérifiée sur le **code réel** (regex copiées à
l'identique et exécutées) ; les cas confirmés par exécution sont repris dans le corpus de tests
`src/core/detection/evasion-corpus.test.ts` et le rapport `bypasses-2026-09.md`.

## 0. Rappel du fonctionnement (surface d'attaque)

- L'interception se déclenche sur **trois événements seulement** : `keydown` (Enter **sans**
  modificateur, hors composition IME), `click` sur le bouton d'envoi, et sur les fichiers
  (`change` / `drop` / `paste`) — cf. `guard-adapter.ts:133-165`, `file-guard.ts:286-363`.
- Le texte analysé est celui **extrait du composer** (`extractTextFromInput` :
  `textarea.value` ou `innerText/textContent` — `input-text.ts:1-6`).
- Détection = **regex + validateurs** (Luhn pour carte, mod-97 pour IBAN, format FR pour phone),
  **aucune** couche de décodage (base64/hex/URL), **aucune** normalisation Unicode, **aucun** OCR.
- Modèle freemium : en **Free**, seules `api_key` + `generic_secret` sont actives et **le scan de
  fichiers est entièrement désactivé** (`file-guard.ts:199-201`). Tout le reste (IBAN, carte,
  téléphone, IP, e-mail, fichiers) ne s'active qu'en **Pro**. Ce n'est pas un contournement mais la
  surface d'exposition par défaut à garder en tête.

**Faisabilité** — barème utilisé : *Accidentel* (fuite sans intention, ex. format de copier-coller
courant) · *Facile* (une manipulation triviale, sans outil) · *Délibéré* (nécessite un encodage /
un outil / une intention claire de contourner).

---

## 1. Encodages (aucune couche de décodage)

Le moteur ne décode **rien** avant de scanner. Toute transformation réversible du secret le rend
invisible. Vérifié : `base64("AKIA…")`, `hex("AKIA…")`, URL-encoding → **0 détection**.

| Vecteur | Mécanisme | Faisabilité | Impact | Détecté ? |
|---|---|---|---|---|
| **base64** intégral | `QUtJQUlPU0ZP…` ne matche aucun motif | Délibéré | La donnée part | ❌ Non |
| **base64 partiel** | seule une portion du secret est encodée | Délibéré | Part | ❌ Non |
| **hex** | `414b4941…` | Délibéré | Part | ❌ Non |
| **URL-encoding** | `AKIA%20IOSF…` (le `%20` casse le `\b…\b`) | Délibéré | Part | ❌ Non |
| **double-encodage** | base64(base64(x)) | Délibéré | Part | ❌ Non |
| **JSON échappé** | `"AK…"` — la chaîne source ne contient pas les octets | Délibéré | Part | ❌ Non |

**Analyse.** Attendu par conception : un décodeur généraliste exploserait les faux positifs et le
coût CPU. C'est un **choix assumé**, pas un bug — mais il doit être documenté comme limite connue :
un utilisateur qui *veut* exfiltrer y parvient trivialement. La valeur du produit est de bloquer la
**fuite par inadvertance** (copier-coller d'un `.env`), pas l'exfiltration motivée. À ne pas vendre
comme une barrière anti-malveillant.

---

## 2. Manipulations de chaîne

| Vecteur | Mécanisme (référence code) | Faisabilité | Impact | Détecté ? |
|---|---|---|---|---|
| **Découpage sur plusieurs lignes** | `AKIA\nIOSF…` : le motif est contigu, `\n` casse le match (`api-key.ts:7`) | Facile | Part | ❌ Non |
| **Découpage sur plusieurs messages** | moitié dans msg 1, moitié dans msg 2 : chaque envoi est scanné isolément (`guard-adapter.ts:97`) | Facile | Part | ❌ Non |
| **Séparateurs internes (secret)** | insérer espaces/tirets dans une clé `AKIA-IOSF-…` : casse `[0-9A-Z]{16}` | Facile | Part | ❌ Non |
| **Séparateurs (IBAN/carte)** | voir §5 : tiret sur IBAN, point sur carte → **non détecté** | Accidentel/Facile | Part | ❌ Non |
| **Casse alternée** | `sK-AbC…` : motifs `api_key` **sensibles à la casse** (`api-key.ts`, pas de flag `i`) | Facile | Part | ❌ Non* |
| **Inversion** | `ELPMAXE7NNDOFSOIAIKA` | Délibéré | Part | ❌ Non |
| **Enrobage mot** | `_AKIAIOSFODNN7EXAMPLE_` : `_` est un caractère `\w`, la frontière `\b` **échoue** | Facile | Part | ❌ Non |

*Casse : altérer la casse d'une clé la rend **invalide en tant que clé réelle** (une vraie clé AWS
est en casse fixe) — le « contournement » exfiltre alors une donnée qui n'est plus le secret. Faible
gravité pratique, mais l'`\b`-enrobage par `_` (`api-key.ts:7-20`) est un vrai trou : `x=_AKIA…_`
passe alors que la clé est intacte.

**Cause racine transverse.** Toutes les frontières `\b` des motifs `api_key` échouent dès qu'un
caractère `\w` (lettre, chiffre, `_`) jouxte le secret sans espace. Les détecteurs `iban`/`card`/
`phone` sont plus robustes car ils tolèrent des séparateurs internes — mais de façon **incohérente**
(voir §5).

---

## 3. Unicode

Le moteur **ne normalise pas** (`grep normalize|NFK` → aucune normalisation dans le pipeline de
détection). Point clé vérifié : la classe regex `\s` (utilisée par `phone.ts:5`) **matche** NBSP
(U+00A0), NNBSP (U+202F), espace fine (U+2009), BOM/ZWNBSP (U+FEFF) — mais **pas** ZWSP (U+200B).
Les détecteurs `iban.ts:10` et `card.ts:12` utilisent au contraire des classes **littérales**
(`[ ]`, `[ -]`) qui ne tolèrent **aucun** de ces caractères.

| Vecteur | Mécanisme | Faisabilité | Impact | Détecté ? |
|---|---|---|---|---|
| **Zero-width (U+200B) dans le secret** | `AKIA​IOSF…` : coupe tout motif contigu ; `\s` ne le couvre pas | Délibéré | Part | ❌ Non |
| **BOM / ZWNBSP (U+FEFF) intercalé** | idem, coupe les motifs `api_key`/`card`/`iban` | Délibéré | Part | ❌ Non |
| **NBSP comme séparateur — carte/IBAN** | `4111 1111…` / `DE89 3704…` en NBSP → **non détecté** (classes littérales) | **Accidentel** | Part | ❌ Non |
| **NBSP comme séparateur — téléphone** | `\s` couvre NBSP → **détecté** | — | — | ✅ Oui |
| **Homoglyphes cyrillique/grec** | `АKIA` (А = U+0410) : n'est plus le motif ASCII | Délibéré | Part | ❌ Non |
| **Chiffres pleine chasse** | `４111 1111…` : `\d` ne matche pas U+FF14 → le préfixe saute | Délibéré | Part | ❌ Non |
| **NFKC vs NFD** | le secret décomposé (NFD) diffère octet-à-octet du motif ASCII | Délibéré | Part | ❌ Non |
| **RLO/LRO (U+202E/202D)** | inverse l'affichage sans changer l'ordre logique — n'aide pas à contourner un scan *logique* ; sert surtout à **tromper l'humain** qui relit | Délibéré | Variable | N/A |
| **Combinants / ligatures** | `ﬁ` (U+FB01) etc. : non pertinent pour des secrets ASCII | Délibéré | Part | ❌ Non |

**Cas « le site normalise lui-même ».** Certains composers appliquent une normalisation NFC ou
suppriment les zero-width au collage. Deux conséquences opposées : (a) si le site **retire** les
zero-width, le texte redevient détectable — mais l'extension lit le composer *avant* soumission,
donc elle voit le texte tel que présent dans le DOM à ce instant ; (b) si le site normalise NFKC des
homoglyphes (rare), idem. En pratique **le moteur voit ce que `extractTextFromInput` lit dans le
DOM** au moment du guard — il n'y a pas de seconde passe. Un site qui reconstruit le payload au
`submit` (voir §4) est le vrai risque.

**Recommandation de fond.** Une **normalisation défensive avant scan** (strip des zero-width +
NFKC + repli des espaces Unicode vers l'espace ASCII) fermerait d'un coup les lignes NBSP/ZWSP/
pleine-chasse/homoglyphes-compatibilité **sans** faux positif sur du texte légitime. C'est le
correctif à plus fort levier (voir `bypasses-2026-09.md`).

---

## 4. Contexte de formulaire (interception DOM)

Le guard n'intercepte que 3 déclencheurs (cf. §0). Tout chemin d'envoi qui les évite fait fuiter.

| Vecteur | Mécanisme (référence code) | Faisabilité | Impact | Détecté ? |
|---|---|---|---|---|
| **Collage direct de texte** | pas d'écouteur `paste` sur le *texte* (seulement sur les fichiers, `file-guard.ts:337`) → le texte collé n'est scanné qu'au **moment de l'envoi** (Enter/clic). C'est OK **si** l'envoi passe par un des 3 déclencheurs. | — | — | ✅ à l'envoi |
| **Ctrl/Cmd/Alt/Shift + Enter** | `guard-adapter.ts:134` : `return` si un modificateur est présent → **aucun scan** sur ce keydown | Facile | Part si le site envoie ainsi | ❌ Non (keydown) |
| **Composition IME** | `event.isComposing` → `return` (`guard-adapter.ts:137`) | Facile | Part si envoi pendant compo | ❌ Non |
| **`execCommand('insertText')`** | c'est le chemin d'**écriture** de la redaction (`input-text.ts:27`), pas un vecteur d'entrée ; sans impact sur la détection | — | — | N/A |
| **Saisie caractère-par-caractère** | sans impact : le scan lit l'état final du composer à l'envoi | — | — | ✅ |
| **`paste` bloqué par le site** | si le site empêche le collage, l'utilisateur tape — sans impact | — | — | ✅ |
| **iframe** | le content-script est injecté selon `manifest.json:42-57` **sans `all_frames`** → **seul le top-frame** est protégé. Un composer dans une iframe même-origine ou un widget tiers **n'est pas scanné** | Délibéré/Variable | Part | ❌ Non |
| **shadow DOM** | l'écoute est en capture au niveau `document` ; un envoi encapsulé qui ne rebulle pas jusqu'au `document`, ou un composer trouvé par des sélecteurs qui ne descendent pas dans le shadow (`selectors.ts`) échappe | Variable | Part | ⚠️ dépend du site |
| **`contenteditable` non standard** | `extractTextFromInput` lit `innerText ?? textContent` (`input-text.ts:5`) ; un éditeur qui stocke la valeur ailleurs (ex. state React sérialisé au submit) peut diverger de l'`innerText` scanné | Variable | Part | ⚠️ dépend |
| **Site remplace l'input au submit** | si le payload réel est reconstruit en JS au `submit`/`fetch` à partir d'un state non reflété dans le DOM, le scan (qui lit le DOM) voit autre chose que ce qui part | Délibéré | Part | ❌ Non |
| **`fetch`/`XHR` direct depuis la page** | script utilisateur / devtools postant vers l'API du LLM sans passer par le composer → **jamais** intercepté (l'extension n'observe pas le réseau) | Délibéré | Part | ❌ Non |
| **Sélecteurs cassés (drift du site)** | `findComposerInput`/`isSendButtonTarget` renvoient `null` si le site change son DOM ; le `adapter-health-monitor` le détecte et applique `fail_mode` (défaut **`warn`** = **fail-open**, `guard-adapter.ts:180`) | Accidentel (côté éditeur) | Part | ⚠️ fail-open par défaut |

**Analyse.** Ces vecteurs sont **structurels** (propres à une extension MV3 qui s'accroche au DOM
d'un site tiers) et non testables hors E2E. Les plus préoccupants en pratique : **(a)** `fail_mode`
par défaut = `warn` (fail-open) — une simple mise à jour du site désarme silencieusement le DLP ;
**(b)** l'envoi par modificateur clavier (Ctrl+Enter est un raccourci d'envoi sur plusieurs sites) ;
**(c)** absence d'`all_frames`.

---

## 5. Détecteurs : faux négatifs des regex (vérifiés par exécution)

Résultats obtenus en exécutant les motifs **exacts** du code sur des valeurs à checksum **valide**.

### 5.1 Téléphone — `phone.ts` — **trou majeur, non adversarial**
Motif FR : `/\b(?:(?:\+33|0033)…|0[1-9]…)\b/` (`phone.ts:4-5`) ; E.164 :
`/\+[1-9]\d{7,14}\b/` avec, dans le code, l'exclusion `!value.startsWith('+33')` (`phone.ts:55`).

- `+33612345678` (international contigu) → **❌ non détecté**.
- `+33 6 12 34 56 78` (international espacé, format **standard**) → **❌ non détecté**.
- `+33.6.12.34.56.78` (international pointé) → **❌ non détecté**.
- `0612345678`, `06 12 34 56 78` (national) → ✅ détecté.

**Cause racine** (`phone.ts:4` + `phone.ts:55`) : le motif FR commence par `\b`, or `\b` **ne peut
pas** exister juste avant un `+` précédé d'un espace ou d'un début de chaîne (`+` et espace sont tous
deux non-`\w`). Le motif FR ne matche donc **jamais** un numéro `+33…` en contexte réel. En parallèle,
le motif E.164 **exclut explicitement** `+33`, en supposant à tort que le motif FR le couvre. Résultat :
**aucun** des deux ne voit un numéro français au format international. Faisabilité **Accidentelle**
(c'est le format d'un carnet de contacts). ✅ **Correctif appliqué** (voir `bypasses-2026-09.md`).

### 5.2 IBAN — `iban.ts:10`
Motif : `…(?:[ ]?[A-Z0-9]{4}){2,7}…` — séparateur = **espace ASCII littéral uniquement**.

- `DE89370400440532013000` (contigu) → ✅.
- `DE89 3704 0044 0532 0130 00` (espaces ASCII) → ✅.
- `DE89-3704-0044-0532-0130-00` (**tirets**) → **❌ non détecté**.
- `DE89 3704…` (**NBSP**) → **❌ non détecté**.

**Cause racine** `iban.ts:10` : classe `[ ]` littérale. Le tiret est un formatage IBAN plausible ;
le NBSP arrive par copier-coller depuis Word/PDF/pages web à typographie française. Le checksum
mod-97 (`iban.ts:12`) reste un garde-fou fort → ajouter ces séparateurs est **peu risqué en FP**.

### 5.3 Carte bancaire — `card.ts:12`
Motif : `/\b(?:\d[ -]?){12,18}\d\b/` — séparateur = **espace ASCII ou tiret**.

- `4111 1111 1111 1111`, `4111-1111-1111-1111`, `4111111111111111` → ✅.
- `4111.1111.1111.1111` (**points**) → **❌ non détecté**.
- `4111 1111…` (**NBSP**) → **❌ non détecté**.

**Cause racine** `card.ts:12` : classe `[ -]` littérale. ⚠️ **Attention FP** : ajouter le **point**
comme séparateur ferait matcher des numéros de version, ratios, séquences pointées de 13-19 chiffres
qui passent Luhn par hasard (~10 %) — **à ne pas faire** dans du contexte code. Le **NBSP** en
revanche (whitespace pur) est sûr.

### 5.4 E-mail pro — `pro-email.ts:8-17`
Motif : `\b([a-z0-9._%+-]{1,64}@(?:<domaines>))\b`.

- `jean@acme.com`, `jean@ACME.COM` (casse) → ✅.
- `jean@sub.acme.com` (**sous-domaine**, ex. `@mail.acme.com`, `@eu.acme.com`) → **❌ non détecté**.

**Cause racine** `pro-email.ts:14` : le `@` doit précéder **immédiatement** le domaine configuré ;
aucun `(?:[a-z0-9-]+\.)*` n'autorise les sous-domaines. Un e-mail corporate sur sous-domaine échappe.
Gravité moyenne, dépend de la config admin.

### 5.5 api_key / generic_secret — bornes
- `api_key` **sensible à la casse**, frontières `\b` (§2) → enrobage `_` et zero-width contournent.
- `sk-` plafonné à 255 caractères (`api-key.ts:9`) : un secret > 255 après `sk-` → ❌ (faible : les
  vraies clés sont plus courtes).
- `generic_secret` : `Bearer`/`Basic` **sensibles à la casse** (`generic-secret.ts:6-7`) ; JWT exige
  **3 segments** `eyJ…` (`generic-secret.ts:8`) — un token opaque non-JWT n'est pas couvert (attendu).

### 5.6 IP interne — `internal-ip.ts:4`
Motif ancré sur les plages RFic1918 avec `\b…\b` et points littéraux `\.`. Un `192 . 168 . 1 . 5`
espacé n'est pas détecté (format non réaliste → faible). Robuste sur le format canonique.

---

## 6. Limites du moteur (taille / chunking / troncature)

Références : `limits.ts`, `regex-engine.ts:15-29`.

| Mécanisme | Comportement | Impact évasion |
|---|---|---|
| **Fenêtres de 100k (`DETECTION_CHUNK_SIZE`)** | scan par fenêtres chevauchantes ; couvre **tout** le texte ≤ plafond, sans perte | Pas d'évasion par simple bourrage < 2M (corrigé, cf. test `limits`) |
| **Chevauchement 10k (`DETECTION_CHUNK_OVERLAP`)** | un secret > 10k à cheval sur une frontière serait manqué ; or le plus long motif ≈ 8.7k (JWT) | Non exploitable pour les secrets courts |
| **Plafond absolu 2M (`MAX_DETECTION_TOTAL_LENGTH`)** | au-delà, troncature **réelle** : tout secret placé après 2M de bourrage **échappe** — mais un **avertissement** `wasTextTruncated` est levé (`analyze.ts:30`, toast `guard-adapter.ts:100`) | ⚠️ Évasion par bourrage > 2M, **signalée** à l'utilisateur (détectable) |
| **Fichier texte : 5 Mo (`text-file.ts:2`)** | au-delà, `readFileAsText` rejette → `processTextFile` renvoie `{status:'ok'}` (**fail-open silencieux**, `file-guard.ts:143-147`) | ❌ Un `.txt`/`.csv` > 5 Mo avec secret **passe sans avertissement** |
| **Fichier binaire : 10 Mo (`binary-file.ts:2`)** | au-delà → `warn` + laisser passer (`file-guard.ts:163-165`) | ⚠️ PDF/DOCX > 10 Mo passe (averti) |

**Note importante** : un `.txt` > 5 Mo est **fail-open silencieux** (`catch → status ok`), alors
qu'un texte collé > 2 Mo est fail-open **avec avertissement**. Incohérence à corriger (au minimum
émettre le même toast de troncature pour le fichier texte trop volumineux).

---

## 7. Fichiers (Pro uniquement)

Références : `file-guard.ts`, `binary-extract.ts`, `text-file.ts`, `binary-file.ts`.

| Vecteur | Mécanisme | Faisabilité | Impact | Détecté ? |
|---|---|---|---|---|
| **Format non scanné** | seuls texte/PDF/DOCX sont scannés (`file-guard.ts:277-284`). **XLSX, PPTX, RTF, ODT, images, ZIP/archives, binaires** → `isScannableFile` faux → **passent sans scan** | Facile | Part | ❌ Non |
| **PDF image (sans couche texte)** | `extractPdfText` lit `getTextContent()` (`binary-extract.ts:42`), **pas d'OCR** → texte vide → `allow` | Facile (scan→PDF) | Part | ❌ Non |
| **PDF chiffré / corrompu** | `extractBinaryText` throw → `catch` → `warn` + **laisser passer** (`file-guard.ts:168-171`) | Facile | Part | ⚠️ Averti |
| **DOCX : commentaires** | `mammoth.extractRawText` (`binary-extract.ts:60`) lit `document.xml` (corps) ; les **commentaires** (`comments.xml`) ne sont pas extraits → secret en commentaire **échappe** | Délibéré | Part | ❌ Non* |
| **DOCX : suivi de modifications** | texte **supprimé** (`w:delText`) n'est pas rendu par `extractRawText` ; le secret « supprimé » mais présent dans le fichier échappe | Délibéré | Part | ❌ Non* |
| **Secret scindé corps + PJ** | chaque flux est scanné isolément (`file-guard.ts` vs `guard-adapter.ts`) ; une moitié dans le message, l'autre dans un `.txt` → aucun ne matche | Facile | Part | ❌ Non |
| **Extension trompeuse** | un binaire renommé `.txt` → `readFileAsText` le lit comme texte (souvent illisible → pas de match) ; un `.pdf` réel non affecté | Variable | Part | ⚠️ |
| **Free tier** | scan fichiers **désactivé** (`file-guard.ts:199-201`) → tout fichier passe en Free | — (gating) | Part | ❌ (par design) |

*DOCX commentaires / suivi de modifications : gap **architectural** déduit du comportement de
`mammoth.extractRawText` ; marqué « à confirmer par fixture » dans le corpus (non confirmé par
exécution faute de fixture binaire — le reste des lignes fichiers est confirmé par le code / les
tests existants `file-guard.test.ts`).

---

## 8. Synthèse — priorisation

**Confirmés par exécution, corrigeables proprement (faible risque FP) :**
1. `+33…` téléphone (tous formats) — **corrigé** dans ce lot.
2. IBAN séparé par tirets / NBSP — normalisation défensive recommandée.
3. Carte séparée par NBSP (pas le point) — normalisation défensive recommandée.
4. Zero-width / homoglyphes de compatibilité — fermés par une passe NFKC + strip zero-width.

**Confirmés, à documenter (correctif risqué ou hors regex) :**
5. `pro_email` sous-domaines.
6. `.txt` > 5 Mo fail-open silencieux.
7. Formats fichiers non scannés (XLSX/archives/images), PDF image, PDF chiffré, DOCX commentaires.

**Limites assumées (ne pas « corriger », documenter comme périmètre) :**
8. Encodages (base64/hex/URL), inversion, découpage volontaire, `fetch` direct, iframe/shadow DOM,
   envoi par modificateur clavier, `fail_mode` par défaut fail-open, Free tier.

La ligne directrice : le produit protège contre la **fuite par inadvertance** et l'utilisateur
négligent, **pas** contre un initié déterminé. Les corrections à mener en priorité sont celles qui
ferment des **fuites accidentelles** (formats de copier-coller courants : `+33`, NBSP, tirets IBAN)
— pas la course sans fin contre l'encodage volontaire.
