import { createSignal } from 'solid-js';

export type StudioLocale = 'en' | 'zh-CN';

const STORAGE_KEY = 'ascii-studio.locale';

const COPY = {
	en: {
		settings: 'Settings',
		language: 'Language',
		project: 'Project',
		edit: 'Edit',
		view: 'View',
		clip: 'Clip',
		timeline: 'Timeline',
		help: 'Help',
		searchActions: 'Search actions, panels, clips…',
		import: 'Import',
		play: 'Play',
		pause: 'Pause',
		master: 'Master',
		interchange: 'Interchange',
		export: 'Export',
		accelerated: 'Accelerated',
		client: 'Client',
		media: 'Media',
		beats: 'Beats',
		inspector: 'Inspector',
		text: 'Text',
		audio: 'Audio',
		capture: 'Capture',
		dropToStart: 'Drop or import a file to get started',
		dropHere: 'Drag a file here, or click Import',
		newHere: 'New here? Read the getting started guide',
		originalMonitor: 'ORIGINAL',
		live: 'LIVE',
		asciiProgram: 'ASCII PROGRAM',
		gpu: 'GPU',
		emptySource: 'Import a video to view the original',
		asciiTreatment: 'ASCII TREATMENT',
		glyphTransform: 'Glyph Transform',
		enabled: 'Enabled',
		realtimePreview: 'Realtime preview',
		density: 'Density',
		glyphScale: 'Glyph scale',
		contrast: 'Contrast',
		edgeDetail: 'Edge detail',
		colourTreatment: 'Colour treatment',
		matrixGreen: 'Matrix Green',
		goldDust: 'Gold Dust',
		classicMono: 'Classic Mono',
		highDetail: 'High Detail',
		emeraldSignal: 'Emerald signal',
		keepSourceColour: 'Keep source colour',
		selectClip: 'Select a clip to edit its properties',
		selectClipHint:
			'Click a clip on the timeline to adjust timing, effects, transform, and colour.',
		addVideoTrack: 'Add video track',
		addAudioTrack: 'Add audio track',
		addTitle: 'Add title clip',
		snap: 'Snap',
		beat: 'Beat',
		closeGaps: 'Gaps',
		safeAreas: 'Safe areas',
		autosaveFrom: 'Autosave from',
		restore: 'Restore',
		newProject: 'New',
		relink: 'Re-link',
		offlineMedia: 'Offline media',
		savedSources: 'source(s) in the saved project.',
		goLive: 'Go Live',
		keys: 'Keys'
	},
	'zh-CN': {
		settings: '设置',
		language: '界面语言',
		project: '项目',
		edit: '编辑',
		view: '视图',
		clip: '片段',
		timeline: '时间线',
		help: '帮助',
		searchActions: '搜索操作、面板和片段…',
		import: '导入',
		play: '播放',
		pause: '暂停',
		master: '主音量',
		interchange: '交换格式',
		export: '导出',
		accelerated: 'GPU 加速',
		client: '客户端',
		media: '媒体',
		beats: '节拍',
		inspector: '检查器',
		text: '文字',
		audio: '音频',
		capture: '采集',
		dropToStart: '拖入文件或点击导入以开始',
		dropHere: '将文件拖到此处，或点击导入',
		newHere: '第一次使用？查看入门指南',
		originalMonitor: '原片',
		live: '实时',
		asciiProgram: 'ASCII 效果',
		gpu: 'GPU',
		emptySource: '导入视频后在此查看原片',
		asciiTreatment: 'ASCII 参数',
		glyphTransform: '字符转换',
		enabled: '启用',
		realtimePreview: '实时渲染',
		density: '密度',
		glyphScale: '字形大小',
		contrast: '对比度',
		edgeDetail: '边缘细节',
		colourTreatment: '配色方案',
		matrixGreen: '矩阵绿',
		goldDust: '金色尘埃',
		classicMono: '经典黑白',
		highDetail: '高细节',
		emeraldSignal: '翡翠绿',
		keepSourceColour: '保留原色',
		selectClip: '选择片段以编辑属性',
		selectClipHint: '点击时间线中的片段，即可调整时间、效果、变换和颜色。',
		addVideoTrack: '添加视频轨道',
		addAudioTrack: '添加音频轨道',
		addTitle: '添加标题片段',
		snap: '吸附',
		beat: '节拍',
		closeGaps: '关闭间隙',
		safeAreas: '安全区域',
		autosaveFrom: '自动保存于',
		restore: '恢复',
		newProject: '新建',
		relink: '重新链接',
		offlineMedia: '离线媒体',
		savedSources: '个素材已保存在项目中。',
		goLive: '开始直播',
		keys: '按键'
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
