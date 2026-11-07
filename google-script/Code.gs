/**
 * Apex Strikers tester applications — Google Sheets backend.
 *
 * Paste this whole file into Extensions → Apps Script of your Google Sheet,
 * change the two settings below, then Deploy → New deployment → Web app
 * (Execute as: Me, Who has access: Anyone). Copy the web app URL.
 */

// ── Settings ─────────────────────────────────────────────
const ADMIN_PASSWORD = "change-this-password"; // used on admin.html, never shown to visitors
const DISCORD_WEBHOOK = "";                    // optional: paste a Discord webhook to get a ping for every new application
const OPEN = true;                             // set to false to stop accepting new applications

// ── Sheet layout ─────────────────────────────────────────
const SHEET = "Applications";
const COLS = ["id", "submittedAt", "status", "roblox", "discord", "activity", "hours", "found", "likes", "focus", "experience", "experienceWhere", "expect", "note", "reviewedAt"];
const CHOICES = {
  activity: ["Every day", "A few times a week", "Mostly weekends", "Now and then"],
  hours: ["Under 2 hours", "2 to 5 hours", "5 to 10 hours", "More than 10 hours"],
  found: ["TikTok", "YouTube", "Discord", "A friend", "On Roblox", "Somewhere else"],
  focus: ["Hunt for bugs", "Just play and have fun", "A bit of both"],
  experience: ["Yes", "No"],
};
const STATUSES = ["Pending", "Accepted", "Declined"];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight("bold");
  }
  return sh;
}
function rows_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, COLS.length).getValues().map((r, i) => {
    const o = { _row: i + 2 };
    COLS.forEach((c, k) => (o[c] = r[k] instanceof Date ? r[k].toISOString() : r[k]));
    return o;
  });
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(v, max) {
  // strip leading = + - @ so nothing gets treated as a spreadsheet formula
  return String(v == null ? "" : v).trim().slice(0, max || 600).replace(/^[=+\-@]+/, "");
}

// ── Public stats (totals only, no names) ─────────────────
function stats_() {
  const all = rows_();
  const out = { open: OPEN, total: all.length, status: {}, choices: {} };
  STATUSES.forEach((s) => (out.status[s] = all.filter((r) => (r.status || "Pending") === s).length));
  Object.keys(CHOICES).forEach((q) => {
    out.choices[q] = {};
    CHOICES[q].forEach((o) => (out.choices[q][o] = all.filter((r) => r[q] === o).length));
  });
  return out;
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "stats";
  if (action === "stats") return json_({ ok: true, stats: stats_() });
  if (action === "status") {
    // An applicant checks their own status. Both names have to match, so nobody can look up someone else.
    const rb = String(e.parameter.roblox || "").trim().toLowerCase();
    const dc = String(e.parameter.discord || "").trim().toLowerCase().replace(/^@/, "");
    if (!rb || !dc) return json_({ ok: false, error: "Enter both names." });
    const r = rows_().find((x) => String(x.roblox).toLowerCase() === rb && String(x.discord).toLowerCase() === dc);
    if (!r) return json_({ ok: true, found: false });
    return json_({ ok: true, found: true, status: r.status || "Pending", roblox: r.roblox });
  }
  return json_({ ok: false, error: "Unknown action" });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { return json_({ ok: false, error: "Bad request" }); }

  // ── Public: send an application ──
  if (body.action === "apply") {
    if (!OPEN) return json_({ ok: false, error: "Applications are closed right now." });
    const a = body.application || {};
    if (a.website) return json_({ ok: true }); // honeypot filled = bot, pretend it worked
    const roblox = clean_(a.roblox, 20), discord = clean_(a.discord, 37).replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,20}$/.test(roblox)) return json_({ ok: false, error: "That Roblox username doesn't look right." });
    if (!/^[a-z0-9_.]{2,32}$/i.test(discord)) return json_({ ok: false, error: "That Discord username doesn't look right." });
    for (const q of Object.keys(CHOICES)) if (CHOICES[q].indexOf(a[q]) === -1) return json_({ ok: false, error: "Please answer every question." });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      // simple flood protection: at most 30 applications per 10 minutes overall
      const cache = CacheService.getScriptCache();
      const recent = Number(cache.get("recent") || 0);
      if (recent >= 30) return json_({ ok: false, error: "Lots of applications right now, try again in a few minutes." });
      cache.put("recent", String(recent + 1), 600);

      const existing = rows_();
      const dupe = existing.find((r) => String(r.roblox).toLowerCase() === roblox.toLowerCase() || String(r.discord).toLowerCase() === discord.toLowerCase());
      if (dupe) return json_({ ok: false, error: "You've already applied. We'll message you on Discord if you get picked.", duplicate: true });

      const row = {
        id: "a" + Utilities.getUuid().slice(0, 7), // starts with a letter so Sheets never turns it into a number
        submittedAt: new Date(),
        status: "Pending",
        roblox, discord,
        activity: a.activity, hours: a.hours, found: a.found, focus: a.focus, experience: a.experience,
        likes: clean_(a.likes), experienceWhere: a.experience === "Yes" ? clean_(a.experienceWhere) : "", expect: clean_(a.expect),
        note: "", reviewedAt: "",
      };
      sheet_().appendRow(COLS.map((c) => row[c]));
      notify_(row);
      return json_({ ok: true, id: row.id });
    } finally {
      lock.releaseLock();
    }
  }

  // ── Everything below needs the admin password ──
  if (body.password !== ADMIN_PASSWORD) {
    Utilities.sleep(800); // slows down password guessing
    return json_({ ok: false, error: "Wrong password." });
  }
  if (body.action === "list") return json_({ ok: true, applications: rows_(), stats: stats_() });

  if (body.action === "update") {
    const sh = sheet_();
    const r = rows_().find((x) => String(x.id) === String(body.id));
    if (!r) return json_({ ok: false, error: "Application not found." });
    if (body.status && STATUSES.indexOf(body.status) !== -1) {
      sh.getRange(r._row, COLS.indexOf("status") + 1).setValue(body.status);
      sh.getRange(r._row, COLS.indexOf("reviewedAt") + 1).setValue(new Date());
      if (body.status !== r.status && body.status !== "Pending") notifyDecision_(r, body.status);
    }
    if (typeof body.note === "string") sh.getRange(r._row, COLS.indexOf("note") + 1).setValue(clean_(body.note, 1000));
    return json_({ ok: true });
  }

  if (body.action === "delete") {
    const r = rows_().find((x) => String(x.id) === String(body.id));
    if (!r) return json_({ ok: false, error: "Application not found." });
    sheet_().deleteRow(r._row);
    return json_({ ok: true });
  }

  return json_({ ok: false, error: "Unknown action" });
}

// ── Discord pings (optional) ─────────────────────────────
function post_(payload) {
  if (!DISCORD_WEBHOOK) return;
  try {
    UrlFetchApp.fetch(DISCORD_WEBHOOK, { method: "post", contentType: "application/json", payload: JSON.stringify(Object.assign({ allowed_mentions: { parse: [] } }, payload)), muteHttpExceptions: true });
  } catch (err) {}
}
function notify_(r) {
  const f = (name, value, inline) => ({ name, value: String(value || "–").slice(0, 1000), inline: !!inline });
  post_({
    username: "Apex Applications",
    embeds: [{
      title: "New tester application: " + r.roblox,
      color: 0x3b6cff,
      fields: [
        f("Roblox", r.roblox, true), f("Discord", "@" + r.discord, true), f("Focus", r.focus, true),
        f("Active on Roblox", r.activity, true), f("Hours per week", r.hours, true), f("Found Apex via", r.found, true),
        f("What they like about Apex", r.likes),
        f("Tested before?", r.experience === "Yes" ? "Yes: " + r.experienceWhere : "No"),
        f("What they expect from Apex", r.expect),
      ],
      timestamp: new Date().toISOString(),
    }],
  });
}
function notifyDecision_(r, status) {
  post_({ username: "Apex Applications", content: (status === "Accepted" ? "Accepted: " : "Declined: ") + r.roblox + " (@" + r.discord + ")" });
}

// Run this once from the editor (select "setup" → Run) to create the sheet and give permissions.
function setup() {
  sheet_();
  Logger.log("Sheet ready. Now Deploy → New deployment → Web app.");
}
