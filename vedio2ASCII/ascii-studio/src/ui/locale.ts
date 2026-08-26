import { createSignal } from 'solid-js';
import { baseEn, baseZh } from './locales/base';
import { capabilitiesEn, capabilitiesZh } from './locales/capabilities';
import { toolbarEn, toolbarZh } from './locales/toolbar';
import { appEn, appZh } from './locales/app';
import { inspectorEn, inspectorZh } from './locales/inspector';
import { exportEn, exportZh } from './locales/export';
import { captureEn, captureZh } from './locales/capture';
import { audioEn, audioZh } from './locales/audio';
import { captionsEn, captionsZh } from './locales/captions';
import { miscEn, miscZh } from './locales/misc';

export type StudioLocale = 'en' | 'zh-CN';

const STORAGE_KEY = 'ascii-studio.locale';

const COPY = {
	en: {
		...baseEn,
		...capabilitiesEn,
		...toolbarEn,
		...appEn,
		...inspectorEn,
		...exportEn,
		...captureEn,
		...audioEn,
		...captionsEn,
		...miscEn
	},
	'zh-CN': {
		...baseZh,
		...capabilitiesZh,
		...toolbarZh,
		...appZh,
		...inspectorZh,
		...exportZh,
		...captureZh,
		...audioZh,
		...captionsZh,
		...miscZh
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

const [currentStudioLocale, setCurrentStudioLocale] =
	createSignal<StudioLocale>(readStudioLocale());
export const studioLocale = currentStudioLocale;

export function setStudioLocale(locale: StudioLocale): void {
	setCurrentStudioLocale(locale);
	writeStudioLocale(locale);
}

export function writeStudioLocale(locale: StudioLocale): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, locale);
	} catch {
		/* active selection still works */
	}
}

export function studioCopy(locale: StudioLocale) {
	return COPY[locale];
}