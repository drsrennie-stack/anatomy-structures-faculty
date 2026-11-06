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
  if (o.t === 'note')     return String(o.text || '');
  if (o.t === 'status')   return String(o.s || '');
  if (o.t === 'review')   return o.r ? 'read' : 'not read';
  if (o.t === 'screview') return (o.r ? 'read the section ' : 'un-read the section ') + String(o.key || '');
  if (o.t === 'sccomment')return String(o.text || '');
  if (o.t === 'mine')     return o.m === 'in'  ? 'added to their own course list'
                               : o.m === 'out' ? 'dropped from their own course list'
                                               : 'following the department';
  if (o.t === 'add')      return o.st ? ((o.st.structureName || o.st.name) + (o.st.notes ? '. ' + o.st.notes : '')) : '';
  if (o.t === 'user')     return 'signed in';
  return '';
}

/**
 * The same slug the page uses, so a section key written by the page
 * lines up with a worksheet and section on the Structures tab.
 */
function slugOf(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
function sectionKeyOf(worksheet, section) {
  return slugOf(worksheet + '--' + section);
}

/**
 * The department's decision rule, kept identical to the one on the page.
 * Returns the recommendation and how strong the agreement behind it is.
 */
function recommendFor(counts, threshold) {
  var voters = counts.keep + counts.cond + counts.undecided + counts.cut;
  if (!voters) return {outcome: 'Keep', agreement: '', voters: 0, why: 'Nobody marked it, so it stays by default.'};

  var pct = function (n) { return Math.round(n / voters * 100); };
  var stay = counts.keep + counts.cond;
  var top = Math.max(counts.keep, counts.cond, counts.undecided, counts.cut);
  var out = {outcome: '', agreement: Math.round(top / voters * 100), voters: voters, why: ''};

  if (pct(counts.cut) >= threshold) {
    out.outcome = 'Remove';
    out.why = pct(counts.cut) + ' percent of the ' + voters + ' who marked it want it off.';
  } else if (pct(counts.keep) >= threshold) {
    out.outcome = 'Keep';
    out.why = pct(counts.keep) + ' percent of the ' + voters + ' who marked it want it kept.';
  } else if (pct(stay) >= threshold && counts.cond > 0) {
    out.outcome = 'Keep with a condition';
    out.why = 'Keep and keep-with-conditions together reach ' + pct(stay) + ' percent.';
  } else {
    out.outcome = 'Needs a decision';
    out.why = 'No single answer reaches ' + threshold + ' percent.';
  }
  if (counts.undecided && pct(counts.undecided) > 33 && out.outcome !== 'Remove') {
    out.outcome = 'Needs a decision';
    out.why = pct(counts.undecided) + ' percent are still undecided.';
  }
  return out;
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

  var THRESHOLD = 70;                   // the agreement bar, same as the page default

  var names = {};                       // user key to display name
  var votes = {}, where = {}, decisions = {}, reasons = {}, comments = {}, added = [];
  var sectionRead = {};                 // section key -> {userId: true}
  var structureRead = {};               // structure id -> {userId: true}, the older per-row ticks
  var mine = {};                        // structure id -> {userId: "in"|"out"}
  var notes = {};                       // structure id -> shared note
  var all = readOps(0).ops;

  for (var i = 0; i < all.length; i++) {
    var o = all[i].op;
    if (o.t === 'user') {
      names[o.id] = o.name;
    } else if (o.t === 'screview') {
      if (!sectionRead[o.key]) sectionRead[o.key] = {};
      if (o.r) sectionRead[o.key][o.uid] = true;
      else delete sectionRead[o.key][o.uid];
    } else if (o.t === 'review') {
      if (!structureRead[o.sid]) structureRead[o.sid] = {};
      if (o.r) structureRead[o.sid][o.uid] = true;
      else delete structureRead[o.sid][o.uid];
    } else if (o.t === 'mine') {
      if (!mine[o.sid]) mine[o.sid] = {};
      if (o.m === 'in' || o.m === 'out') mine[o.sid][o.uid] = o.m;
      else delete mine[o.sid][o.uid];
    } else if (o.t === 'note') {
      notes[o.sid] = String(o.text || '');
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

  var facultyTotal = Math.max(1, Object.keys(names).length);

  var header = ['id', 'module', 'worksheet', 'section', 'indent', 'structure',
                'keep', 'conditional', 'unsure', 'remove',
                'people who marked it', 'agreement percent', 'recommendation', 'why',
                'read by', 'of faculty', 'who has read it',
                'flagged by', 'reasons given',
                'tested on', 'skill', 'asked',
                'shared note', 'on their own list', 'off their own list',
                'decision', 'decision note', 'comments', 'proposed by'];

  var ctx = {votes: votes, where: where, decisions: decisions, reasons: reasons,
             comments: comments, names: names, notes: notes, mine: mine,
             sectionRead: sectionRead, structureRead: structureRead,
             facultyTotal: facultyTotal, threshold: THRESHOLD};

  var rows = [];
  var rv = roster.getRange(2, 1, roster.getLastRow() - 1, ROSTER_HEADER.length).getValues();

  for (var r = 0; r < rv.length; r++) {
    rows.push(summaryRow(rv[r][0], rv[r][1], rv[r][2], rv[r][4], rv[r][5], rv[r][6], '', ctx));
  }
  for (var a = 0; a < added.length; a++) {
    var st = added[a];
    rows.push(summaryRow(st.id, st.m, st.f, st.b || 'Faculty additions', st.lvl || 0,
                         st.structureName || st.name, names[st.by] || st.by || '', ctx));
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

function summaryRow(id, mod, form, section, indent, name, proposedBy, ctx) {
  var votes = ctx.votes, where = ctx.where, decisions = ctx.decisions;
  var reasons = ctx.reasons, comments = ctx.comments, names = ctx.names;

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

  /* Reading is recorded once, at the end of a section. The older
   * per-structure ticks still count, so nothing anybody already
   * recorded is lost. */
  var readers = {};
  var secKey = sectionKeyOf(form, section);
  var fromSection = ctx.sectionRead[secKey] || {};
  for (var sk in fromSection) { if (fromSection.hasOwnProperty(sk)) readers[sk] = true; }
  var fromRow = ctx.structureRead[id] || {};
  for (var rk2 in fromRow) { if (fromRow.hasOwnProperty(rk2)) readers[rk2] = true; }
  var readerNames = [];
  for (var rn in readers) { if (readers.hasOwnProperty(rn)) readerNames.push(names[rn] || rn); }

  var rec = recommendFor(counts, ctx.threshold);

  var mineIn = [], mineOut = [];
  var mrow = ctx.mine[id] || {};
  for (var mk in mrow) {
    if (!mrow.hasOwnProperty(mk)) continue;
    if (mrow[mk] === 'in') mineIn.push(names[mk] || mk);
    else mineOut.push(names[mk] || mk);
  }

  return [
    id, mod, form, section, indent, name,
    counts.keep, counts.cond, counts.undecided, counts.cut,
    rec.voters, rec.agreement, rec.outcome, rec.why,
    readerNames.length, ctx.facultyTotal, readerNames.join(', '),
    flagged.join(', '), whyList.join(' | '),
    placed.join(', '), tally.skill || 0, tally.knowledge || 0,
    ctx.notes[id] || '', mineIn.join(', '), mineOut.join(', '),
    dec ? dec.d : '', dec ? dec.note : '',
    comments[id] || 0, proposedBy
  ];
}
