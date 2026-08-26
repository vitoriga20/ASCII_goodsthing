/** Capability-tier explanation copy used by `src/ui/capabilities.ts`. */
export const capabilitiesEn = {
	coopCoepMissing:
		'This page is missing COOP/COEP headers. LocalCut still runs as a client-side shell, but accelerated import, playback, effects, and export need those headers so the browser can expose SharedArrayBuffer for local CPU/GPU work.',
	sabMissing:
		'This browser or origin cannot expose SharedArrayBuffer. The app shell stays client-side, but accelerated import, playback, effects, and export need SAB plus COOP/COEP headers so the local CPU/GPU path can run safely.',
	webgpuMissing:
		'WebGPU is unavailable in this browser. Accelerated import, playback, effects, and export require a WebGPU-capable Chromium browser.',
	pipelineStarting: 'Waiting for the accelerated pipeline to finish starting…',
	noLocalMedia: 'This browser cannot access local media files.',
	compatImportOnly:
		'Accelerated import is unavailable. Compatibility import loads a reduced thumbnail preview only.',
	importLimited: 'Import is unavailable in limited mode.'
} as const;

export const capabilitiesZh: Record<keyof typeof capabilitiesEn, string> = {
	coopCoepMissing:
		'此页面缺少 COOP/COEP 响应头。LocalCut 仍可在浏览器端以客户端模式运行，但加速导入、播放、特效与导出需要这些响应头，浏览器才能提供 SharedArrayBuffer 供本机 CPU/GPU 计算使用。',
	sabMissing:
		'此浏览器或源无法提供 SharedArrayBuffer。应用壳仍在本机运行，但加速导入、播放、特效与导出需要 SAB 与 COOP/COEP 响应头，本地 CPU/GPU 流程才能安全运行。',
	webgpuMissing:
		'此浏览器不支持 WebGPU。加速导入、播放、特效与导出需要支持 WebGPU 的 Chromium 浏览器。',
	pipelineStarting: '正在等待加速管线启动完成…',
	noLocalMedia: '此浏览器无法访问本地媒体文件。',
	compatImportOnly: '加速导入不可用。兼容导入仅加载缩略图预览。',
	importLimited: '受限模式下无法导入。'
};