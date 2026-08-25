export type AsciiColourMode = 'original' | 'green' | 'gold' | 'mono';

export type AsciiPresetId = 'matrix-green' | 'gold-dust' | 'classic-mono' | 'high-detail';

export interface AsciiEffectParams {
	readonly enabled: boolean;
	readonly density: number;
	readonly glyphScale: number;
	readonly brightness: number;
	readonly contrast: number;
	readonly threshold: number;
	readonly invert: boolean;
	readonly edgeStrength: number;
	readonly colourMode: AsciiColourMode;
}

export const DEFAULT_ASCII_EFFECT: AsciiEffectParams = {
	enabled: false,
	density: 56,
	glyphScale: 1,
	brightness: 0,
	contrast: 1,
	threshold: 0,
	invert: false,
	edgeStrength: 0,
	colourMode: 'green'
};

const ASCII_PRESETS: Record<AsciiPresetId, AsciiEffectParams> = {
	'matrix-green': DEFAULT_ASCII_EFFECT,
	'gold-dust': {
		...DEFAULT_ASCII_EFFECT,
		density: 64,
		contrast: 1.2,
		edgeStrength: 0.22,
		colourMode: 'gold'
	},
	'classic-mono': {
		...DEFAULT_ASCII_EFFECT,
		density: 46,
		colourMode: 'mono'
	},
	'high-detail': {
		...DEFAULT_ASCII_EFFECT,
		density: 112,
		glyphScale: 0.72,
		contrast: 1.15,
		colourMode: 'original'
	}
};

function clampFinite(value: number | undefined, minimum: number, maximum: number, fallback: number): number {
	if (value === undefined || !Number.isFinite(value)) return fallback;
	return Math.min(maximum, Math.max(minimum, value));
}

function normalizeColourMode(value: AsciiColourMode | undefined): AsciiColourMode {
	if (value === 'original' || value === 'green' || value === 'gold' || value === 'mono') return value;
	return DEFAULT_ASCII_EFFECT.colourMode;
}

export function normalizeAsciiEffect(
	partial: Partial<AsciiEffectParams> | undefined
): AsciiEffectParams {
	return {
		enabled: partial?.enabled ?? DEFAULT_ASCII_EFFECT.enabled,
		density: clampFinite(partial?.density, 12, 180, DEFAULT_ASCII_EFFECT.density),
		glyphScale: clampFinite(partial?.glyphScale, 0.5, 3, DEFAULT_ASCII_EFFECT.glyphScale),
		brightness: clampFinite(partial?.brightness, -1, 1, DEFAULT_ASCII_EFFECT.brightness),
		contrast: clampFinite(partial?.contrast, 0, 3, DEFAULT_ASCII_EFFECT.contrast),
		threshold: clampFinite(partial?.threshold, 0, 1, DEFAULT_ASCII_EFFECT.threshold),
		invert: partial?.invert ?? DEFAULT_ASCII_EFFECT.invert,
		edgeStrength: clampFinite(partial?.edgeStrength, 0, 1, DEFAULT_ASCII_EFFECT.edgeStrength),
		colourMode: normalizeColourMode(partial?.colourMode)
	};
}

export function applyAsciiPreset(id: AsciiPresetId): AsciiEffectParams {
	return { ...ASCII_PRESETS[id] };
}

export function isAsciiActive(params: AsciiEffectParams): boolean {
	return params.enabled;
}

export function packAsciiUniform(params: AsciiEffectParams): Float32Array {
	const normalized = normalizeAsciiEffect(params);
	const colourMode =
		normalized.colourMode === 'original'
			? 0
			: normalized.colourMode === 'green'
				? 1
				: normalized.colourMode === 'gold'
					? 2
					: 3;
	return new Float32Array([
		normalized.density,
		normalized.glyphScale,
		normalized.brightness,
		normalized.contrast,
		normalized.threshold,
		normalized.invert ? 1 : 0,
		normalized.edgeStrength,
		colourMode
	]);
}
