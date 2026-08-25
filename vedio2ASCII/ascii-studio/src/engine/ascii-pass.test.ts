import { describe, expect, it } from 'vite-plus/test';
import { ASCII_UNIFORM_BYTES, asciiWorkgroups } from './ascii-pass';

describe('ASCII GPU pass helpers', () => {
	it('allocates one 32-byte uniform block for eight floats', () => {
		expect(ASCII_UNIFORM_BYTES).toBe(32);
	});

	it('uses the same 8×8 workgroup geometry as the effect chain', () => {
		expect(asciiWorkgroups(1920, 1080)).toEqual({ x: 240, y: 135 });
		expect(asciiWorkgroups(1, 1)).toEqual({ x: 1, y: 1 });
	});
});
