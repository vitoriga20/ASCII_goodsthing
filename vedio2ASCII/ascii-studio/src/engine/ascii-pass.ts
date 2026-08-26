import type { AsciiEffectParams } from './ascii-effect';
import { MAX_CHARSET_LENGTH, packAsciiUniform } from './ascii-effect';
import { createComputePipeline } from './gpu-pipeline';
import asciiShaderSource from './shaders/ascii.wgsl?raw';

export const ASCII_UNIFORM_BYTES = 12 * Float32Array.BYTES_PER_ELEMENT;

/** Side of one glyph cell in the character-set atlas built in the worker. */
export const ASCII_ATLAS_CELL = 32;
const ASCII_ATLAS_FONT = `${ASCII_ATLAS_CELL}px monospace`;

export function asciiWorkgroups(
	width: number,
	height: number
): { readonly x: number; readonly y: number } {
	return { x: Math.max(1, Math.ceil(width / 8)), y: Math.max(1, Math.ceil(height / 8)) };
}

export class AsciiPass {
	private readonly pipeline: GPUComputePipeline;
	private readonly layout: GPUBindGroupLayout;
	private readonly buffers: GPUBuffer[] = [];
	private atlasTexture: GPUTexture | null = null;
	private atlasCharset: string | null = null;

	constructor(private readonly device: GPUDevice) {
		// Diagnostics for the atlas rework (black-screen report): pipeline
		// creation can fail asynchronously in Dawn (invalid object without a sync
		// throw), so also capture the creation via an error scope to surface the
		// real first message instead of the secondary getBindGroupLayout error.
		let pipeline: GPUComputePipeline | null = null;
		try {
			this.device.pushErrorScope('validation');
			pipeline = createComputePipeline(device, asciiShaderSource, 'ascii');
			void this.device.popErrorScope().then((error) => {
				if (error) console.error('[ascii] pipeline creation rejected:', error.message);
			});
		} catch (error) {
			console.error('[ascii] pipeline create failed', error);
			throw error;
		}
		this.pipeline = pipeline;
		this.layout = this.pipeline.getBindGroupLayout(0);
	}

	encode(
		encoder: GPUCommandEncoder,
		source: GPUTextureView,
		destination: GPUTextureView,
		width: number,
		height: number,
		params: AsciiEffectParams,
		slot: number
	): GPUTextureView {
		let buffer = this.buffers[slot];
		if (!buffer) {
			buffer = this.device.createBuffer({
				size: ASCII_UNIFORM_BYTES,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
			});
			this.buffers[slot] = buffer;
		}
		this.device.queue.writeBuffer(buffer, 0, packAsciiUniform(params));
		this.ensureAtlas(params.charset);
		const bindGroup = this.device.createBindGroup({
			layout: this.layout,
			entries: [
				{ binding: 0, resource: { buffer } },
				{ binding: 1, resource: source },
				{ binding: 2, resource: destination },
				{ binding: 3, resource: this.atlasTexture!.createView() }
			]
		});
		const workgroups = asciiWorkgroups(width, height);
		const pass = encoder.beginComputePass();
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, bindGroup);
		pass.dispatchWorkgroups(workgroups.x, workgroups.y);
		pass.end();
		return destination;
	}

	/** Renders the character set to a one-row glyph atlas when it changes. */
	private ensureAtlas(charset: string): void {
		if (this.atlasTexture && this.atlasCharset === charset) return;
		const chars = Array.from(charset).slice(0, MAX_CHARSET_LENGTH);
		const count = Math.max(1, chars.length);
		const width = count * ASCII_ATLAS_CELL;
		try {
			const canvas = new OffscreenCanvas(width, ASCII_ATLAS_CELL);
			const context = canvas.getContext('2d');
			if (context) {
				context.fillStyle = '#000';
				context.fillRect(0, 0, width, ASCII_ATLAS_CELL);
				context.fillStyle = '#fff';
				context.font = ASCII_ATLAS_FONT;
				context.textAlign = 'center';
				context.textBaseline = 'middle';
				for (let i = 0; i < chars.length; i++) {
					context.fillText(chars[i]!, (i + 0.5) * ASCII_ATLAS_CELL, ASCII_ATLAS_CELL / 2);
				}
			}
			if (this.atlasTexture) this.atlasTexture.destroy();
			this.atlasTexture = this.device.createTexture({
				size: [width, ASCII_ATLAS_CELL],
				format: 'r8unorm',
				// copyExternalImageToTexture requires both COPY_DST and
				// RENDER_ATTACHMENT on the destination; without RENDER_ATTACHMENT
				// the upload is rejected and the atlas stays all black (which
				// rendered as a fully black ASCII monitor).
				usage:
					GPUTextureUsage.TEXTURE_BINDING |
					GPUTextureUsage.COPY_DST |
					GPUTextureUsage.RENDER_ATTACHMENT
			});
			// Diagnostics: an all-black atlas is the prime suspect for the
			// black-screen report — report build facts and any upload rejection.
			this.device.pushErrorScope('validation');
			this.device.queue.copyExternalImageToTexture(
				{ source: canvas },
				{ texture: this.atlasTexture },
				[width, ASCII_ATLAS_CELL]
			);
			this.atlasCharset = charset;
			console.info(
				`[ascii] atlas: ${count} chars "${charset}" → ${width}x${ASCII_ATLAS_CELL}, 2d=${context !== null}`
			);
			void this.device.queue
				.onSubmittedWorkDone()
				.then(() => this.device.popErrorScope())
				.then((error) => {
					if (error) console.error('[ascii] atlas upload rejected by the device:', error.message);
				});
		} catch (error) {
			console.error('[ascii] atlas build failed', error);
			throw error;
		}
	}

	destroy(): void {
		for (const buffer of this.buffers) buffer.destroy();
		this.buffers.length = 0;
		this.atlasTexture?.destroy();
		this.atlasTexture = null;
		this.atlasCharset = null;
	}
}
