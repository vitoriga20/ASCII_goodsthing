export type StudioLocale = 'en' | 'zh-CN';

const STORAGE_KEY = 'ascii-studio.locale';

const COPY = {
	en: {
		settings: 'Settings',
		language: 'Language',
		originalMonitor: 'ORIGINAL',
		live: 'LIVE',
		asciiProgram: 'ASCII PROGRAM',
		gpu: 'GPU',
		emptySource: 'Import a video to view the original',
		asciiTreatment: 'ASCII TREATMENT',
		glyphTransform: 'Glyph Transform',
		enabled: 'Enabled',
		density: 'Density',
		glyphScale: 'Glyph scale',
		contrast: 'Contrast',
		edgeDetail: 'Edge detail',
		colourTreatment: 'Colour treatment'
	},
	'zh-CN': {
		settings: '设置',
		language: '界面语言',
		originalMonitor: '原片',
		live: '实时',
		asciiProgram: 'ASCII 效果',
		gpu: 'GPU',
		emptySource: '导入视频后在此查看原片',
		asciiTreatment: 'ASCII 参数',
		glyphTransform: '字符转换',
		enabled: '启用',
		density: '密度',
		glyphScale: '字形大小',
		contrast: '对比度',
		edgeDetail: '边缘细节',
		colourTreatment: '配色方案'
	}
} as const;

export function normalizeStudioLocale(value: string | null | undefined): StudioLocale {
	return value === 'zh-CN' ? 'zh-CN' : 'en';
}

export function readStudioLocale(): StudioLocale {
	if (typeof window === 'undefined') return 'en';
	try {
		return normalizeStudioLocale(window.localStorage.getItem(STORAGE_KEY));
	} catch {
		return 'en';
	}
}

export function writeStudioLocale(locale: StudioLocale): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, locale);
	} catch {
		// Privacy modes can deny storage. The active in-memory selection still works.
	}
}

export function studioCopy(locale: StudioLocale) {
	return COPY[locale];
}
