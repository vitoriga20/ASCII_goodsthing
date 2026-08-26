import { describe, expect, it } from 'vite-plus/test';
import { studioCopy } from './locale';

describe('Chinese workspace copy', () => {
	it('translates the visible editor chrome in Chinese mode', () => {
		const copy = studioCopy('zh-CN');
		expect(copy.project).toBe('项目');
		expect(copy.import).toBe('导入');
		expect(copy.media).toBe('媒体');
		expect(copy.inspector).toBe('检查器');
		expect(copy.dropToStart).toBe('拖入文件或点击导入以开始');
	});
});
