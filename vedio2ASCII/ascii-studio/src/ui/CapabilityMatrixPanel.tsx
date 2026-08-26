import { createMemo, For, Show } from 'solid-js';
import type { AiAvailability, CapabilityProbeResult, FeatureSupport } from '../protocol';
import { languageToolsSurfaceVisible } from '../protocol';
import { type CapabilityRow, webnnRow } from './capability-rows';
import { studioCopy, studioLocale } from './locale';

interface CapabilityMatrixPanelProps {
	probe: CapabilityProbeResult | null;
}

function supportChip(support: FeatureSupport, copy: ReturnType<typeof studioCopy>): string {
	switch (support) {
		case 'supported':
			return copy.supportSupported;
		case 'unsupported':
			return copy.supportUnsupported;
		case 'unknown':
			return copy.supportUnknown;
	}
}

function canHeadersUnlockCore(probe: CapabilityProbeResult): boolean {
	return (
		probe.webGPUCore === 'supported' &&
		probe.webCodecsDecode === 'supported' &&
		probe.webCodecsEncode === 'supported' &&
		probe.codecs.h264Encode === 'supported' &&
		probe.codecs.vp9Encode === 'supported' &&
		probe.codecs.av1Encode === 'supported' &&
		probe.offscreenCanvas === 'supported'
	);
}

function rowsForProbe(
	probe: CapabilityProbeResult,
	copy: ReturnType<typeof studioCopy>
): CapabilityRow[] {
	const sabAction = !probe.crossOriginIsolated
		? canHeadersUnlockCore(probe)
			? copy.serveWithCoopCoep
			: copy.coopCoepOneMissing
		: null;
	return [
		{
			label: copy.webGpuStandard,
			support: probe.webGPUCore,
			active:
				probe.tier === 'core-webgpu' ||
				(probe.tier === 'compatibility-webgpu' && !probe.compatibilityAdapter),
			action: probe.webGPUCore === 'supported' ? null : copy.enableHardwareAccelerationOrWebGpu
		},
		{
			label: copy.webGpuCompatAdapter,
			support: probe.webGPUCompat,
			active: probe.compatibilityAdapter,
			action:
				probe.webGPUCompat === 'supported' || probe.webGPUCore === 'supported'
					? null
					: copy.noWebGpuAdapterDetected
		},
		{
			label: copy.videoDecoder,
			support: probe.webCodecsDecode,
			active: probe.webCodecsDecode === 'supported' && probe.tier !== 'shell-only',
			action: probe.webCodecsDecode === 'supported' ? null : copy.useWebCodecsDecodeBrowser
		},
		{
			label: copy.videoEncoder,
			support: probe.webCodecsEncode,
			active: probe.webCodecsEncode === 'supported' && probe.tier !== 'shell-only',
			action: probe.webCodecsEncode === 'supported' ? null : copy.exportLimitedWithoutEncode
		},
		{
			label: copy.h264Decode,
			support: probe.codecs.h264Decode,
			active: probe.codecs.h264Decode === 'supported',
			action: null
		},
		{
			label: copy.vp9Decode,
			support: probe.codecs.vp9Decode,
			active: probe.codecs.vp9Decode === 'supported',
			action: null
		},
		{
			label: copy.av1Decode,
			support: probe.codecs.av1Decode,
			active: probe.codecs.av1Decode === 'supported',
			action: null
		},
		{
			label: copy.h264Encode,
			support: probe.codecs.h264Encode,
			active: probe.codecs.h264Encode === 'supported',
			action: null
		},
		{
			label: copy.vp9Encode,
			support: probe.codecs.vp9Encode,
			active: probe.codecs.vp9Encode === 'supported',
			action: null
		},
		{
			label: copy.av1Encode,
			support: probe.codecs.av1Encode,
			active: probe.tier === 'core-webgpu' && probe.codecs.av1Encode === 'supported',
			action: null
		},
		{
			label: copy.aacDecode,
			support: probe.codecs.aacDecode,
			active: probe.codecs.aacDecode === 'supported',
			action: null
		},
		{
			label: copy.opusDecode,
			support: probe.codecs.opusDecode,
			active: probe.codecs.opusDecode === 'supported',
			action: null
		},
		{
			label: copy.aacEncode,
			support: probe.codecs.aacEncode,
			active: probe.codecs.aacEncode === 'supported',
			action: null
		},
		{
			label: copy.opusEncode,
			support: probe.codecs.opusEncode,
			active: probe.codecs.opusEncode === 'supported',
			action: null
		},
		{
			label: copy.sharedArrayBuffer,
			support: probe.sharedArrayBuffer,
			active: probe.sharedArrayBuffer === 'supported',
			action: sabAction
		},
		{
			label: copy.offscreenCanvas,
			support: probe.offscreenCanvas,
			active: probe.offscreenCanvas === 'supported' && probe.tier !== 'shell-only',
			action: probe.offscreenCanvas === 'supported' ? null : copy.previewRequiresOffscreenCanvas
		},
		{
			label: copy.fileSystemAccess,
			support: probe.fileSystemAccess,
			active: probe.fileSystemAccess === 'supported',
			action: probe.fileSystemAccess === 'supported' ? null : copy.blobDownloadFallback
		},
		{ label: copy.opfs, support: probe.opfs, active: probe.opfs === 'supported', action: null },
		{
			label: copy.audioWorklet,
			support: probe.audioWorklet,
			active: probe.audioWorklet === 'supported',
			action: null
		},
		cleanupRow(probe, copy),
		webnnRow(probe, copy),
		asrRow(probe, copy),
		smartReframeRow(probe, copy),
		...(probe.languageTools && languageToolsSurfaceVisible(probe.languageTools)
			? [languageToolsRow(probe, copy)]
			: []),
		// ── Capture Engine (Phase 41) probes ─────────────────────────
		{
			label: copy.captureMstp,
			support: probe.capture.mediaStreamTrackProcessor,
			active: probe.capture.mediaStreamTrackProcessor === 'supported',
			action:
				probe.capture.mediaStreamTrackProcessor === 'supported' ? null : copy.recordingRequiresMstp
		},
		{
			label: copy.captureTransferableTrack,
			support: probe.capture.transferableMediaStreamTrack,
			active: probe.capture.transferableMediaStreamTrack === 'supported',
			action:
				probe.capture.transferableMediaStreamTrack === 'supported'
					? null
					: copy.transferableTrackAction
		},
		{
			label: copy.captureDisplayCapture,
			support: probe.capture.displayCapture,
			active: probe.capture.displayCapture === 'supported',
			action:
				probe.capture.displayCapture === 'supported'
					? null
					: copy.screenRecordingRequiresDisplayMedia
		},
		{
			label: copy.captureDisplayAudio,
			support: probe.capture.displayAudioCapture,
			active: probe.capture.displayAudioCapture === 'supported',
			action:
				probe.capture.displayAudioCapture === 'supported'
					? null
					: probe.capture.displayAudioCapture === 'unknown'
						? copy.displayAudioUnknown
						: copy.displayAudioNotAvailable
		},
		{
			label: copy.captureVideoEncodeRealtime,
			support: probe.capture.videoEncodeRealtime,
			active: probe.capture.videoEncodeRealtime === 'supported',
			action:
				probe.capture.videoEncodeRealtime === 'supported'
					? null
					: copy.recordingRequiresHwRealtimeEncode
		},
		{
			label: copy.captureOpusEncode,
			support: probe.capture.audioEncodeOpus,
			active: probe.capture.audioEncodeOpus === 'supported',
			action: probe.capture.audioEncodeOpus === 'supported' ? null : copy.audioRecordingRequiresOpus
		},
		{
			label: copy.captureAacEncode,
			support: probe.capture.audioEncodeAac,
			active: probe.capture.audioEncodeAac === 'supported',
			action: null
		},
		{
			label: copy.captureOpfsSyncAccess,
			support: probe.capture.opfsSyncAccessHandle,
			active: probe.capture.opfsSyncAccessHandle === 'supported',
			action:
				probe.capture.opfsSyncAccessHandle === 'supported'
					? null
					: copy.recordingRequiresOpfsSyncAccess
		},
		...(probe.captureUx
			? [
					{
						label: copy.documentPip,
						support: probe.captureUx.documentPip,
						active: probe.captureUx.documentPip === 'supported',
						action: null
					},
					{
						label: copy.regionCapture,
						support: probe.captureUx.cropTarget,
						active: probe.captureUx.cropTarget === 'supported',
						action: null
					},
					{
						label: copy.elementCapture,
						support: probe.captureUx.elementCapture,
						active: probe.captureUx.elementCapture === 'supported',
						action: null
					}
				]
			: [])
	];
}

function cleanupRow(
	probe: CapabilityProbeResult,
	copy: ReturnType<typeof studioCopy>
): CapabilityRow {
	const cleanup = probe.cleanup;
	const supported = cleanup?.wasmAvailable ?? typeof WebAssembly !== 'undefined';
	return {
		label: copy.audioCleanupDltn,
		support: supported ? 'supported' : 'unsupported',
		active: false,
		action: supported
			? copy.audioCleanupAvailable.replace('{x}', cleanup?.accelerator ?? 'wasm')
			: copy.audioCleanupRequiresWasm
	};
}

/** ASR probes gate only the experimental Auto Captions feature — never the tier. */
function asrRow(probe: CapabilityProbeResult, copy: ReturnType<typeof studioCopy>): CapabilityRow {
	const asr = probe.asr;
	const engineLabel =
		asr && asr.recommended === 'ort-whisper' ? 'ONNX Whisper (WASM)' : 'unavailable';
	const supported = asr?.recommended !== 'none';
	return {
		label: copy.autoCaptionsAsr,
		support: asr ? (supported ? 'supported' : 'unsupported') : 'unknown',
		active: false,
		action: supported
			? copy.autoCaptionsAvailable.replace('{x}', engineLabel)
			: copy.onDeviceCaptionsRequireWasm
	};
}

/** Smart Reframe (Phase 33) gates only the optional reframe tool — never the
 *  tier (R8.4). Saliency is always available; face detection is reported
 *  separately and is currently unbundled (saliency-only, R8.2). */
function smartReframeRow(
	probe: CapabilityProbeResult,
	copy: ReturnType<typeof studioCopy>
): CapabilityRow {
	const sr = probe.smartReframe;
	if (!sr) {
		return { label: copy.smartReframe, support: 'unknown', active: false, action: null };
	}
	const workerOk = sr.analysisWorker === 'supported';
	const faceOk = sr.faceDetection === 'supported';
	return {
		label: copy.smartReframe,
		support: workerOk ? 'supported' : 'unsupported',
		active: false,
		action: !workerOk
			? copy.smartReframeNeedsWorkers
			: faceOk
				? copy.autoCropPathFaceDetection
				: copy.autoCropPathSaliency
	};
}

/** Phase 40: display-only row, shown only when the Language Tools surface is
 *  visible (so unsupported browsers see nothing — no nag). */
function languageToolsRow(
	probe: CapabilityProbeResult,
	copy: ReturnType<typeof studioCopy>
): CapabilityRow {
	const lt = probe.languageTools;
	const usable = (a: AiAvailability | undefined): boolean =>
		a === 'available' || a === 'downloadable' || a === 'downloading';
	const parts: string[] = [];
	if (lt) {
		if (Object.values(lt.translator).some(usable)) parts.push(copy.languageToolTranslate);
		if (usable(lt.summarizer) || usable(lt.languageModel)) parts.push(copy.languageToolDraft);
	}
	return {
		label: copy.languageToolsChromeAi,
		support: 'supported',
		active: false,
		action: copy.onDeviceToolsAvailable.replace('{x}', parts.join(' + ') || copy.languageToolsLabel)
	};
}

export function CapabilityMatrixPanel(props: CapabilityMatrixPanelProps) {
	const copy = () => studioCopy(studioLocale());
	const rows = createMemo(() => {
		const probe = props.probe;
		return probe ? rowsForProbe(probe, copy()) : [];
	});

	return (
		<section class="capability-matrix">
			<Show
				when={props.probe}
				fallback={<p class="capability-panel-note">{copy().capabilityProbePending}</p>}
			>
				{(probe) => (
					<>
						<div class={`capability-v2-badge is-${probe().tier}`}>
							<span>{copy().capabilityV2}</span>
							<strong>{probe().tier}</strong>
						</div>
						<details>
							<summary>{copy().browserInfo}</summary>
							<p>
								{typeof navigator === 'undefined' ? copy().unknownBrowser : navigator.userAgent}
							</p>
						</details>
						<ul class="capability-matrix-list">
							<For each={rows()}>
								{(row) => (
									<li class="capability-matrix-row">
										<span>{row.label}</span>
										<span class={`support-chip is-${row.support}`}>
											{supportChip(row.support, copy())}
										</span>
										<span>{row.active ? copy().active : '-'}</span>
										<Show when={row.action}>
											{(action) => <span class="capability-item-action">{action()}</span>}
										</Show>
									</li>
								)}
							</For>
						</ul>
					</>
				)}
			</Show>
		</section>
	);
}
