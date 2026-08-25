import { describe, expect, it } from 'vitest';
import { normalizeStudioLocale, studioCopy } from './locale';

describe('studio locale', () => {
	it('uses Simplified Chinese copy when the user chooses zh-CN', () => {
		expect(normalizeStudioLocale('zh-CN')).toBe('zh-CN');
		expect(studioCopy('zh-CN').settings).toBe('设置');
		expect(studioCopy('zh-CN').originalMonitor).toBe('原片');
		expect(studioCopy('zh-CN').liveRendering).toBe('实时渲染');
		expect(studioCopy('en').liveRendering).toBe('Live rendering');
	});

	it('falls back to English for an unsupported stored locale', () => {
		expect(normalizeStudioLocale('fr-FR')).toBe('en');
		expect(studioCopy('en').settings).toBe('Settings');
	});
});
