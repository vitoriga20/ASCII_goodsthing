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
});
