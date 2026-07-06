# Plan de vente & déploiement — Shadow AI Sentinel (Lemon Squeezy)

> Runbook Jalon 4, exécutable. Coche au fur et à mesure.
> Branche : `sprint/s1-make-sellable` · Migration code faite (`9b39038`).
> Garde-fous avant chaque build : `npm test` (217) · `npx tsc --noEmit`.

---

## 0. Résumé stratégie (le « pourquoi »)

- **Modèle** : freemium. Extension **gratuite** sur les stores (produit d'appel : secrets/clés API,
  Block/Redact) → tier **Pro** par clé de licence (PII + scan fichiers texte/code + allowlists).
- **Rail** : **Lemon Squeezy** (Merchant of Record → TVA UE + taxe US gérées pour toi).
- **Prix** : abo **5 €/mois** ou **49 €/an** (annuel par défaut, affiché « ~4 €/mois »). Free gratuit à vie.
  Coupon launch **EARLYBIRD -20 %** la 1ʳᵉ année (à créer dans LS → Discounts). Pas de lifetime.
- **Objectif** : MRR récurrent. Les **stores sont le moteur d'acquisition**, pas Lemon Squeezy.
- **Promesse scan à ne PAS dépasser** : « fichiers texte & code (.env, .json, .csv, sources…) ».
  PDF/DOCX/images = roadmap, **pas** au lancement.

---

## 1. Créer le produit Lemon Squeezy  ⏳ BLOQUANT (fais ça en 1er)

Sans les IDs, rien ne se teste en réel.

- [ ] Créer un compte sur https://app.lemonsqueezy.com + créer un **Store**.
- [ ] Store settings → activer le mode **Test** pour l'intégration (bascule en Live à la fin).
- [ ] **New Product** « Shadow AI Sentinel Pro », type **Subscription**.
- [ ] Ajouter 2 variants : **Monthly 5 €** et **Annual 49 €**.
- [ ] Onglet **License keys** du produit → **Enable license keys**.
  - Activation limit : **3** (3 appareils/utilisateur — anti-partage soft).
  - License length : lier à l'abonnement (expire à la fin de l'abo).
- [ ] Récupérer les identifiants (Settings / API ou URL produit) :
  - **Store ID** (numérique) → `VITE_LEMONSQUEEZY_STORE_ID`
  - **Product ID** (numérique) → `VITE_LEMONSQUEEZY_PRODUCT_ID`
  - **Checkout URL** du produit (bouton « Share » / « Buy link ») → `VITE_LEMONSQUEEZY_CHECKOUT_URL`

> Note : l'extension ne fait qu'`activate`/`validate` (API publique, sans secret). Pas besoin
> d'API key secrète côté extension. Une API key n'est nécessaire que pour un futur webhook backend.

---

## 2. Configurer l'env et rebuild

Vite charge automatiquement un fichier `.env` à la racine (préfixe `VITE_`). `.env` est gitignoré.

- [ ] Créer **`C:\Dev\projects\shadow-ai-sentinel\.env`** :
  ```
  VITE_LEMONSQUEEZY_STORE_ID=123456
  VITE_LEMONSQUEEZY_PRODUCT_ID=654321
  VITE_LEMONSQUEEZY_CHECKOUT_URL=https://<ton-store>.lemonsqueezy.com/checkout/buy/<uuid>
  ```
- [ ] `npm test && npx tsc --noEmit`  (doit être vert : 217 tests)
- [ ] `npm run build`          → `dist/`         (Chrome)
- [ ] `npm run build:firefox`  → `dist-firefox/` (Firefox)
- [ ] `npm run package:firefox` → .xpi pour AMO

Fichiers de config concernés (déjà codés) : `src/extension/config.ts`,
`src/core/licensing/verify.ts`, `src/extension/background/license-manager.ts`.

---

## 3. Test E2E licence (test mode Lemon Squeezy)

- [ ] Charger `dist/` en extension non empaquetée (chrome://extensions → Load unpacked).
- [ ] Dans LS (test mode), passer une commande test → récupérer la **clé de licence** reçue.
- [ ] Extension → page **Options** → coller la clé → **Activer**.
  - Attendu : Pro débloqué (règles PII actives + scan fichiers actif). Un `instance_id` est stocké.
- [ ] Vérifier le CTA « Passer Pro » (popup + options) → ouvre bien le **checkout Lemon Squeezy**.
- [ ] Cas négatif : dans LS, mettre l'abonnement en `expired`/`cancelled` → au prochain re-check
  (ou forcer), l'extension rétrograde en Free après la grâce offline (`LICENSE_GRACE_DAYS = 7`).
- [ ] Cas limite : activer la même clé sur un 4e « appareil » (autre profil) → refus `limit_reached`.

---

## 4. Héberger la Privacy Policy (URL publique requise par les stores)

Source prête : `store-assets/privacy-policy.md`.

- [ ] Choisir un hébergement (par simplicité → **GitHub Pages** du repo, ou page de la landing) :
  - Option A : la publier comme page `/privacy` sur la landing (voir §5).
  - Option B : GitHub Pages (`docs/` ou branche `gh-pages`) rendu du markdown.
- [ ] Copier l'**URL publique finale** → à coller dans les formulaires CWS + AMO (§6).

---

## 5. Landing 1 page (marketing + checkout)

Candidat : `apps/portal/app/[locale]/page.tsx` (Next.js, i18n EN/FR déjà en place).

- [ ] Sections : hero (« Le garde-fou entre ton presse-papier et l'IA », détection **100% locale**),
  3 bénéfices, **pricing 3 colonnes** (Free / **Pro ⭐ 49 €·an ~4 €·mois** ou 5 €·mois /
  **Team** en ancre : « 4 €/siège·mois, min 5 sièges — nous contacter », mailto, rien à builder),
  FAQ courte, lien Privacy. Framing ROI : « une seule clé API fuitée coûte plus que 10 ans d'abo ».
- [ ] Bouton « Passer Pro » → **overlay Lemon.js** :
  ```html
  <script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
  <a href="VITE_LEMONSQUEEZY_CHECKOUT_URL?embed=1" class="lemonsqueezy-button">S'abonner</a>
  ```
- [ ] Boutons « Ajouter à Chrome / Firefox » → liens store (dispo après acceptation §6).
- [ ] Déployer (Render, selon ta stack) + noter l'URL.

---

## 6. Soumettre aux stores (lancer tôt — review = plusieurs jours)

Assets prêts dans `store-assets/` : `listing-en.md`, `listing-fr.md`,
`permissions-justification.md`, `screenshots/` (1280×800), `test-values.md`.

- [ ] Bump version : `manifest.json` **et** `manifest.firefox.json` → `0.2.0` (actuellement `0.1.0`).
- [ ] Rebuild (§2) après le bump.
- [ ] **Chrome Web Store** : créer l'item, uploader zip de `dist/`, coller listing EN,
  justif permissions, URL Privacy, screenshots. Soumettre.
- [ ] **Firefox AMO** : uploader le `.xpi`, listing, URL Privacy. Soumettre (signature auto).
- [ ] Récupérer les URLs store → mettre à jour la landing (§5) et `LEMONSQUEEZY_CHECKOUT_URL` si besoin.

---

## 7. Passage en Live + 1er encaissement

- [ ] Lemon Squeezy : passer le store en **Live**, refaire les 2 IDs/URL si différents du test,
  reconstruire l'extension avec le `.env` Live, republier.
- [ ] Faire **1 vraie transaction** (toi en client) → confirmer activation Pro bout en bout.
- [ ] (Optionnel S2) Webhook backend LS `subscription.*` pour analytics/relance — pas requis
  au lancement (la vérif est côté client).

---

## 8. Lancement audience (SEULEMENT une fois §7 OK)

Ne pas gâcher le « launch day » avant que le funnel encaisse.

- [ ] Product Hunt (1 seule fois) · Show HN / Lobsters · r/programming, r/webdev, r/privacy · dev.to.
- [ ] Angle : « I built a **local-only** DLP for AI prompts ».
- [ ] 2-3 articles SEO « éviter de fuiter des secrets dans ChatGPT » (long-tail).

---

## Pièges à éviter
- ❌ Coder PDF/DOCX/OCR avant le 1er client payant (roadmap, pas lancement).
- ❌ Sur-promettre le scan fichiers sur la landing (rester « texte & code »).
- ❌ Committer le `.env` (contient les IDs — gitignoré, garde-le tel quel).
- ❌ Product Hunt avant que l'extension soit live + payante.

## Hors scope (S2)
Offre Team / SaaS multi-tenant · PDF/DOCX/OCR · outreach équipes sécu · lifetime de lancement · webhook LS.
