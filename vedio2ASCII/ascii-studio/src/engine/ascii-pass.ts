import type { AsciiEffectParams } from './ascii-effect';
import { packAsciiUniform } from './ascii-effect';
import { createComputePipeline } from './gpu-pipeline';
import asciiShaderSource from './shaders/ascii.wgsl?raw';

export const ASCII_UNIFORM_BYTES = 8 * Float32Array.BYTES_PER_ELEMENT;

export function asciiWorkgroups(width: number, height: number): { readonly x: number; readonly y: number } {
	return { x: Math.max(1, Math.ceil(width / 8)), y: Math.max(1, Math.ceil(height / 8)) };
}

export class AsciiPass {
	private readonly pipeline: GPUComputePipeline;
	private readonly layout: GPUBindGroupLayout;
	private readonly buffers: GPUBuffer[] = [];

	constructor(private readonly device: GPUDevice) {
		this.pipeline = createComputePipeline(device, asciiShaderSource, 'ascii');
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
		const bindGroup = this.device.createBindGroup({
			layout: this.layout,
			entries: [
				{ binding: 0, resource: { buffer } },
				{ binding: 1, resource: source },
				{ binding: 2, resource: destination }
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

	destroy(): void {
		for (const buffer of this.buffers) buffer.destroy();
		this.buffers.length = 0;
	}
}
