import { describe, expect, it } from 'vite-plus/test';
import shader from '../engine/shaders/ascii.wgsl?raw';
import { DEFAULT_ASCII_EFFECT, packAsciiUniform } from '../engine/ascii-effect';
import { asciiWorkgroups } from '../engine/ascii-pass';

/**
 * Black-screen repro for the atlas rework: compiles the real WGSL, builds the
 * glyph atlas exactly like AsciiPass.ensureAtlas, runs one full compute pass on
 * a white input, and reads back both the atlas and the output. The atlas
 * readback isolates "upload/canvas is black" from "pass logic is black".
 *
 * Skips when the environment has no GPU adapter (e.g. headless CI without
 * SwiftShader WebGPU); on a machine with WebGPU it acts as a real regression
 * test for the render path.
 */
async function webgpuAdapterAvailable(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false;
	try {
		return (await navigator.gpu.requestAdapter()) !== null;
	} catch {
		return false;
	}
}

const gpuOk = await webgpuAdapterAvailable();
const runOnGpu = gpuOk ? it : it.skip;

describe('ASCII atlas render (real WebGPU)', () => {
	runOnGpu('uploads a non-empty glyph atlas and produces a non-black mask output', async () => {
		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) throw new Error('no GPU adapter');
		const device = await adapter.requestDevice();

		// Uniforms (48 bytes, twelve f32 — mirrors AsciiPass).
		const uniform = device.createBuffer({
			size: 48,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		device.queue.writeBuffer(uniform, 0, packAsciiUniform(DEFAULT_ASCII_EFFECT));

		// White 16×16 input.
		const SIZE = 16;
		const src = device.createTexture({
			size: [SIZE, SIZE],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
		});
		device.queue.writeTexture(
			{ texture: src },
			new Uint8Array(SIZE * SIZE * 4).fill(255),
			{ bytesPerRow: SIZE * 4, rowsPerImage: SIZE },
			[SIZE, SIZE]
		);

		// Atlas built the same way as AsciiPass.ensureAtlas.
		const charset = DEFAULT_ASCII_EFFECT.charset;
		const chars = Array.from(charset);
		const CELL = 32;
		const atlasWidth = chars.length * CELL;
		const canvas = new OffscreenCanvas(atlasWidth, CELL);
		const ctx = canvas.getContext('2d');
		expect(ctx).not.toBeNull();
		if (ctx) {
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, atlasWidth, CELL);
			ctx.fillStyle = '#fff';
			ctx.font = `${CELL}px monospace`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			for (let i = 0; i < chars.length; i++) {
				ctx.fillText(chars[i]!, (i + 0.5) * CELL, CELL / 2);
			}
		}
		const atlas = device.createTexture({
			size: [atlasWidth, CELL],
			format: 'r8unorm',
			// copyExternalImageToTexture requires RENDER_ATTACHMENT on the
			// destination (production AsciiPass carries the same usage).
			usage:
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.COPY_DST |
				GPUTextureUsage.COPY_SRC |
				GPUTextureUsage.RENDER_ATTACHMENT
		});
		device.queue.copyExternalImageToTexture({ source: canvas }, { texture: atlas }, [
			atlasWidth,
			CELL
		]);

		// Atlas readback: any non-zero byte means the upload carried white glyphs.
		const atlasRead = device.createBuffer({
			size: 512 * CELL,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
		});
		const readEncoder = device.createCommandEncoder();
		readEncoder.copyTextureToBuffer({ texture: atlas }, { buffer: atlasRead, bytesPerRow: 512 }, [
			atlasWidth,
			CELL
		]);
		device.queue.submit([readEncoder.finish()]);
		await atlasRead.mapAsync(GPUMapMode.READ);
		const atlasBytes = new Uint8Array(atlasRead.getMappedRange());
		const atlasHasInk = Array.from(atlasBytes).some((b) => b > 0);
		expect(atlasHasInk, 'atlas readback is all black — upload/canvas problem').toBe(true);

		// The pass itself: storage output + readback.
		const dst = device.createTexture({
			size: [SIZE, SIZE],
			format: 'rgba16float',
			usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC
		});
		const pipeline = device.createComputePipeline({
			layout: 'auto',
			compute: { module: device.createShaderModule({ code: shader }), entryPoint: 'main' }
		});
		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: uniform } },
				{ binding: 1, resource: src.createView() },
				{ binding: 2, resource: dst.createView() },
				{ binding: 3, resource: atlas.createView() }
			]
		});
		const outRead = device.createBuffer({
			size: 256 * SIZE,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
		});
		const encoder = device.createCommandEncoder();
		const pass = encoder.beginComputePass();
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, bindGroup);
		const wg = asciiWorkgroups(SIZE, SIZE);
		pass.dispatchWorkgroups(wg.x, wg.y);
		pass.end();
		encoder.copyTextureToBuffer({ texture: dst }, { buffer: outRead, bytesPerRow: 256 }, [
			SIZE,
			SIZE
		]);
		device.queue.submit([encoder.finish()]);
		await outRead.mapAsync(GPUMapMode.READ);
		const outWords = new Uint16Array(outRead.getMappedRange());
		const outputHasInk = Array.from(outWords).some((w) => w !== 0);
		expect(
			outputHasInk,
			'pass output is all black with a valid atlas — shader/uniform problem'
		).toBe(true);
	});
});
