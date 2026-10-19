# Notice salarié — modèle (FR)

*Modèle pour les organisations qui déploient Shadow AI Sentinel. Adapter les parties entre
crochets. L'extension affiche une notice équivalente une fois, au premier usage.*

[Organisation] a déployé l'extension navigateur **Shadow AI Sentinel** pour limiter l'envoi
accidentel de données sensibles (clés d'API, secrets, IBAN, cartes bancaires, données personnelles)
vers les IA publiques telles que ChatGPT, Claude, Gemini, Le Chat, DeepSeek, Perplexity, Grok et
Copilot.

## Ce que fait l'extension

- Analyse votre saisie et vos pièces jointes (texte, code, PDF, DOCX, XLSX, PPTX) **localement, dans votre
  navigateur**, avant envoi.
- Peut **bloquer** le message ou **remplacer** une valeur sensible par un jeton (`[REDACTED_…]`).

## Ce qui n'est pas collecté

- L'extension n'établit **aucune connexion réseau**. Rien — ni le contenu de vos messages, ni
  aucune métadonnée — n'est transmis à [Organisation] ni aux auteurs de l'extension.
- Seuls des compteurs locaux (nombre de blocages / masquages) sont conservés dans votre navigateur.

## Vos droits

Questions : [contact service sécurité / DPO]. Le code source est public :
https://github.com/chemGT/shadow-ai-sentinel
