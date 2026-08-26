# Dual ASCII demos — design specification

## Goal

Create two standalone, browser-only interactive demos inspired by the distinct strengths of the supplied open-source references. Each demo must be usable independently and must emphasize its own visual identity and core interaction rather than attempting feature parity with its reference.

## Deliverables

- `019-glyph-terminal-studio`: an image-to-ASCII creator inspired by `参考/glyph-master`.
- `020-gossamer-cloud-lab`: an animated ambient ASCII field inspired by `参考/Gossamer-main`.

Each deliverable will be self-contained, include a README with run/build instructions, and avoid changing either reference project or any existing demo.

## Demo A: Glyph Terminal Studio

### Experience

The page is a precision creative tool: near-black background, thin gray borders, compact uppercase labels, monospaced status text, and acid-yellow accent color. A large center canvas previews the converted image; a right-side control panel remains visible on desktop and stacks below the preview on small screens.

### Features

- Drop or select a raster image. A supplied procedural/default image keeps the demo immediately usable before upload.
- Convert the source image to a brightness grid and map its values to one of three selectable character ramps.
- Adjust character size, contrast, and dither strength with sliders; changes redraw the preview immediately.
- Switch between grayscale and green Matrix-like colour treatments.
- Enable either CRT scanlines or Matrix-rain overlay (or neither).
- Export the current canvas image as a PNG.

### Rendering and state flow

The application owns a small local state object for source image, character ramp, display mode, sliders, and effect toggles. Any state change invokes a canvas render function. That function samples the source into a bounded grid, computes luminance and contrast, applies the selected dithering rule, then draws characters and optional overlays. Image loading uses `FileReader`/`Image`; invalid or unreadable files surface a visible status message. Export failures surface the same way.

## Demo B: Gossamer Cloud Lab

### Experience

The page is a calmer visual instrument: warm cream background, bark-brown preview canvas, forest-green accents, frosted translucent panels, soft rounded corners, and spacious type. The live canvas is the visual focus, followed by an accessible controls panel; desktop uses a two-column layout and small screens use one column.

### Features

- Animate a brightness grid as clouds, waves, ripples, or static noise.
- Map the brightness grid through a selectable light-to-dense character ramp.
- Choose from a small curated palette, transparency, and animation speed.
- Pause/resume animation and generate a randomized but valid parameter set.
- Seed the initial view with the cloud pattern.
- Respect `prefers-reduced-motion` by starting paused/reducing motion, while retaining an explicit play control.

### Rendering and state flow

The application keeps local state for pattern, palette, ramp, opacity, speed, paused state, and a random seed. A `requestAnimationFrame` loop updates a time value only while animation is enabled; it renders the brightness grid to a canvas at a capped, responsive grid size. Controls update state and schedule an immediate redraw. Canvas initialization or rendering errors appear in a small in-page status area.

## Shared technical boundaries

- Both demos are static browser applications with no server, database, authentication, camera access, video support, templates, or library persistence.
- Both use Canvas 2D and local browser APIs only. They must not require an external image/font/network request to work.
- The projects must be independently runnable and buildable from their own folders.
- UI controls must be keyboard reachable and have readable labels.

## Validation

For each demo:

1. Run the production build successfully.
2. Open the demo and confirm the initial canvas renders without an upload.
3. Exercise every control and confirm the canvas updates.
4. For Glyph, upload a valid image, reject an invalid file gracefully, and verify PNG export.
5. For Gossamer, verify pause/resume, randomization, all patterns, and reduced-motion initial behavior.
6. Check a narrow viewport for non-overlapping, usable controls.

## Explicit exclusions

The work deliberately excludes full reproduction of the reference projects: Glyph's webcam/video sources, multi-layer system, IndexedDB gallery, templates, and broad export formats; and Gossamer's full package API, Svelte integration, twelve-pattern gallery, and advanced offscreen character atlas pipeline.
