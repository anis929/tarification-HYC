/**
 * HYC — Générateur de devis → Google Sheets
 * ------------------------------------------
 * Ce script reçoit les devis envoyés par le générateur (index.html)
 * au moment de l'export PDF, et les ajoute en ligne dans un Google Sheet.
 *
 * INSTALLATION (5 minutes) :
 *  1. Ouvrez (ou créez) votre Google Sheet de suivi des devis.
 *  2. Menu « Extensions » → « Apps Script ».
 *  3. Supprimez le contenu de Code.gs et collez ce fichier entier.
 *  4. Cliquez « Déployer » → « Nouveau déploiement » → type « Application Web » :
 *       - Description : HYC devis
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde   (obligatoire pour recevoir depuis le site)
 *  5. Autorisez le script, puis copiez l'URL qui se termine par /exec.
 *  6. Dans le générateur de devis : onglet « Tarifs » → « Réglages »
 *     → collez l'URL dans « Google Sheets — URL du Web App Apps Script ».
 *
 * ⚠️ Après toute modification du script, refaites « Déployer »
 *    → « Gérer les déploiements » → ✏️ → « Nouvelle version », sinon
 *    l'URL /exec continue de servir l'ancienne version.
 */

// Laisser vide si le script est lié au classeur (créé via Extensions → Apps Script).
// Sinon, collez ici l'ID du classeur (la partie entre /d/ et /edit dans son URL).
var SHEET_ID = "";

// Nom de l'onglet où les devis sont ajoutés (créé automatiquement s'il n'existe pas).
var SHEET_NAME = "Devis";

var HEADERS = [
  "Horodatage",
  "Date d'export",
  "Référence",
  "Client",
  "Titre de la mission",
  "Responsable HYC",
  "Type de projet",
  "Mode de devis",
  "Prestations",
  "CA catalogue HT (€)",
  "Prix de vente HT (€)",
  "Remise HT (€)",
  "TVA (%)",
  "Total TTC (€)",
  "Charges PdS (€)",
  "Temps de gestion (€)",
  "Frais annexes (€)",
  "Total charges (€)",
  "Marge brute (€)",
  "Taux de marque (%)",
  "Taux de marge (%)"
];

/** Point d'entrée : POST envoyé par le générateur de devis. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      data.date || "",
      data.ref || "",
      data.client || "",
      data.titre || "",
      data.responsable || "",
      data.typeProjet || "",
      data.modeDevis || "",
      data.prestations || "",
      num_(data.caCatalogueHT),
      num_(data.prixVenteHT),
      num_(data.remiseHT),
      num_(data.tvaPct),
      num_(data.totalTTC),
      num_(data.chargesPds),
      num_(data.chargesGestion),
      num_(data.fraisAnnexes),
      num_(data.totalCharges),
      num_(data.margeBrute),
      num_(data.tauxMarquePct),
      num_(data.tauxMargePct)
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Permet de tester l'URL /exec dans un navigateur. */
function doGet() {
  return json_({ ok: true, message: "Webhook HYC actif — les devis exportés en PDF seront ajoutés à l'onglet « " + SHEET_NAME + " »." });
}

/** Récupère (ou crée) l'onglet cible, avec sa ligne d'en-têtes. */
function getSheet_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Classeur introuvable : liez le script à un Google Sheet ou renseignez SHEET_ID.");
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#E9F9F2");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function num_(v) {
  if (v === "" || v == null) return "";
  var n = Number(v);
  return isFinite(n) ? n : "";
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
