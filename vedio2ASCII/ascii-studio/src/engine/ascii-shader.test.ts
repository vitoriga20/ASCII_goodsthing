import { describe, expect, it } from 'vite-plus/test';
import shader from './shaders/ascii.wgsl?raw';

describe('ASCII compute shader contract', () => {
	it('uses a twelve-slot uniform block and storage-texture output', () => {
		expect(shader).toContain('struct AsciiUniforms');
		expect(shader).toContain('colourMode: f32');
		expect(shader).toContain('charCount: f32');
		expect(shader).toContain('var src: texture_2d<f32>');
		expect(shader).toContain('var dst: texture_storage_2d<rgba16float, write>');
		expect(shader).toContain('textureStore(dst');
	});

	it('reads the glyph atlas with textureLoad (compute stage has no sampler)', () => {
		expect(shader).toContain('var atlas: texture_2d<f32>');
		expect(shader).toContain('textureLoad(atlas');
		expect(shader).toContain('const atlasCell: u32 = 32u;');
		expect(shader).not.toContain('atlasSampler');
	});

	it('samples by char level and keeps the classic stage bindings', () => {
		expect(shader).not.toContain('fn glyphMask');
		expect(shader).toContain('let index = min(levelCount - 1.0, floor(value * levelCount));');
		expect(shader).toContain('u32(index) * atlasCell + glyphX');
	});
});
