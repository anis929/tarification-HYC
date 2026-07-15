# Tarification HYC — Générateur de devis

Générateur de devis Hack Your Care en un seul fichier : [`index.html`](index.html)
(CA, charges, marge et export PDF du devis client).

## Voir le site

Le site est servi à la racine du dépôt via `index.html` :

- **Vercel** : https://tarification-hyc.vercel.app (redéployé automatiquement à chaque push sur `main`).
- **GitHub Pages** (optionnel) : dans le dépôt → *Settings* → *Pages* → *Deploy from a branch* →
  branche `main`, dossier `/ (root)`. Le site sera disponible sur
  `https://anis929.github.io/tarification-HYC/`.

> ℹ️ Si le site affichait une erreur 404 : le dépôt ne contenait pas de `index.html`
> (seulement `hyc-devis-apercu (5).html`), donc ni Vercel ni GitHub Pages n'avaient
> de page d'accueil à servir. C'est corrigé par ce commit.

## Export vers Google Sheets

À chaque **export PDF** d'un devis, l'application envoie aussi une ligne de synthèse
(référence, client, prestations, CA, prix de vente, TVA, charges, marge, taux de
marque/marge…) vers un Google Sheet, via un Web App Google Apps Script.

### Installation

1. Ouvrez (ou créez) votre Google Sheet de suivi des devis.
2. Menu **Extensions → Apps Script**.
3. Collez le contenu de [`apps-script/Code.gs`](apps-script/Code.gs) dans `Code.gs`.
4. **Déployer → Nouveau déploiement → Application Web** :
   - *Exécuter en tant que* : **Moi**
   - *Qui a accès* : **Tout le monde**
5. Copiez l'URL du déploiement (elle se termine par `/exec`).
6. Dans le générateur : onglet **Tarifs → Réglages** → collez l'URL dans le champ
   **« Google Sheets — URL du Web App Apps Script »**, puis exportez un devis pour tester.

Une feuille `Devis` est créée automatiquement avec les en-têtes ; chaque export ajoute une ligne.

> ⚠️ Après toute modification du script, refaites *Déployer → Gérer les déploiements →
> ✏️ → Nouvelle version*, sinon l'URL `/exec` sert l'ancienne version.
> Champ laissé vide = envoi désactivé (l'export PDF fonctionne normalement).

## Tarifs partagés (mise à jour automatique de l'outil)

Les tarifs (catalogue, rémunérations PdS, équipe, frais, réglages) sont **partagés
par toute l'équipe** via le même script Apps Script :

- Chaque modification dans l'onglet **Tarifs** est **publiée automatiquement**
  (~2 secondes après la dernière saisie) — le statut en bas de page confirme
  « Tarifs publiés — visibles par toute l'équipe ».
- À chaque ouverture de la page, l'outil **recharge les derniers tarifs publiés**
  (puis se rafraîchit périodiquement). Un cache local (`localStorage`) permet un
  affichage instantané et un mode hors ligne.
- La publication est protégée par le **PIN** : la constante `PIN` dans
  `apps-script/Code.gs` doit correspondre au champ « Code d'accès (PIN) » des
  réglages de l'outil (par défaut `hyc2026`). Si vous changez l'un, changez l'autre.

> ⚠️ Cette fonction nécessite la dernière version de `apps-script/Code.gs` :
> après l'avoir collée dans l'éditeur Apps Script, faites *Déployer → Gérer les
> déploiements → ✏️ → Nouvelle version* (l'URL `/exec` ne change pas). Tant que
> le script n'est pas à jour, l'outil affiche « Script Google à mettre à jour »
> et ne publie rien.
