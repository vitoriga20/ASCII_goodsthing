import { describe, expect, it } from 'vite-plus/test';
import {
	applyAsciiPreset,
	DEFAULT_ASCII_EFFECT,
	isAsciiActive,
	normalizeAsciiEffect,
	packAsciiUniform
} from './ascii-effect';

describe('ASCII effect parameters', () => {
	it('clamps invalid numeric controls without leaking NaN', () => {
		expect(
			normalizeAsciiEffect({
				density: 999,
				glyphScale: -2,
				brightness: 7,
				contrast: Number.NaN,
				threshold: -1,
				edgeStrength: 4
			})
		).toMatchObject({
			density: 180,
			glyphScale: 0.5,
			brightness: 1,
			contrast: 1,
			threshold: 0,
			edgeStrength: 1
		});
	});

	it('applies the named Gold Dust preset without enabling preview', () => {
		expect(applyAsciiPreset('gold-dust')).toMatchObject({
			enabled: false,
			colourMode: 'gold'
		});
	});

	it('treats disabled ASCII as an explicit bypass', () => {
		expect(isAsciiActive({ ...DEFAULT_ASCII_EFFECT, enabled: false })).toBe(false);
		expect(isAsciiActive(DEFAULT_ASCII_EFFECT)).toBe(false);
		expect(isAsciiActive({ ...DEFAULT_ASCII_EFFECT, enabled: true })).toBe(true);
	});

	it('packs the fixed eight-slot shader uniform layout', () => {
		expect(Array.from(packAsciiUniform(DEFAULT_ASCII_EFFECT))).toEqual([56, 1, 0, 1, 0, 0, 0, 1]);
	});

	it('starts with ASCII preview disabled until the user explicitly enables it', () => {
		expect(DEFAULT_ASCII_EFFECT.enabled).toBe(false);
	});
});
