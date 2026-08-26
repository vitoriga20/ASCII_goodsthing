/**
 * Audio processing copy dictionary: Audio Cleanup, Live Audio Chain,
 * Voice Cleanup, insert-row/bypass chrome, meter strip, limited preview and
 * the error-boundary fallback. Technical terms (DTLN/ONNX/WASM/RNNoise/LUFS,
 * dB/ms/s/Hz units, citation strings) stay untranslated; `{n}`/`{x}` are
 * parameter placeholders replaced at render time.
 */
export const audioEn = {
	// AudioCleanupPanel
	cleanupPanelTitle: 'Local Audio Cleanup (Experimental)',
	closeCleanupPanel: 'Close audio cleanup panel',
	cleanupStatus: 'Status',
	cleanupEngine: 'Engine',
	cleanupModel: 'Model',
	cleanupModelSize: 'Model size',
	cleanupLastAnalysis: 'Last analysis',
	selectAudioClip: 'Select an audio clip on the timeline.',
	extractingAudio: 'Extracting audio…',
	creatingCleanedAsset: 'Creating cleaned audio asset…',
	cleaningPercent: 'Cleaning… {n}%',
	cleanupProgress: 'Cleanup progress',
	cleanupActions: 'Actions',
	fetchVerifyModel: 'Fetch and verify the local model',
	loadModel: 'Load model',
	previewCleanupTitle: 'Clean the first {n} s for A/B comparison (loads the model first if needed)',
	previewCleanup: 'Preview cleanup',
	cancelRunningOp: 'Cancel the running operation',
	applyCleanupTitle:
		'Create a cleaned audio asset and route this clip through it (loads the model first if needed)',
	applyToExport: 'Apply to export / create cleaned audio asset',
	removeCleanupTitle: 'Return this clip to its original audio (undoable)',
	removeCleanup: 'Remove cleanup',
	abPreview: 'A/B preview ({n}s)',
	playOriginal: 'Play original',
	playCleaned: 'Play cleaned',
	cleanupApplied: 'cleanup applied',
	cleanupFooter:
		'Model: DTLN (MIT, Interspeech 2020) via ONNX Runtime Web. Weights load from this app\'s own origin only after you click "Load model".',

	// AudioInsertRow
	enableX: 'Enable {x}',
	bypassX: 'Bypass {x}',
	bypassed: 'Bypassed',
	active: 'Active',

	// LiveAudioChainPanel
	liveAudioChain: 'Live Audio Chain',
	latencyMs: 'Latency: {x} ms',
	chainRequiresIsolation: 'Live Audio Chain requires cross-origin isolation.',
	configureBeforeRecording: 'Configure before recording',
	chainEmptyNote:
		'Gate, compressor, and limiter can be printed to recorded audio. Start a recording to enable that option; live monitoring stays unprocessed.',
	gate: 'Gate',
	compressor: 'Compressor',
	limiter: 'Limiter',
	threshold: 'Threshold',
	range: 'Range',
	attack: 'Attack',
	hold: 'Hold',
	release: 'Release',
	ratio: 'Ratio',
	knee: 'Knee',
	makeupGain: 'Makeup Gain',
	ceiling: 'Ceiling',
	printToRecording: 'Print chain to recording',
	printToRecordingHint:
		'Applies the chain to recorded audio in the pipeline worker. Monitor output is unprocessed in this version.',

	// VoiceCleanupPanel
	analysisAlreadyRunning: 'Analysis is already running.',
	timelineEmpty: 'Timeline is empty.',
	voiceCleanup: 'Voice Cleanup',
	addAudioToClean: 'Add audio to clean it up',
	voiceEmptyNote:
		'Import a clip and place it on an audio track. Denoise and loudness tools activate once timeline audio is present.',
	denoiser: 'Denoiser',
	loudnessNormalisation: 'Loudness Normalisation',
	addAudioTracksHint: 'Add audio clips to the timeline to enable per-track denoising.',
	noAudioTracksYet: 'No audio tracks yet.',
	enablePerTrackDenoise:
		'Enable per-track denoising. The denoiser runs on the monitor bus and export chain.',
	denoiserUnavailable: 'Denoiser unavailable: {x}',
	loadingRNNoise: 'Loading RNNoise WASM…',
	rnnoiseReady: 'RNNoise WASM ready.',
	latencyStage: 'Stage',
	latencySamples: 'Samples',
	latencyTotal: 'Total',
	loudnessTarget: 'Target',
	custom: 'Custom',
	analyseAndNormalise: 'Analyse & Normalise',
	loudnessMeasured: 'Measured',
	loudnessCorrection: 'Correction',
	loudnessResult: 'Result',
	applyGain: 'Apply ({x})',
	reset: 'Reset',
	activeCorrection: 'Active correction: {x} dB',

	// MeterStrip
	masterOutputLevels: 'Master output levels',

	// LimitedPreview
	compatibilityPreview: 'Compatibility preview',
	compatibilityThumbnail: 'Compatibility thumbnail for {x}',

	// ErrorBoundary
	unexpectedError:
		'The editor hit an unexpected error. Try reloading — your project is auto-saved.',
	errorTitle: "Well, that didn't work",
	reload: 'Reload'
} as const;

export const audioZh: Record<keyof typeof audioEn, string> = {
	cleanupPanelTitle: '本地音频清理（实验性）',
	closeCleanupPanel: '关闭音频清理面板',
	cleanupStatus: '状态',
	cleanupEngine: '引擎',
	cleanupModel: '模型',
	cleanupModelSize: '模型大小',
	cleanupLastAnalysis: '上次分析',
	selectAudioClip: '请在时间线中选择一个音频片段。',
	extractingAudio: '正在提取音频…',
	creatingCleanedAsset: '正在创建已清理的音频素材…',
	cleaningPercent: '正在清理… {n}%',
	cleanupProgress: '清理进度',
	cleanupActions: '操作',
	fetchVerifyModel: '获取并校验本地模型',
	loadModel: '加载模型',
	previewCleanupTitle: '清理前 {n} 秒用于 A/B 对比（需要时自动先加载模型）',
	previewCleanup: '预览清理',
	cancelRunningOp: '取消正在进行的操作',
	applyCleanupTitle: '创建已清理的音频素材，并让该片段使用它（需要时自动先加载模型）',
	applyToExport: '应用到导出 / 创建已清理的音频素材',
	removeCleanupTitle: '将该片段恢复为原始音频（可撤销）',
	removeCleanup: '移除清理',
	abPreview: 'A/B 预览（{n} 秒）',
	playOriginal: '播放原声',
	playCleaned: '播放清理后',
	cleanupApplied: '已应用清理',
	cleanupFooter:
		'模型：DTLN（MIT，Interspeech 2020）经 ONNX Runtime Web 运行。只有点击“加载模型”后，权重才会从本应用自身的源加载。',

	enableX: '启用 {x}',
	bypassX: '旁路 {x}',
	bypassed: '已旁路',
	active: '生效中',

	liveAudioChain: '实时音频链',
	latencyMs: '延迟：{x} ms',
	chainRequiresIsolation: '实时音频链需要跨源隔离（cross-origin isolation）。',
	configureBeforeRecording: '录制前配置',
	chainEmptyNote:
		'门限器、压缩器和限制器可以应用到录制音频。开始录制即可启用该选项；实时监听保持未处理。',
	gate: '门限器',
	compressor: '压缩器',
	limiter: '限制器',
	threshold: '阈值',
	range: '范围',
	attack: '起音',
	hold: '保持',
	release: '释放',
	ratio: '比例',
	knee: '拐点',
	makeupGain: '补偿增益',
	ceiling: '上限',
	printToRecording: '将链路应用到录制',
	printToRecordingHint: '在 pipeline worker 中把该链路应用到录制音频。此版本中监听输出不经过处理。',

	analysisAlreadyRunning: '分析已在进行中。',
	timelineEmpty: '时间线为空。',
	voiceCleanup: '人声清理',
	addAudioToClean: '添加音频以开始清理',
	voiceEmptyNote: '导入片段并放入音频轨道。时间线中有音频后，降噪与响度工具即可启用。',
	denoiser: '降噪器',
	loudnessNormalisation: '响度归一化',
	addAudioTracksHint: '向时间线添加音频片段，即可启用逐轨道降噪。',
	noAudioTracksYet: '尚无音频轨道。',
	enablePerTrackDenoise: '启用逐轨道降噪。降噪器会在监听总线和导出链路上运行。',
	denoiserUnavailable: '降噪器不可用：{x}',
	loadingRNNoise: '正在加载 RNNoise WASM…',
	rnnoiseReady: 'RNNoise WASM 已就绪。',
	latencyStage: '阶段',
	latencySamples: '样本数',
	latencyTotal: '合计',
	loudnessTarget: '目标',
	custom: '自定义',
	analyseAndNormalise: '分析并归一化',
	loudnessMeasured: '测得',
	loudnessCorrection: '修正',
	loudnessResult: '结果',
	applyGain: '应用（{x}）',
	reset: '重置',
	activeCorrection: '当前修正：{x} dB',

	masterOutputLevels: '主输出电平',

	compatibilityPreview: '兼容性预览',
	compatibilityThumbnail: '{x} 的兼容性缩略图',

	unexpectedError: '编辑器遇到意外错误，请重新加载——您的项目已自动保存。',
	errorTitle: '哎呀，没能成功',
	reload: '重新加载'
};
