# ASCII Style Duo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two standalone ASCII visual pages: a CRT biomechanical animation and an imperfect zine-inspired interactive composition.

**Architecture:** Each page is a self-contained `index.html` with its own CSS variables, ASCII artwork, and a small isolated script. Neither page references the existing GIF converter or any network resource. Visual behavior is verified in a browser and by static checks for external URLs.

**Tech Stack:** HTML, CSS animations, vanilla JavaScript, local browser verification.

---

### Task 1: Establish the standalone folders

**Files:**
- Create: `016-crt-biomorph/index.html`
- Create: `017-zine-ascii/index.html`

- [ ] **Step 1: Create the minimal document assertions**

Create a lightweight static check that expects both files to contain an HTML document, `<pre` artwork, and no `http://` or `https://` references.

- [ ] **Step 2: Run the check before implementation**

Run a PowerShell text search against the two target paths. Expected result: the files are absent, so the check fails because the two artifacts do not exist yet.

- [ ] **Step 3: Add the document shells**

Give each page a UTF-8 viewport-enabled HTML shell, a page title, an ASCII artwork container, and an inline script location. Do not add external dependencies.

- [ ] **Step 4: Run the static check again**

Expected result: both pages have the required document and `<pre` markers and contain no web URLs.

### Task 2: Implement the CRT biomechanical page

**Files:**
- Modify: `016-crt-biomorph/index.html`

- [ ] **Step 1: Define the visual behavior assertion**

The page must expose `data-mode="diagnostic"` initially and change it to `sleep` after a click; the face preformatted text must use a CSS `@keyframes` animation.

- [ ] **Step 2: Verify the assertion fails**

Search the initial shell for `data-mode`, `@keyframes`, and a click listener. Expected result: all markers are absent.

- [ ] **Step 3: Add CRT styling and state toggle**

Implement a dark phosphor palette, scanline overlay, flickering ASCII biomechanical face, HUD label, and a click handler that toggles the page `data-mode` attribute and label.

- [ ] **Step 4: Verify the assertion passes**

Search the completed page for the three behavior markers, then open it in a local browser. Expected result: no loading errors and a click changes the displayed system state.

### Task 3: Implement the imperfect zine page

**Files:**
- Modify: `017-zine-ascii/index.html`

- [ ] **Step 1: Define the visual behavior assertion**

The page must have `data-noise="low"` initially, CSS variables `--shift-x` and `--shift-y`, and pointer handling that updates both variables.

- [ ] **Step 2: Verify the assertion fails**

Search the initial shell for those three values. Expected result: the initial shell has none of them.

- [ ] **Step 3: Add zine styling and interaction**

Implement warm paper, grain, red/blue registration shifts, a layered ASCII portrait, pointer-driven movement, and a button that toggles low/high noise without hiding the artwork.

- [ ] **Step 4: Verify the assertion passes**

Search for the values and open the page locally. Expected result: pointer movement shifts the character layers and the control updates the noise state.

### Task 4: Final visual and dependency verification

**Files:**
- Verify: `016-crt-biomorph/index.html`
- Verify: `017-zine-ascii/index.html`

- [ ] **Step 1: Validate document structure**

Run the browser's DOM parser against each file. Expected result: an HTML document and its page title are available for both files.

- [ ] **Step 2: Validate local-only dependencies**

Search both directories for `http://`, `https://`, `src=`, and `@import`. Expected result: no matches.

- [ ] **Step 3: Manually validate responsive presentation**

Open each page at desktop and 320px widths. Expected result: artwork remains visible, labels do not overlap essential controls, and both interactions respond.

- [ ] **Step 4: Record actual verification results**

Report the static and browser results alongside direct links to each final HTML file. No commit step: the supplied folder is not a Git repository.
