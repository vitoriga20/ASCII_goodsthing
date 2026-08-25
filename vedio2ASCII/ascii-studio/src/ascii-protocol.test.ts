import { describe, expect, it } from 'vite-plus/test';
import type { WorkerCommand } from './protocol';

describe('ASCII worker protocol', () => {
	it('keeps partial ASCII control updates structured-clone safe', () => {
		const command: WorkerCommand = {
			type: 'set-ascii-effect',
			params: { density: 72, colourMode: 'gold', invert: true }
		};

		expect(structuredClone(command)).toEqual(command);
	});
});
