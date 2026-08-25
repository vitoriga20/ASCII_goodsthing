import { describe, expect, it } from 'vite-plus/test';
import shader from './shaders/ascii.wgsl?raw';

describe('ASCII compute shader contract', () => {
	it('uses an eight-slot uniform block and storage-texture output', () => {
		expect(shader).toContain('struct AsciiUniforms');
		expect(shader).toContain('colourMode: f32');
		expect(shader).toContain('var src: texture_2d<f32>');
		expect(shader).toContain('var dst: texture_storage_2d<rgba16float, write>');
		expect(shader).toContain('textureStore(dst');
	});

	it('uses vector clamp bounds when scaling glyph-local coordinates', () => {
		expect(shader).toContain(
			'let scaled = clamp((local - vec2f(0.5)) / u.glyphScale + vec2f(0.5), vec2f(0.0), vec2f(1.0));'
		);
	});
	it('maps tone levels to 5x7 ASCII bitmap glyphs instead of filling bright cells', () => {
		expect(shader).toContain('fn glyphRow(glyph: u32, row: u32) -> u32');
		expect(shader).toContain(
			'let pixel = min(vec2u(floor(scaled * vec2f(5.0, 7.0))), vec2u(4u, 6u));'
		);
		expect(shader).toContain('let mask = glyphMask(scaled, min(7u, u32(floor(value * 8.0))));');
		expect(shader).not.toContain('return 1.0;');
	});
});