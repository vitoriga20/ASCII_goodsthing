/**
 * Toolbar copy dictionary: menu-bar + command-palette taxonomy
 * (`toolbar-menus.ts`), toolbar chrome (`Toolbar.tsx`), side-rail tab labels
 * (`side-rail-tabs.ts`) and the locale picker (`LocaleSettings.tsx`).
 *
 * Reusable base keys (Project/Edit/View/…, Import, Play/Pause, Snap/Beat,
 * Keys, Go Live, Client, …) live in `./base` and are reused rather than
 * redefined here.
 */
export const toolbarEn = {
	// ── Menu-bar + command-palette taxonomy (toolbar-menus.ts) ──
	importMediaMenu: 'Import media…',
	importMedia: 'Import media',
	importMediaDetail: 'Add clips, images, or audio',
	convertMediaMenu: 'Convert media…',
	convertMedia: 'Convert media',
	convertMediaDetail: 'Change a file’s format without editing',
	convertMediaCommandDetail: 'Change a file’s format (no editing)',
	// Label `renderQueue` lives in `./export` (the Render queue panel owns it) —
	// reused here rather than redefined; only the command-palette detail is ours.
	renderQueueDetail: 'Open the export render queue',
	undo: 'Undo',
	redo: 'Redo',
	undoKbd: 'Undo ({n})',
	redoKbd: 'Redo ({n})',
	showScopes: 'Show scopes',
	hideScopes: 'Hide scopes',
	// `splitAtPlayhead` lives in `./captions` — reused here, not redefined.
	deleteSelected: 'Delete selected',
	enableSnap: 'Enable snap',
	disableSnap: 'Disable snap',
	enableBeatSnap: 'Enable beat snap',
	disableBeatSnap: 'Disable beat snap',
	userGuide: 'User guide',
	userGuideDetail: 'Open in-app documentation',
	// `browserCapabilities` lives in `./misc` — reused here, not redefined;
	// only the command-palette detail is ours.
	browserCapabilitiesDetail: 'Inspect browser pipeline support',
	playTransport: 'Play transport',
	pauseTransport: 'Pause transport',
	playTransportKbd: 'Play transport ({n})',
	pauseTransportKbd: 'Pause transport ({n})',
	previewPlayback: 'Preview playback',
	audioCleanup: 'Audio Cleanup',
	audioCleanupDetail: 'Reduce noise on the selected clip',
	selectAudioClipFirst: 'Select an audio clip first',
	autoCaptions: 'Auto captions',
	autoCaptionsDetail: 'On-device speech recognition',
	languageTools: 'Language Tools',
	languageToolsDetail: 'Translate captions · draft titles, hashtags & copy on-device',
	// `smartReframe` lives in `./misc` — reused here, not redefined; only the
	// command-palette detail is ours.
	smartReframeDetail: 'Generate crop-path keyframes',
	removeSilences: 'Remove silences',
	removeSilencesDetail: 'Find and trim silent gaps',
	record: 'Record',
	recordDetail: 'Open recording controls',
	captionsCommand: 'Captions',
	captionsDetail: 'Open caption track editor',
	viewScopes: 'View scopes',
	viewScopesDetail: 'Toggle waveform and vectorscope overlays',
	scopesRequireWebGpu: 'Scopes require WebGPU support',
	goLiveCommand: 'Go live',
	goLiveDetail: 'Open WHIP publish controls',

	// ── Side-rail tab labels (side-rail-tabs.ts) ──
	captionsTab: 'Captions',
	languageToolsTab: 'Language Tools',
	liveChain: 'Live Chain',
	voiceFx: 'Voice FX',
	program: 'Program',
	textTools: 'Text tools',
	captureTools: 'Capture tools',
	audioTools: 'Audio tools',

	// ── Toolbar chrome (Toolbar.tsx) ──
	clientNLE: 'Client NLE',
	openMenu: 'Open {n} menu',
	searchActionsLabel: 'Search actions',
	commandPalette: 'Command palette',
	nothingLoaded: 'Nothing loaded',
	fpsUnknown: 'FPS ?',
	editHistory: 'Edit history',
	transport: 'Transport',
	stepBackFrame: 'Step back one frame',
	stepBackFrameKbd: 'Step back one frame ({n})',
	stepForwardFrame: 'Step forward one frame',
	loopPlayback: 'Loop playback',
	loopOn: 'Loop: on (replays at the end)',
	loopOff: 'Loop: off (stops at the end)',
	playbackTimecode: 'Playback timecode',
	timelineSnapModes: 'Timeline snapping modes',
	toggleTimelineSnap: 'Toggle timeline snapping',
	toggleBeatSnap: 'Toggle beat-grid snapping',
	enableSnapFirst: 'Enable snapping before beat-grid snapping',
	masterMix: 'Master mix',
	pipelineStatus: 'Pipeline status',
	noIsolation: 'No isolation',
	goLiveTitle: 'Go live — stream to a WHIP endpoint',
	publishLive: 'Live',
	showKeysTitle: 'Show keyboard shortcuts on the preview',

	// ── Locale settings (LocaleSettings.tsx) ──
	localeEnglish: 'English'
} as const;

export const toolbarZh: Record<keyof typeof toolbarEn, string> = {
	// ── 菜单栏 + 命令面板（toolbar-menus.ts）──
	importMediaMenu: '导入素材…',
	importMedia: '导入素材',
	importMediaDetail: '添加片段、图片或音频',
	convertMediaMenu: '转换媒体…',
	convertMedia: '转换媒体',
	convertMediaDetail: '不改动剪辑，仅转换文件格式',
	convertMediaCommandDetail: '转换文件格式（不进行编辑）',
	// 标签 `renderQueue` 归 `./export`（渲染队列面板）所有，此处复用不重复定义
	renderQueueDetail: '打开导出渲染队列',
	undo: '撤销',
	redo: '重做',
	undoKbd: '撤销（{n}）',
	redoKbd: '重做（{n}）',
	showScopes: '显示示波器',
	hideScopes: '隐藏示波器',
	// `splitAtPlayhead` 归 `./captions` 所有，此处复用不重复定义
	deleteSelected: '删除所选',
	enableSnap: '启用吸附',
	disableSnap: '关闭吸附',
	enableBeatSnap: '启用节拍吸附',
	disableBeatSnap: '关闭节拍吸附',
	userGuide: '用户指南',
	userGuideDetail: '打开应用内文档',
	// `browserCapabilities` 归 `./misc` 所有，此处复用不重复定义
	browserCapabilitiesDetail: '查看浏览器管线支持情况',
	playTransport: '开始播放',
	pauseTransport: '暂停播放',
	playTransportKbd: '播放（{n}）',
	pauseTransportKbd: '暂停（{n}）',
	previewPlayback: '预览播放',
	audioCleanup: '音频清理',
	audioCleanupDetail: '降低所选片段的噪音',
	selectAudioClipFirst: '请先选择音频片段',
	autoCaptions: '自动字幕',
	autoCaptionsDetail: '设备端语音识别',
	languageTools: '语言工具',
	languageToolsDetail: '在设备端翻译字幕，并生成标题、话题标签与文案',
	// `smartReframe` 归 `./misc` 所有，此处复用不重复定义
	smartReframeDetail: '生成裁剪路径关键帧',
	removeSilences: '去除静音段',
	removeSilencesDetail: '查找并裁剪静音间隙',
	record: '录制',
	recordDetail: '打开录制控制',
	captionsCommand: '字幕',
	captionsDetail: '打开字幕轨道编辑器',
	viewScopes: '查看示波器',
	viewScopesDetail: '切换波形与矢量示波器叠加显示',
	scopesRequireWebGpu: '示波器需要 WebGPU 支持',
	goLiveCommand: '开始直播',
	goLiveDetail: '打开 WHIP 推流控制',

	// ── 侧栏标签（side-rail-tabs.ts）──
	captionsTab: '字幕',
	languageToolsTab: '语言工具',
	liveChain: '实时音频链',
	voiceFx: '人声特效',
	program: '节目',
	textTools: '文字工具',
	captureTools: '采集工具',
	audioTools: '音频工具',

	// ── 工具栏外壳（Toolbar.tsx）──
	clientNLE: '本地客户端剪辑',
	openMenu: '打开{n}菜单',
	searchActionsLabel: '搜索操作',
	commandPalette: '命令面板',
	nothingLoaded: '未加载',
	fpsUnknown: '未知帧率',
	editHistory: '编辑历史',
	transport: '播放控制',
	stepBackFrame: '后退一帧',
	stepBackFrameKbd: '后退一帧（{n}）',
	stepForwardFrame: '前进一帧',
	loopPlayback: '循环播放',
	loopOn: '循环：开（播放到结尾时重新开始）',
	loopOff: '循环：关（播放到结尾时停止）',
	playbackTimecode: '播放时码',
	timelineSnapModes: '时间线吸附模式',
	toggleTimelineSnap: '切换时间线吸附',
	toggleBeatSnap: '切换节拍网格吸附',
	enableSnapFirst: '启用节拍网格吸附前请先开启吸附',
	masterMix: '主混音',
	pipelineStatus: '处理管线状态',
	noIsolation: '未隔离',
	goLiveTitle: '开始直播 —— 推流到 WHIP 端点',
	publishLive: '直播中',
	showKeysTitle: '在预览上显示键盘快捷键',

	// ── 语言设置（LocaleSettings.tsx）──
	localeEnglish: '英文'
};