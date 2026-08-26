# ASCII character sets

Every ASCII-styled frame is built from a character set — a string of characters that doubles as a **brightness ramp**. This page explains how the ramp works and how to use the controls in the right-hand panel.

## How the ramp works

The character set maps **dark → bright**: the first character renders the darkest areas of the frame, the last character renders the brightest. The number of characters is the number of brightness levels — so `01` gives a two-level (binary) look, while a longer set like ` .:-=+*#%@` gives a smooth ten-level gradient.

Any characters work: letters, digits, symbols, spaces, CJK, even emoji. They are rendered on your device with the system monospace font into a glyph texture in the GPU pipeline; nothing leaves your browser.

## Choosing a character set

Open the **ASCII inspector** in the right-hand panel. Below the look presets, the **Character set** section offers five built-ins:

- **01 binary** — `01`: a two-level, digital look.
- **Classic ramp** — ` .:-=+*#%@`: from space (empty) to solid block.
- **Letters & digits** — ` .,:;i1tfLCG08@`: the classic video-to-ASCII gradient.
- **Matrix style** — half-width kana and symbols for a denser, "matrix" texture.
- **Symbols** — `:-=+*#%@`: the same gradient without the space tier.

## Custom characters

Type any text into the custom field below the presets. Order is dark → bright, so put the sparsest character first — a leading space makes a natural darkest level. The change applies to the live preview and to exports.

A character set is capped at 96 characters, and an empty input falls back to the default set. The look presets (Matrix Green, Gold Dust, and so on) also pick a matching character set, so re-apply the preset first if you want its other settings back after overriding.

## Where it applies

The character set is part of the ASCII effect, which is a global setting: every clip on the timeline shares one character set, and the same setting drives the live preview channel and exports.