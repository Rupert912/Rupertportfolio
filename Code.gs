/*
 * ============================================================
 *  RUPERT BURGER — PRIVATE VISIT LOG BACKEND
 *  Google Apps Script (runs free on Google's servers)
 *  Paste this into script.google.com attached to a Google Sheet
 * ============================================================
 *
 *  This file does two jobs:
 *    1. doPost()  — receives visits from visit-log.js and writes rows to the Sheet
 *    2. doGet()   — hands the rows back to your private dashboard, but ONLY
 *                   when the correct DASHBOARD_KEY is supplied
 *
 *  Nobody can read your data without DASHBOARD_KEY. That key never appears
 *  in your website files, so a stranger reading your GitHub repo learns nothing.
 */


/* ============================================================
   1. SETTINGS — change these three lines
   ============================================================ */

// Your private password for viewing the dashboard.
// Make it long and random. Example: "Kx7-fleet-92-Tuiwn-4410"
var DASHBOARD_KEY = "CHANGE-THIS-TO-A-LONG-RANDOM-PASSWORD";

// A second, weaker token that your public JS file sends with every visit.
// This one IS visible to the public. It only exists to block random bots
// from spamming your sheet. Change it, but don't reuse your real password.
var WRITE_TOKEN = "rb-site-2026";

// Store only the first three blocks of the IP (41.13.220.0 instead of 41.13.220.77).
// true is the polite default and keeps you clear of POPIA concerns.
// Set to false only if you have a real reason to keep full IPs.
var MASK_IP = true;


/* ============================================================
   2. Column layout — do not reorder without updating the dashboard
   ============================================================ */

var HEADERS = [
  "When", "Date", "Time", "Page", "Page Title", "Seconds On Page",
  "Country", "City", "Region", "Company / ISP", "Network Domain", "ASN",
  "IP", "Device", "Browser", "OS", "Screen", "Language",
  "Came From", "Visitor ID", "Session ID", "Hit ID", "Visitor Type"
];

var SHEET_NAME = "Visits";


/* ============================================================
   3. Receiving a visit
   ============================================================ */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.token !== WRITE_TOKEN) {
      return reply({ ok: false, error: "bad token" });
    }

    if (body.type === "leave") {
      recordTimeOnPage(body.hitId, body.seconds);
      return reply({ ok: true });
    }

    var sheet = getSheet();
    var now = new Date();
    var tz = "Africa/Johannesburg";

    var ip = String(body.ip || "");
    if (MASK_IP && ip.indexOf(".") > -1) {
      var parts = ip.split(".");
      if (parts.length === 4) { parts[3] = "0"; ip = parts.join("."); }
    }

    sheet.appendRow([
      now,
      Utilities.formatDate(now, tz, "yyyy-MM-dd"),
      Utilities.formatDate(now, tz, "HH:mm:ss"),
      body.page || "",
      body.title || "",
      "",                       // Seconds On Page — filled in when they leave
      body.country || "",
      body.city || "",
      body.region || "",
      body.company || "",
      body.domain || "",
      body.asn || "",
      ip,
      body.device || "",
      body.browser || "",
      body.os || "",
      body.screen || "",
      body.language || "",
      body.referrer || "direct",
      body.visitorId || "",
      body.sessionId || "",
      body.hitId || "",
      body.visitorType || ""
    ]);

    return reply({ ok: true });

  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}


// When someone closes the tab, visit-log.js sends how long they stayed.
// We find that hit and fill in the Seconds column.
function recordTimeOnPage(hitId, seconds) {
  if (!hitId) return;

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Only search the most recent 600 rows — plenty, and keeps it fast.
  var startRow = Math.max(2, lastRow - 600);
  var count = lastRow - startRow + 1;
  var hitColumn = 22; // "Hit ID"

  var ids = sheet.getRange(startRow, hitColumn, count, 1).getValues();

  for (var i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === hitId) {
      sheet.getRange(startRow + i, 6).setValue(Number(seconds) || 0);
      return;
    }
  }
}


/* ============================================================
   4. Handing data to your dashboard
   ============================================================ */

function doGet(e) {
  var key = (e && e.parameter && e.parameter.key) || "";

  // Wrong key, or somebody just poking at the URL: give away nothing.
  if (key !== DASHBOARD_KEY) {
    return reply({ ok: false });
  }

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return reply({ ok: true, rows: [], headers: HEADERS });
  }

  var limit = Number((e.parameter && e.parameter.limit) || 3000);
  var startRow = Math.max(2, lastRow - limit + 1);
  var count = lastRow - startRow + 1;

  var values = sheet.getRange(startRow, 1, count, HEADERS.length).getValues();
  var tz = "Africa/Johannesburg";

  var rows = values.map(function (r) {
    return {
      when:        r[0] instanceof Date ? Utilities.formatDate(r[0], tz, "yyyy-MM-dd'T'HH:mm:ss") : String(r[0]),
      date:        String(r[1]),
      time:        String(r[2]),
      page:        String(r[3]),
      title:       String(r[4]),
      seconds:     Number(r[5]) || 0,
      country:     String(r[6]),
      city:        String(r[7]),
      region:      String(r[8]),
      company:     String(r[9]),
      domain:      String(r[10]),
      asn:         String(r[11]),
      ip:          String(r[12]),
      device:      String(r[13]),
      browser:     String(r[14]),
      os:          String(r[15]),
      screen:      String(r[16]),
      language:    String(r[17]),
      referrer:    String(r[18]),
      visitorId:   String(r[19]),
      sessionId:   String(r[20]),
      hitId:       String(r[21]),
      visitorType: String(r[22])
    };
  });

  return reply({ ok: true, rows: rows });
}


/* ============================================================
   5. Small helpers
   ============================================================ */

function getSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ============================================================
   6. Run this once, by hand, to create the sheet and headers
   ============================================================ */

function setUpSheet() {
  getSheet();
  SpreadsheetApp.getUi().alert("Visits sheet is ready.");
}
