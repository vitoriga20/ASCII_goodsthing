import { describe, expect, it } from 'vite-plus/test';
import {
	applyAsciiPreset,
	ASCII_CHARSETS,
	DEFAULT_ASCII_EFFECT,
	isAsciiActive,
	MAX_CHARSET_LENGTH,
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

	it('applies the named Gold Dust preset', () => {
		expect(applyAsciiPreset('gold-dust')).toMatchObject({
			enabled: true,
			colourMode: 'gold'
		});
	});

	it('binds the look presets to coherent character sets', () => {
		expect(applyAsciiPreset('matrix-green').charset).toBe(
			ASCII_CHARSETS.find((c) => c.id === 'matrix')!.chars
		);
		expect(applyAsciiPreset('classic-mono').charset).toBe(
			ASCII_CHARSETS.find((c) => c.id === 'letters')!.chars
		);
		expect(applyAsciiPreset('high-detail').charset).toBe(DEFAULT_ASCII_EFFECT.charset);
	});

	it('normalizes a custom charset: empty falls back, overlong is capped', () => {
		expect(normalizeAsciiEffect({ charset: '' }).charset).toBe(DEFAULT_ASCII_EFFECT.charset);
		const long = 'a'.repeat(MAX_CHARSET_LENGTH + 40);
		expect(Array.from(normalizeAsciiEffect({ charset: long }).charset)).toHaveLength(
			MAX_CHARSET_LENGTH
		);
		// Emoji surrogate pairs count as a single level.
		expect(normalizeAsciiEffect({ charset: '01😀' }).charset).toBe('01😀');
	});

	it('treats disabled ASCII as an explicit bypass', () => {
		expect(isAsciiActive({ ...DEFAULT_ASCII_EFFECT, enabled: false })).toBe(false);
		expect(isAsciiActive(DEFAULT_ASCII_EFFECT)).toBe(true);
	});

	it('packs the fixed twelve-slot shader uniform layout with the level count', () => {
		expect(Array.from(packAsciiUniform(DEFAULT_ASCII_EFFECT))).toEqual([
			56,
			1,
			0,
			1,
			0,
			0,
			0,
			1,
			Array.from(DEFAULT_ASCII_EFFECT.charset).length,
			0,
			0,
			0
		]);
		expect(packAsciiUniform({ ...DEFAULT_ASCII_EFFECT, charset: '01' })[8]).toBe(2);
	});
});
