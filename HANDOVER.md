# Master Anatomy List, faculty collaboration workspace

**Course:** Solano Community College, BIOL 004 Human Anatomy
**Files:** Index.html, HANDOVER.md
**Date:** September 20, 2026
**Prepared for:** Dr. Sharilyn Rennie

---

## 1. What this is

Index.html is the complete standalone frontend. It is one file, plain HTML, CSS and vanilla JavaScript, with no frameworks, no build step, no npm, and no Claude runtime of any kind. Open it from a file, serve it from a web host, or paste it into Apps Script as an HTML file, and it behaves the same way.

It carries all 1,042 structures from the Fall 2024 Anatomy Worksheets, Units 1 through 5, as the starting master list.

---

## 2. What it runs on, and what happens in each case

The page detects its own environment and picks a transport. You do not configure anything except in case two.

| Mode | When it applies | What happens |
|---|---|---|
| Apps Script | The page is served by Apps Script HTML Service | Calls `google.script.run.readOps` and `google.script.run.appendOps` in your Code.gs. This is the intended production setup. |
| Network | `API_URL` near the top of the script is filled in | Reads over JSONP, writes with a plain-text POST, the way the current GitHub Pages version works. |
| Local | Neither of the above | Uses browser storage as a stand-in for the sheet and says so in a banner on the page. Good for demonstrating it with nothing connected. |

Right now the file ships in local mode, so you can open it and try everything before any wiring happens. The banner at the top says so plainly, so nobody mistakes a local copy for the shared one.

---

## 3. Backend connection points

Everything that touches storage lives in one place. Find the block headed `DATA SERVICE` and, inside it, the function `callServer`. That function, roughly forty lines, is the only thing that changes when the sheet is connected.

Above it sit the named service functions the interface actually calls. None of these need to change:

```js
loadMasterList()                     // every structure as one merged record
loadStructure(id)
addStructure(data)                   // proposals, marked Recommend Add
updateStructure(id, changes)         // field-level: status, notes, where, vote
saveFacultyReview(id, review)        // one person's review, never overwrites another's
addFacultyComment(id, comment)       // attributed, additive
loadFacultyMembers()
loadChangeHistory(id)
```

The interface calls only these. No screen reads or writes storage directly, which is what makes the backend swap a one-file change rather than a rewrite.

---

## 4. Google Apps Script TODO

Two server functions, both of which already exist in the Code.gs you deployed for this project:

```js
readOps(since)        // -> { ok:true, ops:[{seq, op}], seq:Number }
appendOps(opsArray)   // -> { ok:true, written:Number, seq:Number }
```

What is left to add to Code.gs is the part that serves this page:

```js
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Master Anatomy List')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

`setXFrameOptionsMode` to ALLOWALL is what lets Kajabi embed it. Without that line the iframe stays blank.

Steps on your side:

1. In the Apps Script project, File, New, HTML file, name it `Index`. Paste Index.html into it, replacing everything.
2. Add the `doGet` above to Code.gs. Keep `readOps` and `appendOps` exactly as they are.
3. Deploy, Manage deployments, pencil icon, Version: New version. The URL stays the same.
4. Open the web app URL. The local mode banner should be gone, which is how you know it is talking to the sheet.

Your existing web app URL keeps working, and the GitHub Pages copy keeps working too, because the sheet and its operation log are unchanged.

---

## 5. What is still temporary

Only one thing: in local mode the operation log lives in browser storage under the key `mal-local-state-v1`. Nothing else is mocked. The seed structure list is real, the merge logic is real, the change history is real, and all of it runs identically once the backend is connected.

To wipe a local test copy, open the page and run `localStorage.clear()` in the browser console, then reload.

---

## 6. How collaboration is kept additive

Every action is written as one small record stamped with who did it and when. Nothing is ever updated in place, so there is no way for one person's save to erase another's.

- **Reviews.** Each faculty member has their own review record. The panel lists every person and whether they have reviewed it. Your tick never touches anyone else's.
- **Comments.** Appended, attributed, timestamped. Never replaced.
- **Teaching locations.** Each person's marks are stored separately. The number in the box on the main row is how many people have picked that location, not a single shared switch.
- **Votes.** One per person. Clicking your own mark again clears yours only.
- **Status and the shared note.** These are genuinely shared, one value for the structure, because that is what they are for. Both are versioned and every change is recorded with the old value, the new value, and who made it, so a change is always visible and always attributable.
- **Change history.** Written automatically from the same records. Nothing extra to maintain.

---

## 7. Deletion

There is no delete control in the faculty interface, by design. A structure that should come off is marked **Recommend Remove**, and one that is finished with is marked **Archived**. Both keep the record and both are reversible. If you later want a true delete, it belongs in Code.gs behind an owner check, not in this page.

---

## 8. What was preserved, changed, and removed

**Preserved unchanged:** the 1,042-structure list and its organisation by unit, worksheet and section; the section card layout with vote columns; keep-by-default, so leaving a row alone counts as keeping it; the teaching location checkboxes including Skill and Asked; the propose-a-structure workflow; search; the minimum-not-maximum framing panel; the MedMasters visual system, navy, terra, Open Sans over Plus Jakarta Sans, flat white cards, hairline borders, no shadows.

**Changed for collaboration:** a status field on every structure with your six values; per-person faculty review replacing any single shared reviewed flag; attributed comments separated from the shared consensus note; an expandable change history on every structure; a summary dashboard of workflow counts; four new filters, resource type, status, review state, and the existing unit and worksheet filters kept; a Sections and Table view toggle; CSV export of whatever the filters currently show.

**Added to the vocabulary:** Radiology as a teaching location, alongside the existing histology, model, cadaver, bone box and other.

**Removed:** nothing that worked. The only things gone are the Claude artifact publish path and its read-only detection, both of which were replaced by the data service.

---

## 9. Verified before handover

Run in Chromium, twenty-nine checks, all passing, covering every step of your functional test list:

- A faculty member signs in, the list renders, search and each filter narrow it correctly
- A structure opens, a teaching location is set and kept, an attributed comment posts, the person's own review records
- A second faculty member reviews the same structure and the first review survives
- A structure is marked Recommend Revise and the change history names who changed it, from what, to what
- A new structure is proposed and lands as Recommend Add rather than as a required item
- The table view shows the six requested columns and opens the same detail panel
- CSV export respects the active filter, and exports all 1,042 rows when filters are cleared
- No Claude runtime reference anywhere in the file, and the Apps Script seam is present
- At 390 pixels wide the page does not scroll sideways; wide tables scroll inside their own container
- No JavaScript errors during any of it

One real bug was found and fixed in the process: the filter dropdowns sized themselves to their longest option, which pushed the page 376 pixels wider than a phone screen. That would have shown up as a broken embed in Kajabi.

---

## 10. Accessibility

Real buttons, real checkboxes and radios, every control labelled, `aria-expanded` on every toggle, `aria-pressed` on the view switch, a skip link, visible focus rings at 2 pixels in terra, a polite live region for save messages, `scope` on every table header, captions on both tables, and reduced-motion respected. Contrast is the audited MedMasters palette from the previous build, navy at 18.04:1 and terra at 7.66:1 on white, with interactive borders at 4.74:1.

Outstanding, same as before: a pass with a live screen reader, VoiceOver on Safari and NVDA on Firefox, before it goes out to the whole department.
