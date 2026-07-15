/**
 * HYC — Générateur de devis → Google Sheets
 * ------------------------------------------
 * Ce script fait deux choses :
 *  1. DEVIS : reçoit les devis envoyés par le générateur (index.html) au moment
 *     de l'export PDF et les ajoute en ligne dans l'onglet « Devis ».
 *  2. TARIFS PARTAGÉS : stocke la configuration de l'outil (catalogue, tarifs
 *     PdS, équipe, frais, réglages). Chaque modification faite dans l'onglet
 *     « Tarifs » de l'outil est publiée ici automatiquement, et l'outil
 *     recharge la dernière version à chaque ouverture — toute l'équipe voit
 *     donc toujours les mêmes tarifs.
 *
 * INSTALLATION / MISE À JOUR :
 *  1. Ouvrez votre Google Sheet → « Extensions » → « Apps Script ».
 *  2. Remplacez tout le contenu de Code.gs par ce fichier.
 *  3. « Déployer » → « Gérer les déploiements » → ✏️ → Version : « Nouvelle
 *     version » → « Déployer ». (Première installation : « Nouveau
 *     déploiement » → « Application Web », Exécuter en tant que : Moi,
 *     Qui a accès : Tout le monde.)
 *  4. L'URL /exec ne change pas si vous mettez à jour un déploiement existant.
 *
 * ⚠️ Sans « Nouvelle version », l'URL /exec continue de servir l'ancien code.
 */

// Laisser vide si le script est lié au classeur (créé via Extensions → Apps Script).
// Sinon, collez ici l'ID du classeur (la partie entre /d/ et /edit dans son URL).
var SHEET_ID = "";

// Nom de l'onglet où les devis sont ajoutés (créé automatiquement s'il n'existe pas).
var SHEET_NAME = "Devis";

// PIN exigé pour publier de nouveaux tarifs. Doit correspondre au champ
// « Code d'accès (PIN) » des réglages de l'outil (onglet Tarifs → Réglages).
var PIN = "hyc2026";

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

/** Point d'entrée POST : devis exporté OU publication des tarifs. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "saveConfig") return saveConfig_(data);
    return appendQuote_(data);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Point d'entrée GET :
 *  - ?action=config → renvoie la dernière configuration de tarifs publiée
 *    (config: null si rien n'a encore été publié) ;
 *  - sinon → message de test.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "config") {
    var raw = loadConfigRaw_();
    return textJson_('{"ok":true,"config":' + (raw || "null") + "}");
  }
  return json_({ ok: true, message: "Webhook HYC actif — enregistrement des devis + tarifs partagés." });
}

/* ---------------------- devis ---------------------- */

function appendQuote_(data) {
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
}

/** Récupère (ou crée) l'onglet des devis, avec sa ligne d'en-têtes. */
function getSheet_() {
  var ss = openSs_();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#E9F9F2");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ---------------------- tarifs partagés ---------------------- */
// La configuration est stockée dans les propriétés du script (découpée en
// morceaux, car chaque propriété est limitée à ~9 Ko).

var CONFIG_KEY = "HYC_CONFIG_";
var CONFIG_COUNT_KEY = "HYC_CONFIG_COUNT";
var CONFIG_CHUNK = 4000;

function saveConfig_(data) {
  if (String(data.pin || "") !== PIN) return json_({ ok: false, error: "PIN incorrect — publication refusée." });
  if (!data.config || !data.config.products || !data.config.projectTypes) return json_({ ok: false, error: "Configuration invalide." });
  var json = JSON.stringify(data.config);
  var props = PropertiesService.getScriptProperties();
  var old = Number(props.getProperty(CONFIG_COUNT_KEY) || 0);
  var updates = {}, n = 0;
  for (var i = 0; i < json.length; i += CONFIG_CHUNK) { updates[CONFIG_KEY + n] = json.substr(i, CONFIG_CHUNK); n++; }
  updates[CONFIG_COUNT_KEY] = String(n);
  props.setProperties(updates, false);
  for (var j = n; j < old; j++) props.deleteProperty(CONFIG_KEY + j);
  return json_({ ok: true, saved: true });
}

function loadConfigRaw_() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty(CONFIG_COUNT_KEY) || 0);
  if (!n) return null;
  var parts = [];
  for (var i = 0; i < n; i++) {
    var p = props.getProperty(CONFIG_KEY + i);
    if (p == null) return null;
    parts.push(p);
  }
  var json = parts.join("");
  try { JSON.parse(json); } catch (err) { return null; }
  return json;
}

/* ---------------------- utilitaires ---------------------- */

function openSs_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Classeur introuvable : liez le script à un Google Sheet ou renseignez SHEET_ID.");
  return ss;
}

function num_(v) {
  if (v === "" || v == null) return "";
  var n = Number(v);
  return isFinite(n) ? n : "";
}

function textJson_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return textJson_(JSON.stringify(obj));
}
