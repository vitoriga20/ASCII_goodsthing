# LocalCut ASCII Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a LocalCut-derived, local-first ASCII video editor with dual live preview, timeline editing, external-audio support, and reliable exports.

**Architecture:** The application is a fresh copy of the LocalCut baseline under `vedio2ASCII/ascii-studio`; the source reference remains read-only. The Worker-owned WebGPU pipeline receives a project-level ASCII effect state and applies it only to the program/ASCII monitor and export output. The source monitor is a second worker-owned canvas fed before the ASCII pass, while SolidJS owns accessible controls and low-frequency state only.

**Tech Stack:** SolidJS, Vite, TypeScript strict, Mediabunny, WebCodecs, WebGPU/WGSL, AudioWorklet, Vitest, pnpm.

---

## Target file map

- `vedio2ASCII/ascii-studio/` — LocalCut-derived application root.
- `src/engine/ascii-effect.ts` — ASCII parameter types, presets, normalization, activity rules, uniform packing.
- `src/engine/ascii-effect.test.ts` — pure ASCII behaviour tests.
- `src/engine/shaders/ascii.wgsl` — compute shader that maps luminance cells to a glyph-like procedural mask with colour modes.
- `src/engine/effects.ts` — registers and invokes the ASCII pass within the existing single-submission effect chain.
- `src/engine/gpu.ts`, `src/engine/worker.ts` — renders source and program canvases, accepts ASCII commands.
- `src/protocol.ts`, `src/protocol.test.ts` — typed project state and worker messages.
- `src/ui/AsciiInspector.tsx` — accessible ASCII presets and controls.
- `src/ui/DualPreview.tsx` — source/program preview shell and labels.
- `src/ui/StudioDock.tsx` — source import/audio controls and media facts.
- `src/ui/App.tsx`, `src/ui/worker-bridge.ts` — state/command wiring only.
- `src/ui/Toolbar.tsx`, `src/ui/Timeline.tsx`, `src/ui/ExportDialog.tsx` — concise studio chrome, transport, export and external-audio disclosure.
- `src/global.css` — screenshot-inspired desktop layout and tokens.
- `public/_headers`, `vite.config.ts` — retain COOP/COEP headers.

### Task 1: Create a clean, traceable LocalCut application copy

**Files:**
- Create: `vedio2ASCII/ascii-studio/` (copied from `参考/localcut-main/`)
- Create: `vedio2ASCII/ascii-studio/UPSTREAM.md`
- Verify: `vedio2ASCII/ascii-studio/pnpm-lock.yaml`

- [ ] **Step 1: Copy only the source baseline, not its generated/cache state**

Run from workspace root:

```powershell
robocopy '.\参考\localcut-main' '.\vedio2ASCII\ascii-studio' /E /XD node_modules dist .git .wrangler /XF '*.log'
if ($LASTEXITCODE -gt 7) { exit $LASTEXITCODE }
```

Expected: `vedio2ASCII/ascii-studio/package.json`, `src/`, `public/`, `pnpm-lock.yaml`, and `.kiro/` exist; no `node_modules` or nested `.git` is copied.

- [ ] **Step 2: Record the upstream source and local project boundary**

Create `UPSTREAM.md` containing:

```markdown
# Upstream baseline

This project began as a local copy of `../../参考/localcut-main` on 2026-08-25.
The reference repository is intentionally left unchanged. ASCII Studio changes live only here.

Use `pnpm` only. All video decoding, GPU effects, audio mixing, and export remain local to the browser.
```

- [ ] **Step 3: Install from the copied lockfile and prove baseline health**

Run:

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test -- --runInBand
```

Expected: lockfile unchanged; TypeScript and Vitest pass. If Vitest does not accept `--runInBand`, run `pnpm test` exactly as defined by the copied package script.

- [ ] **Step 4: Commit the import baseline**

```powershell
git add -- vedio2ASCII/ascii-studio
git commit -m "feat: initialize LocalCut ASCII Studio baseline"
```

### Task 2: Define a testable ASCII project model and worker protocol

**Files:**
- Create: `src/engine/ascii-effect.ts`
- Test: `src/engine/ascii-effect.test.ts`
- Modify: `src/protocol.ts`
- Test: `src/protocol.test.ts`

- [ ] **Step 1: Write failing parameter tests**

Cover the public API below: defaults, finite-number clamping, preset selection, explicit bypass, and uniform field order.

```ts
expect(normalizeAsciiEffect({ density: 999 }).density).toBe(180);
expect(normalizeAsciiEffect({ contrast: Number.NaN }).contrast).toBe(1);
expect(applyAsciiPreset('gold-dust').colourMode).toBe('gold');
expect(isAsciiActive({ ...DEFAULT_ASCII_EFFECT, enabled: false })).toBe(false);
expect(packAsciiUniform(DEFAULT_ASCII_EFFECT)).toEqual(
  new Float32Array([56, 1, 1, 0, 0, 0, 0, 0])
);
```

- [ ] **Step 2: Implement the self-contained model**

Create `ascii-effect.ts` around these exports:

```ts
export type AsciiColourMode = 'original' | 'green' | 'gold' | 'mono';
export type AsciiPresetId = 'matrix-green' | 'gold-dust' | 'classic-mono' | 'high-detail';
export interface AsciiEffectParams {
  readonly enabled: boolean;
  readonly density: number;
  readonly glyphScale: number;
  readonly brightness: number;
  readonly contrast: number;
  readonly threshold: number;
  readonly invert: boolean;
  readonly edgeStrength: number;
  readonly colourMode: AsciiColourMode;
}
export const DEFAULT_ASCII_EFFECT: AsciiEffectParams = { enabled: true, density: 56, glyphScale: 1, brightness: 0, contrast: 1, threshold: 0, invert: false, edgeStrength: 0, colourMode: 'green' };
export function normalizeAsciiEffect(input: Partial<AsciiEffectParams> | undefined): AsciiEffectParams;
export function applyAsciiPreset(id: AsciiPresetId): AsciiEffectParams;
export function isAsciiActive(params: AsciiEffectParams): boolean;
export function packAsciiUniform(params: AsciiEffectParams): Float32Array;
```

The implementation clamps density to `12..180`, glyphScale to `0.5..3`, brightness to `-1..1`, contrast to `0..3`, threshold and edgeStrength to `0..1`; it never emits `NaN` or an unsupported mode.

- [ ] **Step 3: Extend the protocol with typed state and commands**

Add:

```ts
export type AsciiCommand = { readonly type: 'set-ascii-effect'; readonly params: Partial<AsciiEffectParams> };
export type WorkerCommand = ExistingWorkerCommand | AsciiCommand;
export interface EditorStateSnapshot {
  readonly asciiEffect: AsciiEffectParams;
}
```

Use the actual existing protocol union name in place of `ExistingWorkerCommand`; normalize partial updates in the worker, never in several UI components.

- [ ] **Step 4: Run focused tests and commit**

```powershell
pnpm test -- src/engine/ascii-effect.test.ts src/protocol.test.ts
git add -- src/engine/ascii-effect.ts src/engine/ascii-effect.test.ts src/protocol.ts src/protocol.test.ts
git commit -m "feat: add ASCII effect state and protocol"
```

### Task 3: Add the ASCII WGSL pass without breaking the single-submission pipeline

**Files:**
- Create: `src/engine/shaders/ascii.wgsl`
- Modify: `src/engine/effects.ts`
- Modify: `src/engine/gpu.ts`
- Test: `src/engine/ascii-effect.test.ts`
- Test: `src/engine/effects.test.ts`

- [ ] **Step 1: Add the shader contract and its CPU-side test**

Add a test that verifies the uniform packing maps `density`, `glyphScale`, `brightness`, `contrast`, `threshold`, `invert`, `edgeStrength`, and `colourMode` to exactly eight float slots. This guards against a shader/UI drift without attempting to unit-test GPU pixels.

- [ ] **Step 2: Write `ascii.wgsl` as an output-texture compute pass**

The shader must declare one uniform buffer, a sampled source texture and a write-only output storage texture; calculate a cell coordinate from `density` and output aspect ratio; sample centre and neighbour luminance; select a procedural seven-level glyph mask from luminance; mix original, green (`0.18, 0.95, 0.62`), gold (`1.0, 0.72, 0.27`) or mono output. It must not use a canvas, read back pixels, or access external textures directly.

- [ ] **Step 3: Register and encode the pass in `EffectChain`**

Add a compiled `AsciiEffect` to `EffectChain`, allocating per-layer uniform buffers like existing effects. Add:

```ts
encodeAscii(
  encoder: GPUCommandEncoder,
  source: GPUTextureView,
  destination: GPUTextureView,
  width: number,
  height: number,
  params: AsciiEffectParams,
  slot: number
): GPUTextureView
```

Call it after the normal colour/film chain and before final compositing only for the program output. It is encoded into the caller-owned command encoder; it must never call `queue.submit`.

- [ ] **Step 4: Keep source and program monitor textures distinct**

In `gpu.ts`, copy/present the colour-corrected pre-ASCII texture to the source monitor and the ASCII result to the program monitor inside the existing render submission. Resize both OffscreenCanvas targets through the existing texture lifecycle. Export must consume the program texture, not the source texture.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm test -- src/engine/ascii-effect.test.ts src/engine/effects.test.ts
pnpm run typecheck
git add -- src/engine/ascii-effect.ts src/engine/ascii-effect.test.ts src/engine/shaders/ascii.wgsl src/engine/effects.ts src/engine/gpu.ts
git commit -m "feat: render ASCII through the GPU effect chain"
```

### Task 4: Wire dual previews, inspector controls, and preset interaction

**Files:**
- Create: `src/ui/DualPreview.tsx`
- Create: `src/ui/AsciiInspector.tsx`
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/PreviewCanvas.tsx`
- Modify: `src/ui/worker-bridge.ts`
- Modify: `src/global.css`
- Test: `src/ui/ascii-controls.test.ts`

- [ ] **Step 1: Write browser-mode UI tests**

Test that four preset buttons have names, an ASCII slider updates a worker-bridge command with a finite number, `aria-pressed` reflects the selected preset, and both preview canvases expose distinct labels: `Source video preview` and `ASCII video preview`.

- [ ] **Step 2: Implement one bridge function for live parameter updates**

Add to `worker-bridge.ts`:

```ts
setAsciiEffect(params: Partial<AsciiEffectParams>): void {
  this.post({ type: 'set-ascii-effect', params });
}
```

Do not send timer-driven updates; only send a command from an explicit user input event.

- [ ] **Step 3: Implement `DualPreview` and `AsciiInspector`**

`DualPreview` owns two existing-style preview canvas hosts and transfers each canvas to the worker once. `AsciiInspector` renders four named presets and native labelled range/checkbox/select controls for all ASCII parameters. Props are plain values and callbacks; it contains no media or GPU objects.

- [ ] **Step 4: Replace the former single-program preview composition in `App.tsx`**

Use `DualPreview` in the main workspace, place `AsciiInspector` in the right inspector rail, and read state snapshots into Solid signals. A selected preset sets the complete preset state in one command; a field only changes that field.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm run test:browser -- src/ui/ascii-controls.test.ts
pnpm run typecheck
git add -- src/ui/DualPreview.tsx src/ui/AsciiInspector.tsx src/ui/App.tsx src/ui/PreviewCanvas.tsx src/ui/worker-bridge.ts src/ui/ascii-controls.test.ts src/global.css
git commit -m "feat: add dual preview and ASCII controls"
```

### Task 5: Add independent audio input and export truthfulness

**Files:**
- Create: `src/engine/external-audio.ts`
- Test: `src/engine/external-audio.test.ts`
- Modify: `src/engine/project.ts`
- Modify: `src/engine/audio-source.ts`
- Modify: `src/engine/export.ts`
- Modify: `src/engine/worker.ts`
- Modify: `src/protocol.ts`
- Modify: `src/ui/StudioDock.tsx`
- Modify: `src/ui/ExportDialog.tsx`

- [ ] **Step 1: Test the audio routing policy**

Create a table-driven unit test for `resolveExportAudio`:

```ts
expect(resolveExportAudio({ sourceHasAudio: false, externalAudioId: null })).toEqual({ kind: 'silent', reason: 'no-audio-selected' });
expect(resolveExportAudio({ sourceHasAudio: true, externalAudioId: null })).toEqual({ kind: 'source' });
expect(resolveExportAudio({ sourceHasAudio: false, externalAudioId: 'audio-1' })).toEqual({ kind: 'external', sourceId: 'audio-1' });
```

- [ ] **Step 2: Implement external-audio state and import command**

`external-audio.ts` exports the discriminated `ExportAudioPlan` union and resolver. Add a project source role for `external-audio`, import it through the same lazy `BlobSource` flow as video, and store only its local source id/metadata in project state.

- [ ] **Step 3: Route export through the resolved audio plan**

`export.ts` must mux the selected external audio source when the plan is `external`, retain existing source mixing when `source`, and create video-only output when `silent`. Report `Audio: external file`, `Audio: source track`, or `Audio: no track` before export begins. Cancellation and encoder backpressure stay on the existing paths.

- [ ] **Step 4: Implement the UI affordance**

`StudioDock` gets a labelled `Add audio file` input/drop target accepting MP3/WAV/M4A. It displays a removable audio chip with filename and duration. `ExportDialog` repeats the resolved audio state as plain visible copy; it never calls it an error when source video is silent.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm test -- src/engine/external-audio.test.ts src/engine/export.test.ts
pnpm run typecheck
git add -- src/engine/external-audio.ts src/engine/external-audio.test.ts src/engine/project.ts src/engine/audio-source.ts src/engine/export.ts src/engine/worker.ts src/protocol.ts src/ui/StudioDock.tsx src/ui/ExportDialog.tsx
git commit -m "feat: support external audio during export"
```

### Task 6: Recreate the requested desktop studio composition and usable timeline chrome

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/Toolbar.tsx`
- Modify: `src/ui/Timeline.tsx`
- Modify: `src/ui/MediaBin.tsx`
- Modify: `src/ui/Inspector.tsx`
- Modify: `src/global.css`
- Create: `src/ui/studio-layout.test.ts`

- [ ] **Step 1: Add a layout regression test**

In browser mode assert the desktop editor has landmarks for `media controls`, `source and ASCII previews`, `ASCII controls`, and `timeline`; check Import, Export, Play, Split and ASCII preset controls are reachable by keyboard; verify the 900px media query changes the workspace to a single column.

- [ ] **Step 2: Apply the cinematic token layer in `global.css`**

Define tokens for ink, deep green panel, emerald signal, warm gold, edge, mono text and ambient background. Add an app-shell pseudo background with static radial specks, not a loaded third-party image; respect `prefers-reduced-motion`; set desktop grid to left rail / central dual preview / right rail with a bottom timeline spanning all columns. Keep every static panel flat and use warm gold only for selection, primary action and playhead.

- [ ] **Step 3: Arrange existing functional LocalCut components**

Use `MediaBin` and `StudioDock` in the left rail, `DualPreview` as the visual centre, `Inspector` plus `AsciiInspector` in the right rail, and the existing `Timeline` full-width below them. Do not replace timeline logic; only adapt its hosting, clip chrome and selected-state styling.

- [ ] **Step 4: Make top and bottom controls truthful**

Toolbar shows Import, worker capability tier, Undo/Redo, current timecode and Export. Timeline retains the existing Play/Pause, split, zoom and scrub semantics; controls are disabled only for documented no-media/unsupported states, with a visible reason.

- [ ] **Step 5: Verify and commit**

```powershell
pnpm run test:browser -- src/ui/studio-layout.test.ts
pnpm run typecheck
git add -- src/ui/App.tsx src/ui/Toolbar.tsx src/ui/Timeline.tsx src/ui/MediaBin.tsx src/ui/Inspector.tsx src/ui/studio-layout.test.ts src/global.css
git commit -m "feat: compose cinematic ASCII Studio workspace"
```

### Task 7: Harden export completion and execute end-to-end validation

**Files:**
- Modify: `src/engine/export.ts`
- Modify: `src/ui/ExportDialog.tsx`
- Modify: `src/features/docs/content/*` (relevant editor guide pages)
- Create: `tests/ascii-studio.spec.ts`

- [ ] **Step 1: Add an export-result guard test**

Test that the export completion state is produced only after the muxer finalizes and returns a non-empty Blob, and that a zero-byte Blob becomes a visible `Export failed: encoded file is empty` error rather than a download.

- [ ] **Step 2: Strengthen the completion boundary**

Make the worker send `export-complete` only after `await muxer.finalize()` returns a Blob whose `size > 0`; include duration, emitted video frame count, and resolved audio plan in the state snapshot. Keep download creation as a UI response to this completed result, never as an automation event awaited by the engine.

- [ ] **Step 3: Add a short real-media E2E flow**

Use a small non-copyright test fixture generated locally by FFmpeg or an existing LocalCut fixture. The Playwright flow imports it, waits for both monitor canvases, changes `Gold Dust`, performs a time-line seek, adds a small audio fixture, starts export, and asserts a nonzero downloadable Blob/result indicator. Do not run this flow in a software-only GPU environment as a substitute for visual GPU validation.

- [ ] **Step 4: Complete all quality gates and manual Chromium smoke test**

```powershell
pnpm run check
pnpm run test:e2e
pnpm dev -- --host 0.0.0.0
```

In Chromium, import the supplied local video and its separate MP3. Verify: accelerated/limited status is honest; the left monitor stays source video; the right monitor updates at pause and playback; presets/controls update immediately; split/trim/seek change both monitors; export output has a duration and audible selected audio.

- [ ] **Step 5: Commit documentation and verification work**

```powershell
git add -- vedio2ASCII/ascii-studio
git commit -m "test: verify ASCII Studio export workflow"
```

## Review checklist before handoff

- No `getImageData`, Canvas2D pixel readback, or continuous media work on the main thread.
- The accelerated path has exactly one `queue.submit` per rendered frame; `importExternalTexture` is per-frame, never cached.
- Both OffscreenCanvas instances transfer exactly once and all `VideoFrame` ownership paths close exactly once.
- COOP/COEP headers remain in Vite and `public/_headers`.
- No alternative package-manager lockfile, remote upload, telemetry or third-party media call is introduced.
- Unit-test count does not decrease; all `pnpm run check` stages pass.
