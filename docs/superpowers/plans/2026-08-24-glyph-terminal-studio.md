# Glyph Terminal Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free static browser demo that converts a selected image into a configurable terminal-style ASCII artwork and exports it as PNG.

**Architecture:** One `index.html` contains semantic markup, responsive CSS, and a small Canvas 2D application. State lives in a single `state` object; every input change calls `render()`, which samples the selected or procedural source into a bounded character grid before applying style and effects. A small PowerShell verifier confirms all required DOM controls and renderer entry points remain present.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Canvas 2D, browser File APIs, PowerShell.

---

## File structure

- Create: `019-glyph-terminal-studio/index.html` — standalone UI, styles, Canvas renderer, upload/export logic.
- Create: `019-glyph-terminal-studio/README.md` — browser usage and no-build workflow.
- Create: `019-glyph-terminal-studio/verify-static.ps1` — structural smoke test runnable without package installation.

### Task 1: Create the terminal application shell

**Files:**
- Create: `019-glyph-terminal-studio/index.html`

- [ ] **Step 1: Add the semantic layout and design tokens**

Create `index.html` with a `<main class="app-shell">`, a preview `<canvas id="asciiCanvas" aria-label="ASCII artwork preview">`, an upload drop zone/button, a labelled `<aside>` controls panel, a live `<p id="status" role="status">`, and an export `<button id="exportButton">`. Define the core terminal tokens and mobile breakpoint:

```css
:root { --ink:#070807; --panel:#101210; --line:#32372e; --text:#e8eadf; --muted:#919887; --acid:#e7ff3f; }
body { margin:0; min-width:320px; background:var(--ink); color:var(--text); font-family:ui-monospace,Consolas,monospace; }
.workspace { display:grid; grid-template-columns:minmax(0,1fr) 320px; min-height:100vh; }
@media (max-width:760px) { .workspace { grid-template-columns:1fr; } .controls { border-left:0; border-top:1px solid var(--line); } }
```

- [ ] **Step 2: Add named, keyboard-reachable controls**

Place three character ramp buttons (`data-ramp="classic"`, `blocks`, `binary`), radios named `palette` for `mono` and `matrix`, range inputs `fontSize`, `contrast`, and `dither`, and checkboxes `crt` and `rain`. Give each control a `<label>` and an adjacent `<output>` where its current value is useful.

- [ ] **Step 3: Add the deterministic default source generator**

Add an offscreen `<canvas>` source and a `drawDefaultSource()` function that paints a yellow-green radial glow, a horizon line, and dark geometric rings. Call it before the first render so the page is useful before upload:

```js
function drawDefaultSource() {
  source.width = 960; source.height = 600;
  const g = source.getContext('2d');
  const glow = g.createRadialGradient(500, 280, 5, 500, 280, 420);
  glow.addColorStop(0, '#f4ff99'); glow.addColorStop(.42, '#668229'); glow.addColorStop(1, '#050704');
  g.fillStyle = glow; g.fillRect(0, 0, source.width, source.height);
  g.strokeStyle = '#dfff4d'; g.lineWidth = 4;
  for (let r = 65; r < 420; r += 55) { g.beginPath(); g.arc(500,280,r,0,Math.PI*2); g.stroke(); }
}
```

- [ ] **Step 4: Manually open the page**

Open `019-glyph-terminal-studio/index.html` in a browser. Expected: the preview area shows the default source region, all controls are visible, and the narrow viewport stacks the sidebar below the preview.

### Task 2: Implement image-to-ASCII rendering

**Files:**
- Modify: `019-glyph-terminal-studio/index.html`

- [ ] **Step 1: Define state and ramp data**

Add state and mappings near the application script:

```js
const ramps = { classic:' .,:;irsXA253hMHGS#9B&@', blocks:' ░▒▓█', binary:' 01' };
const state = { ramp:'classic', palette:'mono', fontSize:11, contrast:1.15, dither:0.08, crt:false, rain:false };
const source = document.createElement('canvas');
const canvas = document.querySelector('#asciiCanvas');
```

- [ ] **Step 2: Add a failing structural assertion to the verifier**

Create `verify-static.ps1` with this assertion before adding the renderer, then run it once so it fails because the function is absent:

```powershell
$html = Get-Content -Raw "$PSScriptRoot/index.html"
if ($html -notmatch 'function render\(') { throw 'Expected render function is missing.' }
```

Run: `powershell -ExecutionPolicy Bypass -File .\verify-static.ps1` from `019-glyph-terminal-studio`.

Expected: failure mentioning `Expected render function is missing.`

- [ ] **Step 3: Implement the renderer**

Add `render()` and use luminance/contrast mapping. Use a bounded grid so previews stay responsive:

```js
function render() {
  const ctx = canvas.getContext('2d'); const w = canvas.width = Math.max(320, canvas.clientWidth * devicePixelRatio);
  const h = canvas.height = Math.round(w * .62); const cell = state.fontSize * devicePixelRatio;
  const cols = Math.max(24, Math.floor(w / cell)), rows = Math.max(14, Math.floor(h / cell));
  const sample = document.createElement('canvas'); sample.width = cols; sample.height = rows;
  const sctx = sample.getContext('2d'); sctx.drawImage(source, 0, 0, cols, rows);
  const pixels = sctx.getImageData(0,0,cols,rows).data, ramp = ramps[state.ramp];
  ctx.fillStyle = state.palette === 'matrix' ? '#031008' : '#050604'; ctx.fillRect(0,0,w,h);
  ctx.font = `${cell}px ui-monospace, monospace`; ctx.textBaseline = 'top';
  for (let y=0; y<rows; y++) for (let x=0; x<cols; x++) {
    const i=(y*cols+x)*4, lum=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;
    const adjusted=Math.max(0,Math.min(1,(lum-.5)*state.contrast+.5+(Math.random()-.5)*state.dither));
    ctx.fillStyle = state.palette === 'matrix' ? `rgb(${20+adjusted*80},${100+adjusted*155},${40+adjusted*110})` : `rgb(${adjusted*255},${adjusted*255},${adjusted*230})`;
    ctx.fillText(ramp[Math.min(ramp.length-1,Math.floor(adjusted*(ramp.length-1)))],x*cell,y*cell);
  }
  drawEffects(ctx,w,h,cell); setStatus(`${cols} × ${rows} glyphs · ready`);
}
```

- [ ] **Step 4: Implement optional effects and render wiring**

Add `drawEffects(ctx,w,h,cell)` with a low-opacity horizontal-line CRT overlay and an optional Matrix rain loop. Bind every input/change event to state updates followed by `render()`. Use `window.addEventListener('resize', render)` and call `render()` after `drawDefaultSource()`.

- [ ] **Step 5: Run the verifier**

Expand `verify-static.ps1` to require `asciiCanvas`, `function render(`, `drawEffects`, `fontSize`, `contrast`, `dither`, `exportButton`, and `drop-zone` selectors. Run it.

Expected: `Glyph static structure verified.`

### Task 3: Add upload, error handling, and PNG export

**Files:**
- Modify: `019-glyph-terminal-studio/index.html`
- Modify: `019-glyph-terminal-studio/verify-static.ps1`

- [ ] **Step 1: Add safe image loading**

Implement `loadFile(file)`, allowing only `file.type.startsWith('image/')`. On invalid input call `setStatus('Choose a readable image file.', true)`. On `Image.onerror`, call `setStatus('That image could not be decoded.', true)`. On successful image load, resize the offscreen source, draw it, then call `render()`.

```js
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return setStatus('Choose a readable image file.', true);
  const image = new Image(); image.onload = () => { source.width=image.naturalWidth; source.height=image.naturalHeight; source.getContext('2d').drawImage(image,0,0); render(); setStatus(`Loaded ${file.name}`); };
  image.onerror = () => setStatus('That image could not be decoded.', true);
  image.src = URL.createObjectURL(file);
}
```

- [ ] **Step 2: Bind click, input, drop, and export flows**

Clicking the drop zone opens a hidden file input; support `dragover`, `dragleave`, and `drop`, calling `preventDefault()` on drag events. Export via `canvas.toBlob`; if the blob is null, set an error status. Otherwise create a temporary `<a download="glyph-terminal.png">` and click it.

- [ ] **Step 3: Add verifier checks and execute them**

Require `loadFile`, `toBlob`, `image/`, and `role="status"` in `verify-static.ps1`. Emit `Glyph static structure verified.` after the checks. Run the verifier.

Expected: `Glyph static structure verified.`

- [ ] **Step 4: Perform browser acceptance checks**

Open the page, upload a valid PNG/JPEG, try a non-image file, change each slider/toggle/ramp, use both palettes, and click download. Expected: each valid setting redraws immediately, invalid input becomes a readable status message, and a PNG download starts.

### Task 4: Document the demo

**Files:**
- Create: `019-glyph-terminal-studio/README.md`

- [ ] **Step 1: Write concise user documentation**

Include the title `Glyph Terminal Studio`, state that it is a static Canvas demo inspired by the supplied Glyph reference, and document: open `index.html` directly; image upload/drop; controls; PNG export; no dependencies or network access; and `powershell -ExecutionPolicy Bypass -File .\verify-static.ps1` as the smoke test.

- [ ] **Step 2: Re-run the smoke test**

Run: `powershell -ExecutionPolicy Bypass -File .\verify-static.ps1`

Expected: `Glyph static structure verified.`

- [ ] **Step 3: Commit when version control becomes available**

There is no Git repository in this workspace. Do not initialize or commit one. If the project later gains Git, commit only the three new Glyph files with message `feat: add glyph terminal studio demo`.
