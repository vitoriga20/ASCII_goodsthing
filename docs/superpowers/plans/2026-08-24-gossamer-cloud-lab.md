# Gossamer Cloud Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free static browser demo of a configurable, accessible animated ASCII environment inspired by Gossamer.

**Architecture:** One `index.html` supplies the responsive warm-toned interface and Canvas 2D rendering. A single state object drives a brightness-field renderer updated by `requestAnimationFrame`; the loop is paused for reduced-motion users until they explicitly play it. A PowerShell structural smoke test protects the required controls and animation lifecycle functions.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Canvas 2D, `requestAnimationFrame`, PowerShell.

---

## File structure

- Create: `020-gossamer-cloud-lab/index.html` — standalone UI, styles, animated pattern generator, and controls.
- Create: `020-gossamer-cloud-lab/README.md` — no-build use and control documentation.
- Create: `020-gossamer-cloud-lab/verify-static.ps1` — dependency-free structural smoke test.

### Task 1: Build the calm visual shell

**Files:**
- Create: `020-gossamer-cloud-lab/index.html`

- [ ] **Step 1: Add layout, labels, and warm visual tokens**

Create semantic `<header>`, `<main class="lab-grid">`, a labelled preview `<canvas id="fieldCanvas">`, an `<aside>` controls form, and `<p id="status" role="status">`. Use the following stable visual base:

```css
:root { --cream:#f4f1e8; --paper:#fffdf8; --bark:#2b241e; --pine:#2e6b4f; --moss:#76956a; --line:#d8d1c1; }
body { margin:0; background:var(--cream); color:var(--bark); font-family:system-ui,sans-serif; }
.lab-grid { display:grid; grid-template-columns:minmax(0,1.7fr) minmax(260px,.7fr); gap:24px; max-width:1180px; margin:auto; padding:28px; }
.card { background:color-mix(in srgb,var(--paper) 82%,transparent); border:1px solid var(--line); border-radius:16px; box-shadow:0 12px 30px #392e1a12; }
@media(max-width:760px){ .lab-grid { grid-template-columns:1fr; padding:14px; } }
```

- [ ] **Step 2: Add all controls with accessible labels**

Add a pattern `<select id="pattern">` containing clouds, waves, ripple, and static; a ramp `<select id="charset">`; a palette control; ranges `opacity` and `speed`; a play/pause button `id="playToggle"`; and a randomize button `id="randomize"`. Every input has a visible `<label>`.

- [ ] **Step 3: Manually verify layout**

Open `020-gossamer-cloud-lab/index.html`. Expected: the canvas is the visual focus, controls appear in a warm rounded panel, and the page changes to one column below 760px.

### Task 2: Render procedural ASCII patterns

**Files:**
- Modify: `020-gossamer-cloud-lab/index.html`
- Create: `020-gossamer-cloud-lab/verify-static.ps1`

- [ ] **Step 1: Add a failing lifecycle assertion**

Create this initial verifier and run it before the animation functions exist:

```powershell
$html = Get-Content -Raw "$PSScriptRoot/index.html"
if ($html -notmatch 'function renderField\(') { throw 'Expected renderField function is missing.' }
```

Run: `powershell -ExecutionPolicy Bypass -File .\verify-static.ps1` from `020-gossamer-cloud-lab`.

Expected: failure mentioning `Expected renderField function is missing.`

- [ ] **Step 2: Define visual state and pattern helpers**

Add the following state and helpers to the script:

```js
const state = { pattern:'clouds', charset:'·∙•◦○', palette:'forest', opacity:.86, speed:.65, running:!matchMedia('(prefers-reduced-motion: reduce)').matches, seed:Math.random()*1000 };
function fract(v) { return v - Math.floor(v); }
function noise(x,y) { return fract(Math.sin(x*12.9898+y*78.233+state.seed)*43758.5453); }
function brightness(x,y,t) {
  if (state.pattern === 'static') return noise(x,y);
  if (state.pattern === 'waves') return .5 + .5*Math.sin(x*7+y*3+t*2);
  if (state.pattern === 'ripple') return .5 + .5*Math.sin(Math.hypot(x-.5,y-.5)*22-t*3);
  return .5 + .26*Math.sin(x*5+t) + .16*Math.sin(y*7-t*.7) + .12*Math.sin((x+y)*11+t*.4);
}
```

- [ ] **Step 3: Implement the Canvas renderer**

Add `renderField(time)` using the bounded grid, selected charset, and palette. The renderer must work even before the animation loop starts:

```js
function renderField(time=0) {
  const canvas=document.querySelector('#fieldCanvas'), ctx=canvas.getContext('2d');
  const w=canvas.width=Math.max(320,canvas.clientWidth*devicePixelRatio), h=canvas.height=Math.round(w*.61);
  const cell=Math.max(9,Math.round(13*devicePixelRatio)), cols=Math.floor(w/cell), rows=Math.floor(h/cell), chars=state.charset;
  ctx.fillStyle='#2b241e'; ctx.fillRect(0,0,w,h); ctx.font=`${cell}px ui-monospace, monospace`; ctx.textBaseline='top';
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) { const v=Math.max(0,Math.min(1,brightness(col/cols,row/rows,time*.001*state.speed))); const tone=state.palette==='forest'?`hsla(${120+v*40},${26+v*35}%,${34+v*46}%,${state.opacity})`:`hsla(${36+v*20},${26+v*38}%,${43+v*44}%,${state.opacity})`; ctx.fillStyle=tone; ctx.fillText(chars[Math.min(chars.length-1,Math.floor(v*chars.length))],col*cell,row*cell); }
}
```

- [ ] **Step 4: Verify the renderer structure**

Expand `verify-static.ps1` to require `fieldCanvas`, `function renderField(`, `function brightness(`, `prefers-reduced-motion`, and `requestAnimationFrame`. Run it.

Expected: `Gossamer static structure verified.`

### Task 3: Add the animation lifecycle and interactive controls

**Files:**
- Modify: `020-gossamer-cloud-lab/index.html`
- Modify: `020-gossamer-cloud-lab/verify-static.ps1`

- [ ] **Step 1: Implement pause/resume safely**

Use a single animation callback and avoid scheduling when paused:

```js
let frameId = 0;
function tick(time) { renderField(time); if (state.running) frameId=requestAnimationFrame(tick); }
function setRunning(next) { state.running=next; document.querySelector('#playToggle').textContent=next?'Pause field':'Play field'; if(next) { cancelAnimationFrame(frameId); frameId=requestAnimationFrame(tick); } else { cancelAnimationFrame(frameId); renderField(performance.now()); } }
```

After creating the UI, call `renderField(0)` and `setRunning(state.running)`. Bind `resize` to a non-animated `renderField(performance.now())` redraw.

- [ ] **Step 2: Bind immediate controls and valid randomization**

On input/change, update the matching state field then call `renderField(performance.now())`. Randomization must select from the values actually present in the controls:

```js
function randomize() {
  state.pattern=['clouds','waves','ripple','static'][Math.floor(Math.random()*4)];
  state.charset=['·∙•◦○',' .:-=+*#%@','░▒▓█'][Math.floor(Math.random()*3)];
  state.palette=Math.random()>.5?'forest':'amber'; state.opacity=.55+Math.random()*.4; state.speed=.25+Math.random()*1.25;
  syncControls(); renderField(performance.now()); setStatus('A fresh field has been composed.');
}
```

- [ ] **Step 3: Add status/error guard and test it manually**

Wrap `canvas.getContext('2d')` in a null check; when unavailable set the live status to `Canvas 2D is unavailable in this browser.` and return. Test play/pause, all four patterns, each ramp/palette, slider movement, randomize, and a narrow viewport.

- [ ] **Step 4: Run the expanded verifier**

Require `setRunning`, `function randomize(`, `playToggle`, `randomize`, `opacity`, and `speed` in `verify-static.ps1`, then emit `Gossamer static structure verified.`. Run it.

Expected: `Gossamer static structure verified.`

### Task 4: Document the demo

**Files:**
- Create: `020-gossamer-cloud-lab/README.md`

- [ ] **Step 1: Write use and accessibility documentation**

Include the title `Gossamer Cloud Lab`, explain that it is a static Canvas demo inspired by the supplied Gossamer reference, and document opening `index.html`, the four patterns, controls, default cloud state, reduced-motion behavior, no dependencies/network requirements, and the PowerShell smoke-test command.

- [ ] **Step 2: Re-run the smoke test**

Run: `powershell -ExecutionPolicy Bypass -File .\verify-static.ps1`

Expected: `Gossamer static structure verified.`

- [ ] **Step 3: Commit when version control becomes available**

There is no Git repository in this workspace. Do not initialize or commit one. If Git is later available, commit only the three new Gossamer files with message `feat: add gossamer cloud lab demo`.
