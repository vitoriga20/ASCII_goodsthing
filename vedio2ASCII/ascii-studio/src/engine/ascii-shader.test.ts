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
});
