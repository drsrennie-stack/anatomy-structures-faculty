# Accessibility compliance notes

**Project:** Master Anatomy List, faculty collaboration workspace
**Files covered:** index.html (the application), faculty-intro.html (the introduction sheet and animated walkthrough), code.gs (server, no user interface), and the handout the application generates
**Course:** Solano Community College, BIOL 004 Human Anatomy
**Date:** November 6, 2026 (rebranded)
**Reviewer:** Dr. Sharilyn Rennie

---

## 1. WCAG version and level reached

Target is WCAG 2.2 Level AA as the floor, with Level AAA wherever it can be reached without giving something up elsewhere. The application and the generated handout both meet AA. Most text also meets AAA. The exceptions are listed in section 6.

Automated testing was run with axe-core against the WCAG 2.0 A, 2.0 AA, 2.1 A, 2.1 AA and 2.2 AA rule sets, on five states of the page: the section view with a structure open, the table view, the results view, the personal course list view, and the generated handout. Zero violations in every state, including at 390 pixels wide.

Criterion by criterion, the ones that carry real weight here:

| Criterion | Level | How it is met |
|---|---|---|
| 1.1.1 Non-text content | A | Every icon-only control carries a screen reader name. The vote circles and location boxes are real radios and checkboxes with a label naming both the action and the structure. The coloured bar in the results table is marked decorative and the same number sits next to it as text. |
| 1.3.1 Info and relationships | A | Semantic headings, real tables with `scope` on every header, captions on every table, `for` and `id` pairing on every input, fieldset semantics through `role="group"` with a label on the personal list switch. |
| 1.3.2 Meaningful sequence | A | Reading order follows the document order in every view. |
| 1.4.1 Use of colour | A | No meaning is carried by colour alone. Keep-by-default is a dashed border as well as a lighter fill, and every mark carries a text label to a screen reader. Recommendations in the results view are words, not colours. |
| 1.4.3 Contrast, minimum | AA | Full audit in section 3. Lowest text pair on the page is 4.80:1. |
| 1.4.6 Contrast, enhanced | AAA | Body text and headings reach 11.0:1 or better. Two supporting colours fall short and are named in section 6. |
| 1.4.10 Reflow | AA | No sideways scrolling at 390 pixels. Verified, page scroll width equals client width. Wide tables scroll inside their own container rather than pushing the page. |
| 2.1.1 Keyboard, scrollable regions | A | Every container that scrolls sideways carries `tabindex="0"`, a region role and a label naming the table, so the right hand columns are reachable without a mouse. Applied centrally after each render so a new table cannot forget it. |
| 1.4.11 Non-text contrast | AA | Control borders are 4.67:1 against white. One exception, noted in section 6. |
| 2.1.1 Keyboard | A | Every control is a real HTML control. Nothing is operated by mouse alone. |
| 2.1.2 No keyboard trap | A | No modal dialogs. Every panel is inline and dismissible with an ordinary button. |
| 2.4.1 Bypass blocks | A | Skip link to the structure list. |
| 2.4.3 Focus order | A | Follows the visual order. Column header tooltips were deliberately left out of the tab order, see section 6. |
| 2.4.6 Headings and labels | AA | Every column has a question above it in plain words and a hover explanation. Every form control has a visible or screen reader label. |
| 2.4.7 Focus visible | AA | 2 pixel outline in terra with a 2 pixel offset on every focusable element, including the visually hidden radios behind the vote circles. |
| 2.4.11 Focus not obscured | AA (2.2) | The toolbar is the only sticky element and it sits at the top, so a focused control below it is never covered. Sticky positioning is switched off below 1040 pixels. |
| 2.5.8 Target size | AA (2.2) | The vote and location targets are 30 pixels tall within a 40 pixel column, with spacing that clears the 24 by 24 minimum. Pills and buttons are at least 34 pixels tall. |
| 3.2.3 Consistent navigation | AA | One toolbar, four views, same controls in each. |
| 3.3.2 Labels or instructions | A | The key panel at the top explains every column and every mark, and is open by default. |
| 4.1.2 Name, role, value | A | `aria-expanded` on every toggle, `aria-pressed` on the view switch, `aria-controls` pointing at the region each toggle opens. |
| 4.1.3 Status messages | AA | The save line is `role="status"` with `aria-live="polite"`. The generated handout area is a polite live region so a screen reader hears it rebuild. |

---

## 2. Design tokens audited

Primary teaching palette.

| Token | Hex |
|---|---|
| Navy | #1E3D4C |
| Navy deep | #142a36 |
| Navy tint | #EDF1F3 |
| Ink soft | #43616F |
| Ink mute | #54707D |
| Control border | #5E7885 |
| Terra | #C2734D |
| Terra dark | #A0522D |
| Brushed gold | #B8924A |
| Gold dark | #7A5C1E |
| Card | #FFFFFF |
| Page | #FAFAF9 |
| Wash | #F2F5F6 |

---

## 3. Colour contrast audit

Every text and background pair actually used on the page.

| Foreground | Background | Ratio | AA | AAA |
|---|---|---|---|---|
| Navy #1E3D4C | White card #FFFFFF | 11.49:1 | pass | pass |
| Navy #1E3D4C | Page #FAFAF9 | 11.01:1 | pass | pass |
| Navy #1E3D4C | Navy tint #EDF1F3 | 10.11:1 | pass | pass |
| Ink soft #43616F | White #FFFFFF | 6.61:1 | pass | fail |
| Ink mute #54707D | White #FFFFFF | 5.26:1 | pass | fail |
| Ink mute #54707D | Page #FAFAF9 | 5.04:1 | pass | fail |
| Ink mute #54707D | Wash #F2F5F6 | 4.80:1 | pass | fail |
| Terra dark #A0522D | White #FFFFFF | 5.62:1 | pass | fail |
| Terra dark #A0522D | Page #FAFAF9 | 5.38:1 | pass | fail |
| Gold dark #7A5C1E | White #FFFFFF | 6.22:1 | pass | fail |
| White #FFFFFF | Navy fill #1E3D4C | 11.49:1 | pass | pass |
| White #FFFFFF | Terra dark fill #A0522D | 5.62:1 | pass | fail |
| White #FFFFFF | Gold dark fill #7A5C1E | 6.22:1 | pass | fail |
| Navy deep #142a36 | Gold fill #B8924A | 5.13:1 | pass | fail |
| White #FFFFFF | Tooltip #142a36 | 14.85:1 | pass | pass |

Non-text contrast, for borders and control outlines:

| Element | Against | Ratio | Needs 3:1 |
|---|---|---|---|
| Control border #5E7885 | White | 4.67:1 | pass |
| Toggle and ghost button border #5E7885 | White | 4.67:1 | pass |
| Brushed gold #B8924A border | White | 2.90:1 | see section 6 |

Three contrast failures were found and fixed during this pass. White text on terra #C2734D was 3.59:1, below the 4.5:1 floor, and was used on the propose button, the selected Remove vote circle, and the off switch in the personal course list. All three now use terra dark #A0522D at 5.62:1. The eyebrow text at the top of the page was terra on off-white at 3.46:1 and is now terra dark at 5.38:1. The third was non-text: ghost buttons, the view switch and the personal list switch were outlined with the hairline border, which blends to 1.92:1 against white, under the 3:1 floor for a control boundary and the only boundary those controls have. All three now use the control border at 4.67:1.

---

## 4. Keyboard navigation flow verified

Tab order from the top of the page: skip link, framing panel toggle, name field, Start, then once signed in Not you, Propose a structure, Check for new work, Build the final list, the summary panel toggle, search, the five filters, Clear all, Show or hide the key, the four view buttons, then the list itself, and last the key panel with its Hide button.

The key panel opens as a column beside the list on a wide screen and above the list on a narrow one. It is a toggle with `aria-expanded`, the button text says what the next press will do rather than what the state is, opening it moves focus to its Hide button, closing it returns focus to the toggle, and Escape closes it while focus is inside. Whether it is open is remembered per browser and the page renders correctly when that storage is unavailable.

Inside a section card: the card toggle, then for each row the four vote radios as one radio group, the location checkboxes, the status chip is not interactive, the Open button. At the end of the block: the section tick, Propose a structure here, the block comment box, Post section comment.

Inside an open structure: the location pills, the status dropdown, the four position pills, the reason box and its save, the three personal list pills, the shared note box and its save, the comment box and Post comment, the change history toggle.

Verified: every control is reachable and operable from the keyboard, the arrow keys move within each radio group as expected, no element traps focus, and the focus ring is visible on every stop including the visually hidden radios behind the vote circles.

---

## 5. Screen reader testing

Automated name, role and value checks pass with axe-core across all five page states. Structure verified by hand: one `h1`, unit headings as `h2`, worksheet headings as `h3`, panel and detail headings as `h2` and `h4` with no skipped levels within a branch, `header`, `main` and `footer` landmarks present, `scope` on every table header, captions on every table.

Each vote control reads as, for example, "Remove it, Superior (cranial, rostral), radio button". Each location control reads the full location rather than the abbreviation, so "Tested on the cadaver" rather than "Cadav". Each abbreviated column header carries the full text in a visually hidden span, so the meaning does not depend on hovering.

**Outstanding:** a pass with a live screen reader, VoiceOver on Safari and NVDA on Firefox, before this goes to the whole department. This is the same item that was outstanding at the previous handover.

---

## 6. Known limitations and remediation plan

**AAA contrast on supporting colours.** Terra dark, gold dark, ink soft and ink mute all clear AA comfortably but sit between 4.8:1 and 6.7:1, short of the 7:1 AAA bar. They are used for labels, hints and secondary text, never for anything a reader has to have. Raising them means darkening the palette tokens themselves, which is a decision about the teaching design system rather than about this page. Remediation: fold it into the palette reconciliation and reaudit this file afterwards.

**Brushed gold as a border on white** is 2.90:1, just under the 3:1 needed for a control boundary. It appears in the key panel only, on the sample mark for Keep with conditions, and that mark is paired with a gold dark border and a text label, so the boundary is never the only signal. On the page itself the selected location boxes use gold dark at 6.22:1, which passes. Remediation: same palette decision as above.

**Column header tooltips are not in the tab order.** The abbreviated headers are `abbr` elements with a title, a visually hidden full description, and a tooltip on hover. They are deliberately not focusable. With more than a thousand rows on the page, fourteen extra tab stops per section would cost a keyboard user far more than the tooltip gives them, and the key panel at the top of the page carries exactly the same text for everyone, in the reading order, open by default. This is a considered trade against 2.4.3, not an oversight.

**Print output.** The printable handout is generated inside the page and printed through the browser. Print output cannot be programmatically tested for contrast; it was checked visually. The handout is black text on white with no colour-carried meaning.

**The generated handout inherits nothing from this file.** It is a separate self-contained document with its own styles, its own iframe height sender, and its own link targeting. It was audited separately and returned zero violations.

---

## 7. Reviewer

Prepared for Dr. Sharilyn Rennie. Automated audit, contrast calculation and keyboard walkthrough completed September 21, 2026. Live screen reader pass still outstanding.

---

## 8. faculty-intro.html, the introduction sheet

Added November 6, 2026. Built in the same visual language as Rounds, so it uses that palette rather than the one audited in section 3. Audited separately with axe-core against the WCAG 2.0 A, 2.0 AA, 2.1 A, 2.1 AA and 2.2 AA rule sets in three states, at full width, at 390 pixels, and with reduced motion requested. Zero violations in all three. The handout the tool generates was audited again at the same time and also returned zero.

### Contrast

Every text pair on the page clears AAA.

| Pair | Ratio |
|---|---|
| Gold eyebrow on the navy band | 10.46:1 |
| White headline on navy | 20.36:1 |
| Supporting text on navy | 12.67:1 |
| Maroon numeral on a white card | 8.31:1 |
| Navy heading on a white card | 20.36:1 |
| Body text on a white card | 16.41:1 |
| Supporting text on a white card | 8.01:1 |
| Supporting text on the page | 7.67:1 |
| White on the maroon button | 8.31:1 |
| Navy on the gold skip link | 10.46:1 |

Non-text: the control border is 3.19:1 against white, clearing the 3:1 floor. The decorative hairline on card edges is lighter than that and is never the only boundary of anything interactive.

### The opening film

A full-screen overlay that plays once per browser session and is remembered in session storage, wrapped so it still works when storage is unavailable. It has a Skip intro button, and it is removed entirely when the visitor asks for reduced motion, so nobody has to sit through or dismiss an animation they did not want. Its text is decorative and repeated in the page beneath it, so nothing is lost when it is skipped.

### The animated walkthrough

The animation carries real information, so the information does not live in the animation. All six captions are ordinary text in an ordered list, present in the document whether or not anything is moving, and each one is clickable to jump to that step. The moving parts are a cursor and some state classes, nothing else.

- Play and Pause is one button with `aria-pressed`, labelled with what the next press will do.
- Back and Next are ordinary buttons. Clicking any of them stops the auto-advance, so the page never moves under somebody who has taken control.
- The current step is announced through a visually hidden `aria-live="polite"` region carrying the step's heading and description.
- Each step paints the whole stage from scratch rather than nudging it from the step before, so arriving at step 5 by clicking is identical to arriving by waiting.
- Under reduced motion the auto-advance does not start, the cursor is hidden, the stage shows the finished state, and all six captions read as a plain numbered list.
- The stage itself carries `role="img"` with the live caption as its accessible name, because it is a picture of the interface rather than the interface.

### Links and framing

The page carries the iframe height sender under the id `structure-list-intro`. Link targeting is applied by resolving each href and comparing hostnames, rather than by searching the href for `location.host`. The older approach fails when the page is opened from a file, where the host is an empty string that `indexOf` finds inside every URL, which sent outside links into the frame instead of a new tab. The same fix was applied to the handout generator inside index.html, which had the same latent bug.

### Known limitations

The live screen reader pass listed in section 6 is still outstanding and now covers this page too. The walkthrough in particular is worth hearing out loud, since its value to a screen reader rests entirely on the caption list and the live region rather than on anything visual.

---

## 9. The November 6 rebrand

index.html was restyled to the Rounds palette so the tool and its introduction sheet read as one thing. No wording, structure or behaviour changed; the swap is tokens, two typefaces and a navy band wrapped around the title block that was already there.

This improved the contrast floor rather than threatening it. Every text pair on the rebranded tool now clears AAA:

| Pair | Ratio |
|---|---|
| Gold eyebrow on the navy band | 10.46:1 |
| Title on the navy band | 20.36:1 |
| Supporting text on the navy band | 12.67:1 |
| Body text on a white card | 16.41:1 |
| Hint text on a white card | 8.01:1 |
| Hint text on the wash | 7.31:1 |
| Maroon label on a white card | 8.31:1 |
| White on a maroon fill | 8.31:1 |
| White on a navy fill | 20.36:1 |
| Navy on the navy tint | 17.92:1 |
| Maroon on the proposed-row tint | 7.08:1 |

The previous build had six text pairs sitting between 4.8:1 and 6.7:1, all of which are now above 7:1. One colour remains below AAA: gold-dark at 6.22:1, used for the keep-with-a-condition and needs-a-decision labels. It passes AA comfortably and is never the only signal, since both carry words.

Non-text: the control border is 3.19:1, clearing the 3:1 floor. The chip hairline at 1.92:1 is decoration on non-interactive chips only.

axe-core was re-run across the section view with a structure open, the results view, the personal list view, the publish panel and the page at 390 pixels. Zero violations in every state. The generated handout inherits the same palette and the same two typefaces and was audited again: zero.

### Turning the walkthrough off

The introduction sheet's walkthrough can be switched off entirely. Off hides the moving stage and its controls, leaves all six steps as plain text, explains in a sentence what has happened, and announces it through the live region. The choice is remembered per browser and wrapped so the page still works when storage is unavailable. Turning it off moves focus to the control that turns it back on, and turning it on moves focus back, so a keyboard user is never left on a button that has vanished.

### Step numbering

The step badges, the six-across strip and the position counter were brought into line. They all read 01 through 06. The earlier build labelled the badges 00 to 05 while the counter said Step 1 of 6, which asked the reader to do arithmetic to work out where they were.
