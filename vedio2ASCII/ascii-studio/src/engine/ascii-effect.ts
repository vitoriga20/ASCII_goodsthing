export type AsciiColourMode = 'original' | 'green' | 'gold' | 'mono';

export type AsciiPresetId = 'matrix-green' | 'gold-dust' | 'classic-mono' | 'high-detail';

export type AsciiCharsetId = 'binary' | 'classic' | 'letters' | 'matrix' | 'symbols';

/**
 * Built-in character sets. The string is the fill ramp: the first character
 * renders the darkest areas and the last character the brightest (that is
 * why the classic set starts with a space). Any characters work — letters,
 * digits, symbols, spaces, CJK — they are rendered to a glyph atlas with the
 * system monospace font.
 */
export const ASCII_CHARSETS: ReadonlyArray<{
	readonly id: AsciiCharsetId;
	readonly chars: string;
}> = [
	{ id: 'binary', chars: '01' },
	{ id: 'classic', chars: ' .:-=+*#%@' },
	{ id: 'letters', chars: ' .,:;i1tfLCG08@' },
	{ id: 'matrix', chars: ' .:-=+*#%@ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎ' },
	{ id: 'symbols', chars: ':-=+*#%@' }
];

export const DEFAULT_ASCII_CHARSET = ASCII_CHARSETS[1]!.chars;

/** Code-point cap so the one-row atlas stays well under the 8192 px texture limit (32 px cells). */
export const MAX_CHARSET_LENGTH = 96;

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
	readonly charset: string;
}

export const DEFAULT_ASCII_EFFECT: AsciiEffectParams = {
	enabled: true,
	density: 56,
	glyphScale: 1,
	brightness: 0,
	contrast: 1,
	threshold: 0,
	invert: false,
	edgeStrength: 0,
	colourMode: 'green',
	charset: DEFAULT_ASCII_CHARSET
};

const ASCII_PRESETS: Record<AsciiPresetId, AsciiEffectParams> = {
	'matrix-green': {
		...DEFAULT_ASCII_EFFECT,
		charset: charsetOf('matrix')
	},
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
		colourMode: 'mono',
		charset: charsetOf('letters')
	},
	'high-detail': {
		...DEFAULT_ASCII_EFFECT,
		density: 112,
		glyphScale: 0.72,
		contrast: 1.15,
		colourMode: 'original'
	}
};

function charsetOf(id: AsciiCharsetId): string {
	return ASCII_CHARSETS.find((c) => c.id === id)!.chars;
}

function clampFinite(
	value: number | undefined,
	minimum: number,
	maximum: number,
	fallback: number
): number {
	if (value === undefined || !Number.isFinite(value)) return fallback;
	return Math.min(maximum, Math.max(minimum, value));
}

function normalizeColourMode(value: AsciiColourMode | undefined): AsciiColourMode {
	if (value === 'original' || value === 'green' || value === 'gold' || value === 'mono')
		return value;
	return DEFAULT_ASCII_EFFECT.colourMode;
}

function normalizeCharset(value: string | undefined, fallback: string): string {
	if (value === undefined) return fallback;
	const chars = Array.from(value);
	if (chars.length === 0) return fallback;
	return chars.slice(0, MAX_CHARSET_LENGTH).join('');
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
		colourMode: normalizeColourMode(partial?.colourMode),
		charset: normalizeCharset(partial?.charset, DEFAULT_ASCII_EFFECT.charset)
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
	const charCount = Math.max(1, Array.from(normalized.charset).length);
	return new Float32Array([
		normalized.density,
		normalized.glyphScale,
		normalized.brightness,
		normalized.contrast,
		normalized.threshold,
		normalized.invert ? 1 : 0,
		normalized.edgeStrength,
		colourMode,
		charCount,
		0,
		0,
		0
	]);
}
