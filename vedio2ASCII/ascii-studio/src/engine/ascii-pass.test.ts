import { describe, expect, it } from 'vite-plus/test';
import { ASCII_ATLAS_CELL, ASCII_UNIFORM_BYTES, asciiWorkgroups } from './ascii-pass';

describe('ASCII GPU pass helpers', () => {
	it('allocates one 48-byte uniform block for twelve floats', () => {
		expect(ASCII_UNIFORM_BYTES).toBe(48);
	});

	it('uses a 32 px glyph cell so the capped atlas stays under texture limits', () => {
		// 96 code points × 32 px = 3072, well inside the 8192 px minimum.
		expect(ASCII_ATLAS_CELL).toBe(32);
	});

	it('uses the same 8×8 workgroup geometry as the effect chain', () => {
		expect(asciiWorkgroups(1920, 1080)).toEqual({ x: 240, y: 135 });
		expect(asciiWorkgroups(1, 1)).toEqual({ x: 1, y: 1 });
	});
});
