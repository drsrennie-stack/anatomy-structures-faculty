
Code_gs.txt

100%
/**
 * Master Anatomy List, shared record and web app
 * Solano Community College, BIOL 004 Human Anatomy
 *
 * This script does two jobs.
 *   1. It turns one Google Sheet into the shared record behind the list.
 *   2. It serves the page itself, so the whole application runs from
 *      Google and embeds straight into Kajabi.
 *
 * Setup:
 *   1. Extensions, Apps Script. Paste this file over Code.gs, save.
 *   2. File, New, HTML file. Name it exactly Index, with a capital I.
 *      Paste Index.html into it, replacing the sample content, save.
 *   3. Run setUpTabs once if the Ops, Structures and Current tabs are
 *      not already there. Approve the permission prompt.
 *   4. Deploy, Manage deployments, pencil icon, Version: New version.
 *      Execute as: Me.  Who has access: Anyone.
 *   5. Open the web app URL. That is the page you embed in Kajabi.
 *
 * The old GitHub Pages copy keeps working. doGet below answers as the
 * data API when it is asked for data, and serves the page otherwise.
 */

var SHEET_OPS     = 'Ops';
var SHEET_ROSTER  = 'Structures';
var SHEET_CURRENT = 'Current';

var OPS_HEADER = ['Seq', 'When', 'Who', 'Action', 'Structure', 'Detail', 'OpId', 'Payload'];
var ROSTER_HEADER = ['id', 'module', 'worksheet', 'worksheet title', 'section', 'indent', 'structure', 'concept only'];

/* ------------------------------------------------------------------ *
 * Menu
 * ------------------------------------------------------------------ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Structure List')
    .addItem('Set up tabs', 'setUpTabs')
    .addItem('Rebuild summary', 'rebuildCurrent')
    .addToUi();
}

function setUpTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SHEET_OPS, OPS_HEADER);
  ensureSheet(ss, SHEET_ROSTER, ROSTER_HEADER);
  ensureSheet(ss, SHEET_CURRENT, ['(press Rebuild summary once faculty have started marking)']);
  var ops = ss.getSheetByName(SHEET_OPS);
  ops.setFrozenRows(1);
  ops.getRange(1, 1, 1, OPS_HEADER.length).setFontWeight('bold');
  ss.getSheetByName(SHEET_ROSTER).setFrozenRows(1);
  try {
    SpreadsheetApp.getUi().alert('Tabs are ready. Next: Deploy, New deployment, Web app.');
  } catch (e) {
    // running from the editor rather than the sheet, no UI available
  }
}

function ensureSheet(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, header.length).setValues([header]);
  return sh;
}

function opsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ensureSheet(ss, SHEET_OPS, OPS_HEADER);
}

function rosterSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ensureSheet(ss, SHEET_ROSTER, ROSTER_HEADER);
}

/* ------------------------------------------------------------------ *
 * Web app entry points
 * ------------------------------------------------------------------ */
/**
 * One entry point, two jobs.
 * A request carrying fn=ops or fn=ping is the data API, used by the
 * GitHub Pages copy. Anything else gets the application itself.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};

  if (!p.fn) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Master Anatomy List')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  var out;
  try {
    if (p.fn === 'ops') {
      out = readOps(Number(p.since || 0));
    } else if (p.fn === 'ping') {
      out = { ok: true, pong: true, ops: Math.max(0, opsSheet().getLastRow() - 1), roster: Math.max(0, rosterSheet().getLastRow() - 1) };
    } else {
      out = { ok: false, error: 'unknown request' };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return reply(out, p.callback);
}

function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.fn === 'append') {
      out = appendOps(body.ops || []);
    } else if (body.fn === 'roster') {
      out = writeRoster(body.rows || []);
    } else {
      out = { ok: false, error: 'unknown request' };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return reply(out, null);
}

function reply(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */
function readOps(since) {
  var sh = opsSheet();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, ops: [], seq: 0 };

  var firstRow = Math.max(2, since + 2);      // Seq n lives on row n + 1
  if (firstRow > last) return { ok: true, ops: [], seq: last - 1 };

  var values = sh.getRange(firstRow, 1, last - firstRow + 1, OPS_HEADER.length).getValues();
  var ops = [];
  for (var i = 0; i < values.length; i++) {
    var seq = Number(values[i][0]);
    var raw = values[i][7];
    if (!raw) continue;
    try {
      ops.push({ seq: seq, op: JSON.parse(raw) });
    } catch (err) {
      // a hand-edited row, skip it rather than break every reader
    }
  }
  return { ok: true, ops: ops, seq: last - 1 };
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */
function appendOps(ops) {
  if (!ops.length) return { ok: true, written: 0, oids: [] };
  if (ops.length > 300) return { ok: false, error: 'too many operations in one post' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = opsSheet();
    var known = recentOpIds(sh);
    var start = sh.getLastRow() + 1;
    var rows = [];
    var oids = [];
    var now = new Date();

    for (var i = 0; i < ops.length; i++) {
      var o = ops[i] || {};
      var seq = start + rows.length - 1;
      var oid = String(o.oid || ('x' + seq));
      oids.push(oid);
      if (known[oid]) continue;          // a resend of something already filed
      known[oid] = true;
      rows.push([
        seq,
        o.at ? new Date(Number(o.at)) : now,
        String(o.who || o.name || ''),
        String(o.t || ''),
        String(o.sid || o.key || (o.st && o.st.id) || ''),
        detailOf(o),
        oid,
        JSON.stringify(o)
      ]);
    }
    if (rows.length) sh.getRange(start, 1, rows.length, OPS_HEADER.length).setValues(rows);
    return { ok: true, written: rows.length, oids: oids, seq: sh.getLastRow() - 1 };
  } finally {
    lock.releaseLock();
  }
}

/**
 * The ids of the most recent marks, so the same mark never lands twice.
 * The page re-sends anything it does not see come back, which is what makes
 * a dropped connection harmless, and this is what makes that re-send safe.
 */
function recentOpIds(sh) {
  var last = sh.getLastRow();
  var seen = {};
  if (last < 2) return seen;
  var first = Math.max(2, last - 3000);
  var col = sh.getRange(first, 7, last - first + 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (col[i][0]) seen[String(col[i][0])] = true;
  }
  return seen;
}

function detailOf(o) {
  if (o.t === 'vote')     return o.v ? (o.v + (o.r ? '. ' + o.r : '')) : 'cleared';
  if (o.t === 'decision') return o.d ? (o.d + (o.note ? '. ' + o.note : '')) : 'cleared';
  if (o.t === 'where')    return (o.w || []).join(', ');
  if (o.t === 'comment')  return String(o.text || '');
  if (o.t === 'snote')    return String(o.text || '');
  if (o.t === 'add')      return o.st ? (o.st.name + (o.st.why ? '. ' + o.st.why : '')) : '';
  if (o.t === 'user')     return 'signed in';
  return '';
}

function writeRoster(rows) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = rosterSheet();
    if (sh.getLastRow() > 1) return { ok: true, skipped: true, rows: sh.getLastRow() - 1 };
    if (!rows.length) return { ok: true, skipped: true, rows: 0 };
    var out = rows.map(function (r) {
      return [r.id, r.m, r.f, r.ft, r.b, r.lvl, r.name, r.nw ? 'yes' : ''];
    });
    sh.getRange(2, 1, out.length, ROSTER_HEADER.length).setValues(out);
    return { ok: true, rows: out.length };
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ *
 * Summary tab: one row per structure, ready to read or export
 * ------------------------------------------------------------------ */
function rebuildCurrent() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roster = rosterSheet();
  if (roster.getLastRow() < 2) {
    try { SpreadsheetApp.getUi().alert('The Structures tab is still empty. Open the review page once and it will fill itself in.'); } catch (e) {}
    return;
  }

  var names = {};                       // user key to display name
  var votes = {}, where = {}, decisions = {}, reasons = {}, comments = {}, added = [];
  var all = readOps(0).ops;

  for (var i = 0; i < all.length; i++) {
    var o = all[i].op;
    if (o.t === 'user') {
      names[o.id] = o.name;
    } else if (o.t === 'vote') {
      if (!votes[o.sid]) votes[o.sid] = {};
      if (!o.v) { delete votes[o.sid][o.uid]; }
      else { votes[o.sid][o.uid] = o.v; if (o.r) { if (!reasons[o.sid]) reasons[o.sid] = {}; reasons[o.sid][o.uid] = o.r; } }
    } else if (o.t === 'where') {
      if (!where[o.sid]) where[o.sid] = {};
      where[o.sid][o.uid] = o.w || [];
    } else if (o.t === 'decision') {
      if (!o.d) delete decisions[o.sid];
      else decisions[o.sid] = { d: o.d, note: o.note || '' };
    } else if (o.t === 'comment') {
      comments[o.sid] = (comments[o.sid] || 0) + 1;
    } else if (o.t === 'add' && o.st) {
      added.push(o.st);
    }
  }

  var header = ['id', 'module', 'worksheet', 'section', 'indent', 'structure',
                'keep', 'conditional', 'unsure', 'remove',
                'flagged by', 'reasons given',
                'tested on', 'skill', 'asked',
                'decision', 'decision note', 'comments', 'proposed by'];

  var rows = [];
  var rv = roster.getRange(2, 1, roster.getLastRow() - 1, ROSTER_HEADER.length).getValues();

  for (var r = 0; r < rv.length; r++) {
    rows.push(summaryRow(rv[r][0], rv[r][1], rv[r][2], rv[r][4], rv[r][5], rv[r][6], '',
                         votes, where, decisions, reasons, comments, names));
  }
  for (var a = 0; a < added.length; a++) {
    var st = added[a];
    rows.push(summaryRow(st.id, st.m, st.f, st.b || 'Faculty additions', st.lvl || 0, st.name,
                         names[st.by] || st.by || '',
                         votes, where, decisions, reasons, comments, names));
  }

  var sh = ss.getSheetByName(SHEET_CURRENT);
  if (!sh) sh = ss.insertSheet(SHEET_CURRENT);
  sh.clear();
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  sh.setFrozenRows(1);

  try { SpreadsheetApp.getUi().alert('Summary rebuilt: ' + rows.length + ' structures.'); } catch (e) {}
}

function summaryRow(id, mod, form, section, indent, name, proposedBy,
                    votes, where, decisions, reasons, comments, names) {
  var v = votes[id] || {};
  var counts = { keep: 0, cond: 0, undecided: 0, cut: 0 };
  var flagged = [];
  for (var k in v) {
    if (!v.hasOwnProperty(k)) continue;
    if (counts[v[k]] != null) counts[v[k]]++;
    if (v[k] === 'cut' || v[k] === 'cond') flagged.push(names[k] || k);
  }

  var whyList = [];
  var rs = reasons[id] || {};
  for (var rk in rs) {
    if (rs.hasOwnProperty(rk)) whyList.push((names[rk] || rk) + ': ' + rs[rk]);
  }

  var tally = {};
  var w = where[id] || {};
  for (var wk in w) {
    if (!w.hasOwnProperty(wk)) continue;
    for (var j = 0; j < w[wk].length; j++) tally[w[wk][j]] = (tally[w[wk][j]] || 0) + 1;
  }
  var placed = [];
  for (var t in tally) {
    if (!tally.hasOwnProperty(t)) continue;
    if (t !== 'skill' && t !== 'knowledge') placed.push(t + ' (' + tally[t] + ')');
  }

  var dec = decisions[id] || null;

  return [
    id, mod, form, section, indent, name,
    counts.keep, counts.cond, counts.undecided, counts.cut,
    flagged.join(', '), whyList.join(' | '),
    placed.join(', '), tally.skill || 0, tally.knowledge || 0,
    dec ? dec.d : '', dec ? dec.note : '',
    comments[id] || 0, proposedBy
  ];
}
Displaying Code_gs.txt.
