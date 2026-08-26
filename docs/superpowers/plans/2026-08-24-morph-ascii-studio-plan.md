# MORPH / ASCII Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single, high-impact product recommendation landing page for software that converts images, video, and GIFs into editable ASCII visuals.

**Architecture:** A self-contained static page will combine semantic HTML content, a responsive CSS art direction system, three generated product images, and a client-side Canvas character-field engine. The engine draws real characters into multiple canvas layers and responds to pointer position, scroll visibility, and a user-controlled energy mode.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Canvas 2D, generated PNG assets.

---

## File structure

- Create: `021-morph-ascii-studio/index.html` — full page markup, responsive styles, motion engine, navigation, energy toggle, and interaction handlers.
- Create: `021-morph-ascii-studio/README.md` — launch instructions, feature map, image credits, and manual acceptance checklist.
- Use: `assets/generated/ascii-studio-hero-monitor.png` — hero image.
- Use: `assets/generated/ascii-studio-video-transform.png` — video feature image.
- Use: `assets/generated/ascii-studio-gif-console.png` — GIF/control feature image.

No automated test script is included. The user explicitly requested manual verification.

### Task 1: Establish the page shell and product narrative

**Files:**
- Create: `021-morph-ascii-studio/index.html`

- [ ] **Step 1: Create the semantic document structure**

Add a full HTML document with a fixed header and these labelled sections: `hero`, `formats`, `motion`, `controls`, and `start`. Use accessible landmark elements and matching navigation anchors.

```html
<header class="site-header">
  <a class="brand" href="#top" aria-label="MORPH home">MORPH<span>/</span>ASCII</a>
  <nav aria-label="Primary navigation">
    <a href="#formats">Formats</a>
    <a href="#motion">Motion</a>
    <a href="#controls">Control</a>
  </nav>
  <button class="energy-toggle" type="button" aria-pressed="true">High energy</button>
</header>
<main id="top">
  <section id="hero" class="hero section-dark">…</section>
  <section id="formats" class="formats">…</section>
  <section id="motion" class="motion section-dark">…</section>
  <section id="controls" class="controls">…</section>
  <section id="start" class="start section-dark">…</section>
</main>
```

- [ ] **Step 2: Write final product copy and calls to action**

Use the name `MORPH / ASCII Studio`; lead with `Every frame has another language.` Include actual supported media labels `IMAGE`, `VIDEO`, and `GIF`; describe adjustable `Glyph set`, `Density`, `Dither`, `Colour`, and `Layers`. Use `Start creating` and `Watch it morph` as calls to action, with no placeholder text.

- [ ] **Step 3: Add the three real product visuals**

Use the generated files via relative asset paths, descriptive alt text, and explicit image width/height behavior.

```html
<img class="hero-product" src="../assets/generated/ascii-studio-hero-monitor.png"
  alt="MORPH desktop application converting a mountain photograph into ASCII characters">
<img src="../assets/generated/ascii-studio-video-transform.png"
  alt="Video frame of a dancer transforming into character art inside MORPH">
<img src="../assets/generated/ascii-studio-gif-console.png"
  alt="MORPH's GIF conversion console with a character-rendered botanical image">
```

- [ ] **Step 4: Manually inspect content hierarchy**

Open `021-morph-ascii-studio/index.html` in a browser. Confirm the first viewport states what MORPH does, shows the real hero image, and exposes one clear action.

### Task 2: Build the night editorial visual system

**Files:**
- Modify: `021-morph-ascii-studio/index.html`

- [ ] **Step 1: Define design tokens and foundational layout**

Set a near-black base, moss-green secondary tones, warm ivory copy, a wide editorial serif for headings, and a compact monospace face for labels. Limit the content column and reserve asymmetric whitespace around imagery.

```css
:root {
  --ink: #070a0a;
  --panel: #0c1413;
  --line: rgba(184, 238, 205, .18);
  --mist: #9bd8ad;
  --acid: #c9ff9a;
  --paper: #f0f2df;
  --muted: #9daaa2;
}
html { scroll-behavior: smooth; background: var(--ink); }
body { margin: 0; color: var(--paper); background: var(--ink); }
```

- [ ] **Step 2: Style the page as an editorial product story**

Create a large two-column hero that collapses below 760px; use thin rules, oversized serif headlines, compact metadata, carefully rounded product frames, and dark green radial light. Keep paragraph and button contrast readable while ASCII layers remain beneath the content.

- [ ] **Step 3: Add high-end motion-ready styling**

Add CSS for the canvas layers, image masking, hover lift, scanning shimmer, card borders, and section reveal classes. Keep all visual elements non-blocking with `pointer-events: none` unless they are explicit buttons or links.

- [ ] **Step 4: Manually inspect desktop and narrow layout**

Resize the browser from 1440px to 390px. Confirm no copy is hidden behind images, no horizontal scrollbar appears, and the header navigation remains usable.

### Task 3: Implement real character-field effects

**Files:**
- Modify: `021-morph-ascii-studio/index.html`

- [ ] **Step 1: Add actual canvas targets to the hero and image chapters**

Place one canvas in the hero, one over the video feature image, and one in the closing CTA. Mark canvases `aria-hidden="true"`; keep the images and all text as separate semantic content.

```html
<canvas class="glyph-field hero-field" aria-hidden="true"></canvas>
<canvas class="glyph-field image-field" aria-hidden="true"></canvas>
<canvas class="glyph-field finale-field" aria-hidden="true"></canvas>
```

- [ ] **Step 2: Implement a reusable Canvas glyph field**

Create a `GlyphField` class holding its canvas context, density, character set, random seeded cells, pointer state, intensity, and animation frame identifier. `draw(time)` must fill the canvas with actual glyphs selected from ` .·:+*#%@`, whose alpha and drift derive from a trigonometric noise field plus pointer distance.

```js
class GlyphField {
  constructor(canvas, options) { /* canvas, palette, density, mode */ }
  resize() { /* device-pixel-ratio sizing and grid calculation */ }
  setPointer(x, y) { /* store normalized pointer position */ }
  setIntensity(value) { /* update quiet/high energy multiplier */ }
  draw(time) { /* clear, choose glyphs, draw visible character cells */ }
  start() { /* requestAnimationFrame loop */ }
  stop() { /* cancelAnimationFrame loop */ }
}
```

- [ ] **Step 3: Add scene-specific treatments**

Use a sparse cloud/particle field in the hero; use a horizontal brightness wave and stronger character density above the video conversion image; use a circular spiral and slowly advancing scan line in the final CTA. These are three parameter configurations of the same `GlyphField`, not character screenshots.

- [ ] **Step 4: Add visibility and pointer coordination**

Use `IntersectionObserver` to start a field when its section enters the viewport and stop it after it leaves. Update the hero pointer on `pointermove`; the code should only shift character cells in a soft radius around the pointer.

- [ ] **Step 5: Manually inspect the effect quality**

On desktop, verify that every active layer is composed of individually drawn characters, the hero reacts to pointer movement, video and CTA effects animate only near their sections, and text remains readable at rest.

### Task 4: Add product interactions and high-energy control

**Files:**
- Modify: `021-morph-ascii-studio/index.html`

- [ ] **Step 1: Implement the High energy / Quiet field control**

Make the fixed-header button switch its visible label, `aria-pressed` state, and a `data-energy` attribute on `<body>`. High energy uses full particle density, scan rate, and pointer pull. Quiet mode lowers opacity and speed without freezing all effects.

```js
energyToggle.addEventListener('click', () => {
  const highEnergy = document.body.dataset.energy !== 'high';
  document.body.dataset.energy = highEnergy ? 'high' : 'quiet';
  energyToggle.setAttribute('aria-pressed', String(highEnergy));
  energyToggle.textContent = highEnergy ? 'High energy' : 'Quiet field';
  fields.forEach(field => field.setIntensity(highEnergy ? 1 : 0.42));
});
```

- [ ] **Step 2: Make primary CTAs feel complete**

When `Start creating` or `Watch it morph` is clicked, prevent a dead-end action by displaying an inline, dismissible status note: `Early access is opening soon. You are on the list.` This is a local interaction only; no form or external submission is implied.

- [ ] **Step 3: Add meaningful hover interactions**

On the three supported media cards, animate the border and a small character preview; on the control cards, reveal concise descriptions. Ensure keyboard focus uses the same visible treatment as hover.

- [ ] **Step 4: Preserve the effect-first responsiveness rule**

At viewport widths below 760px, retain all three canvas effects and interaction control while calculating fewer grid columns. Do not replace the page with static placeholders. If the browser reports `prefers-reduced-motion: reduce`, use a single initial draw and allow the energy toggle to remain available.

- [ ] **Step 5: Manually inspect interactions**

Click the energy control twice, each navigation link, both CTAs, and each media card. Confirm state labels, visual behavior, focus appearance, and in-page navigation respond as described.

### Task 5: Write handoff documentation and complete manual acceptance

**Files:**
- Create: `021-morph-ascii-studio/README.md`

- [ ] **Step 1: Document local launch and page inventory**

State that the page opens directly by double-clicking `index.html` or serving the folder locally. List the three product assets, the three Canvas fields, the high-energy control, and the CTA status behavior.

- [ ] **Step 2: Add the manual acceptance checklist**

Include these exact checks:

```markdown
- [ ] Hero product image loads and real character particles react to the pointer.
- [ ] Image, video, and GIF cards are legible and show their interaction feedback.
- [ ] Video and CTA sections render different, animated character fields when scrolled into view.
- [ ] High energy and Quiet field change density and speed without breaking the page.
- [ ] Navigation scrolls to the correct section and both CTAs return a visible status message.
- [ ] The page remains readable and usable at 1440px, 768px, and 390px widths.
```

- [ ] **Step 3: Perform the checklist manually**

Open the finished page in a desktop browser, then use responsive browser sizing for 768px and 390px. Record any visual problem directly in `README.md` under `Known limitations`; if none occur, write `None observed during manual acceptance.`
