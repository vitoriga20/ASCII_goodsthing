import { describe, expect, it } from 'vite-plus/test';
import { RollingFrameRate } from './live-preview';

describe('RollingFrameRate', () => {
	it('reports the number of frames observed in the trailing second', () => {
		const rate = new RollingFrameRate();
		rate.record(0);
		rate.record(100);
		rate.record(200);
		expect(rate.value(200)).toBe(3);
		expect(rate.value(1_201)).toBe(0);
	});
});
