import { studioCopy, studioLocale } from './locale';
import { createEffect, createMemo, createSignal, For, Show, untrack } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Popover } from '@ark-ui/solid/popover';
import { Copy, Download, ListPlus, Save } from 'lucide-solid';
import { Button, buttonVariants } from './components/button';
import { copyToClipboard } from '../lib/clipboard';
import { isAbortError } from '../lib/abort-error';
import { downloadBlob } from '../lib/blob-download';
import { validateOutputTemplate, resolvePlatformPresetCodec } from '../engine/export-presets';
import { aspectOutputSize } from '../engine/project';
import { exportConstraintsForProbe } from '../engine/capability-probe-v2';
import { generateChapterText, generateChaptersJson } from '../engine/chapters';
import { generateId } from '../utils/uuid';
import type {
	CapabilityProbeResult,
	ExportCodecSupport,
	ExportPreset,
	ExportPresetDoc,
	ExportProgress,
	ExportSettings,
	ExportVideoCodec,
	ProjectAspect,
	TimelineMarkerSnapshot
} from '../protocol';

interface ExportDialogProps {
	hasMedia: boolean;
	exporting: boolean;
	progress: ExportProgress | null;
	lastResult: string | null;
	error: string | null;
	warnings: readonly string[];
	timelineDuration: number;
	supportedCodecs: ExportCodecSupport[];
	capabilityProbeV2: CapabilityProbeResult | null;
	interpolationExportAvailable: boolean;
	initialSettings: ExportSettings | null;
	presets: ExportPresetDoc[];
	markers: TimelineMarkerSnapshot[];
	projectAspect: ProjectAspect;
	/** Project name for chapter file suggested name. */
	projectName?: string;
	onProbe: () => void;
	onStart: (settings: ExportSettings) => void;
	onCancel: () => void;
	onWhyConstraints: () => void;
	/** Opens the in-app user guide on the Exporting section. */
	onOpenGuide?: () => void;
	onSavePreset: (preset: ExportPresetDoc) => void;
	onDeletePreset: (presetId: string) => void;
	onEnqueue: (
		settings: ExportSettings,
		rangeMode: 'full' | 'range' | 'markers',
		presetId: string | null,
		outputTemplate: string | null
	) => void;
}

function formatDuration(seconds: number | null): string {
	if (seconds === null) return studioCopy(studioLocale()).etaPending;
	const rounded = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(rounded / 60);
	const secs = rounded % 60;
	if (minutes <= 0) return `${secs}s`;
	return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}

function codecLabel(codec: ExportVideoCodec): string {
	switch (codec) {
		case 'h264':
			return 'H.264';
		case 'vp9':
			return 'VP9';
		case 'av1':
			return 'AV1';
	}
}

function defaultSettings(preset: ExportPreset): ExportSettings {
	return {
		preset,
		codec: 'h264',
		container: 'mp4',
		width: 1920,
		height: 1080,
		fps: 30,
		videoBitrate: preset === 'quality' ? 10_000_000 : 5_000_000
	};
}

const CODEC_OPTIONS: readonly ExportCodecSupport[] = [
	{ codec: 'h264', container: 'mp4' },
	{ codec: 'vp9', container: 'webm' },
	{ codec: 'av1', container: 'webm' }
];

function disabledCodecReason(codec: ExportVideoCodec, probe: CapabilityProbeResult | null): string {
	const copy = () => studioCopy(studioLocale());
	if (!probe) return copy().codecNotProbed;
	switch (codec) {
		case 'h264':
			return probe.codecs.h264Encode === 'supported'
				? copy().mp4MuxUnavailable
				: copy().h264EncodeUnavailable;
		case 'vp9':
			return probe.codecs.vp9Encode === 'supported'
				? copy().webmMuxUnavailable
				: copy().vp9EncodeUnavailable;
		case 'av1':
			return probe.tier === 'core-webgpu'
				? copy().av1EncodeUnsupported
				: copy().av1Reserved;
	}
}

/** Export UI — Phase 6 shell, Phase 17 settings, Phase 24 presets + queue. */
export function ExportDialog(props: ExportDialogProps) {
	const copy = () => studioCopy(studioLocale());
	const [open, setOpen] = createSignal(false);
	const [settings, setSettings] = createSignal<ExportSettings>(defaultSettings('quality'));
	const [useRange, setUseRange] = createSignal(false);
	const [rangeStart, setRangeStart] = createSignal(0);
	const [rangeEnd, setRangeEnd] = createSignal(0);
	const [rangeMode, setRangeMode] = createSignal<'full' | 'range' | 'markers'>('full');
	const [selectedPresetId, setSelectedPresetId] = createSignal<string | null>(null);
	const [savingPreset, setSavingPreset] = createSignal(false);
	const [presetName, setPresetName] = createSignal('');
	const [presetTemplate, setPresetTemplate] = createSignal('');
	const [templateError, setTemplateError] = createSignal<string | null>(null);
	const [rangeError, setRangeError] = createSignal<string | null>(null);
	const percent = createMemo(() => Math.round((props.progress?.percent ?? 0) * 100));

	const effectiveSupportedCodecs = createMemo<readonly ExportCodecSupport[]>(() => {
		if (props.supportedCodecs.length > 0) return props.supportedCodecs;
		// If the geometry-specific probe already ran (initialSettings non-null) and
		// returned empty, respect that — don't fall back to broader constraints.
		if (props.initialSettings) return [];
		// Fallback: derive from the capability probe before geometry-specific results arrive.
		// In practice supportedCodecs and capabilityProbeV2 are set together, so this
		// path is only reachable during the brief window before the first probe completes.
		const probe = props.capabilityProbeV2;
		return probe ? exportConstraintsForProbe(probe) : [];
	});
	const supportedCodecSet = createMemo(
		() => new Set(effectiveSupportedCodecs().map((entry) => `${entry.codec}:${entry.container}`))
	);
	const nonCoreProbe = createMemo(() => {
		const probe = props.capabilityProbeV2;
		return probe && probe.tier !== 'core-webgpu' ? probe : null;
	});

	const aspectMismatch = createMemo(() => {
		const s = settings();
		const { width: ew, height: eh } = aspectOutputSize(props.projectAspect);
		return Math.abs(s.width / s.height - ew / eh) / (ew / eh) > 0.01;
	});

	const platformCodecResolution = createMemo(() => {
		const id = selectedPresetId();
		if (!id) return null;
		const preset = props.presets.find((p) => p.id === id);
		if (!preset || !preset.builtIn || preset.targetLufs === undefined) return null;
		const probe = props.capabilityProbeV2;
		if (!probe) return null;
		return resolvePlatformPresetCodec(preset, probe);
	});

	createEffect(() => {
		if (props.exporting || props.error || props.lastResult || props.warnings.length > 0)
			setOpen(true);
	});

	createEffect(() => {
		if (!open()) return;
		props.onProbe();
	});

	createEffect(() => {
		const incoming = props.initialSettings;
		if (!incoming) return;
		setSettings(incoming);
		if (incoming.range) {
			setUseRange(true);
			setRangeMode('range');
			setRangeStart(incoming.range.startS);
			setRangeEnd(incoming.range.endS);
		} else {
			setUseRange(false);
			setRangeMode('full');
			setRangeStart(0);
			setRangeEnd(untrack(() => props.timelineDuration));
		}
	});

	createEffect(() => {
		const supported = effectiveSupportedCodecs();
		if (supported.length === 0) return;
		const current = untrack(settings);
		if (
			supported.some(
				(entry) => entry.codec === current.codec && entry.container === current.container
			)
		) {
			return;
		}
		const fallback = supported[0]!;
		setSettings((existing) => ({
			...existing,
			codec: fallback.codec,
			container: fallback.container
		}));
		setSelectedPresetId(null);
	});

	createEffect(() => {
		const duration = props.timelineDuration;
		if (duration > 0 && rangeEnd() <= 0) {
			setRangeEnd(duration);
		}
	});

	createEffect(() => {
		if (props.interpolationExportAvailable || !settings().interpolation) return;
		setSettings((current) => ({ ...current, interpolation: undefined }));
	});

	const handleOpenChange = (next: boolean) => {
		if (!next && props.exporting) return;
		setOpen(next);
	};

	function applyPreset(preset: ExportPreset) {
		setSettings((current) => ({
			...current,
			preset,
			videoBitrate: preset === 'quality' ? 10_000_000 : 5_000_000
		}));
	}

	function applyExportPreset(presetDoc: ExportPresetDoc) {
		setSelectedPresetId(presetDoc.id);
		setSettings({
			preset: presetDoc.preset,
			codec: presetDoc.codec,
			container: presetDoc.container,
			width: presetDoc.width,
			height: presetDoc.height,
			fps: presetDoc.fps,
			videoBitrate: presetDoc.videoBitrate
		});
	}

	function setCodec(codec: ExportVideoCodec) {
		const container = codec === 'h264' ? 'mp4' : 'webm';
		if (!supportedCodecSet().has(`${codec}:${container}`)) return;
		setSettings((current) => ({ ...current, codec, container }));
		setSelectedPresetId(null);
	}

	function buildRange(): ExportSettings['range'] | null {
		const duration = Math.max(0, props.timelineDuration);
		const range = {
			startS: Math.max(0, Math.min(rangeStart(), duration)),
			endS: Math.max(0, Math.min(rangeEnd(), duration))
		};
		return range.endS > range.startS ? range : null;
	}

	const rangeInvalid = createMemo(
		() => rangeMode() === 'range' && useRange() && buildRange() === null
	);

	function validateSelectedRange(): boolean {
		if (!rangeInvalid()) {
			setRangeError(null);
			return true;
		}
		setRangeError(copy().rangeOrder);
		return false;
	}

	function buildSettings(): ExportSettings {
		const current = settings();
		const mode = rangeMode();
		const range = mode === 'range' && useRange() ? (buildRange() ?? undefined) : undefined;
		return {
			...current,
			width: Math.max(2, Math.round(current.width / 2) * 2),
			height: Math.max(2, Math.round(current.height / 2) * 2),
			fps: Math.max(1, current.fps),
			videoBitrate: Math.max(100_000, Math.round(current.videoBitrate)),
			range: range && range.endS > range.startS ? range : undefined
		};
	}

	function handleSavePreset() {
		const name = presetName().trim();
		if (!name) return;
		const template = presetTemplate().trim();
		if (template) {
			const validationError = validateOutputTemplate(template);
			if (validationError) {
				setTemplateError(validationError);
				return;
			}
		}
		const current = settings();
		const preset: ExportPresetDoc = {
			id: `preset-${generateId()}`,
			name,
			builtIn: false,
			codec: current.codec,
			container: current.container,
			width: current.width,
			height: current.height,
			fps: current.fps,
			videoBitrate: current.videoBitrate,
			preset: current.preset,
			outputTemplate: template || undefined
		};
		props.onSavePreset(preset);
		setSavingPreset(false);
		setPresetName('');
		setPresetTemplate('');
		setTemplateError(null);
		setSelectedPresetId(preset.id);
	}

	function handleEnqueue() {
		if (!validateSelectedRange()) return;
		const preset = props.presets.find((p) => p.id === selectedPresetId());
		props.onEnqueue(
			buildSettings(),
			rangeMode(),
			selectedPresetId(),
			preset?.outputTemplate ?? null
		);
	}

	function handleStart() {
		if (!validateSelectedRange()) return;
		props.onStart(buildSettings());
	}

	return (
		<Popover.Root
			open={open()}
			onOpenChange={(details) => handleOpenChange(details.open)}
			positioning={{ placement: 'bottom-end', gutter: 7 }}
		>
<Popover.Trigger class={buttonVariants()} disabled={!props.hasMedia}>
					<Download size={14} aria-hidden="true" />
					{copy().export}
				</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content class="export-popover panel" aria-label={copy().export}>
						{/* Saved presets selector */}
						<Show when={props.presets.length > 0}>
<p class="export-eyebrow">
									{copy().savedPreset}{' '}
									<span class="text-xs text-muted-foreground font-normal">({copy().experimental})</span>
								</p>
							<div class="export-preset-selector">
								<select
									class="export-select"
									value={selectedPresetId() ?? ''}
									disabled={props.exporting}
									onChange={(e) => {
										const id = e.currentTarget.value;
										if (!id) {
											setSelectedPresetId(null);
											return;
										}
										const preset = props.presets.find((p) => p.id === id);
										if (preset) applyExportPreset(preset);
									}}
								>
									<option value="">{copy().customPreset}</option>
									<For each={props.presets}>
										{(preset) => (
											<option value={preset.id}>
												{preset.name}
												{preset.builtIn ? '' : ' *'}
											</option>
										)}
									</For>
								</select>
								<Show
									when={
										selectedPresetId() &&
										!props.presets.find((p) => p.id === selectedPresetId())?.builtIn
									}
								>
									<button
										type="button"
										class="export-preset-delete"
										aria-label={copy().deletePresetAria}
										disabled={props.exporting}
										onClick={() => {
											const id = selectedPresetId();
											if (id) {
												props.onDeletePreset(id);
												setSelectedPresetId(null);
											}
										}}
									>
										×
									</button>
								</Show>
							</div>
						</Show>

<Show when={aspectMismatch()}>
								<p class="export-aspect-warning" role="alert">
									{copy()
										.exportAspectWarning.replace('{w}', String(settings().width))
										.replace('{h}', String(settings().height))
										.replace('{aspect}', props.projectAspect)}
								</p>
							</Show>
						<Show when={platformCodecResolution() && 'blocked' in platformCodecResolution()!}>
							<p class="export-preset-blocked" role="alert">
								{
									(
										platformCodecResolution() as {
											blocked: true;
											reason: string;
										}
									).reason
								}
							</p>
						</Show>
						<Show
							when={
								platformCodecResolution() &&
								!('blocked' in platformCodecResolution()!) &&
								(platformCodecResolution() as { codec: ExportVideoCodec }).codec !==
									settings().codec
							}
						>
<p class="export-aspect-warning" role="status" aria-live="polite" aria-atomic="true">
									{copy().codecFallback}
								</p>
						</Show>

<p class="export-eyebrow">{copy().exportPreset}</p>
							<div class="export-presets" role="group" aria-label={copy().exportPreset}>
							<button
								type="button"
								class={`segmented-btn${settings().preset === 'quality' ? ' is-active' : ''}`}
								aria-pressed={settings().preset === 'quality'}
								disabled={props.exporting}
								onClick={() => {
									applyPreset('quality');
									setSelectedPresetId(null);
								}}
							>
{copy().presetQuality}
								</button>
							<button
								type="button"
								class={`segmented-btn${settings().preset === 'fast' ? ' is-active' : ''}`}
								aria-pressed={settings().preset === 'fast'}
								disabled={props.exporting}
								onClick={() => {
									applyPreset('fast');
									setSelectedPresetId(null);
								}}
							>
{copy().presetFast}
								</button>
						</div>

<p class="export-eyebrow">{copy().codec}</p>
							<div class="export-codecs" role="group" aria-label={copy().codecGroup}>
							<For each={CODEC_OPTIONS}>
								{(entry) => {
									const supported = createMemo(() =>
										supportedCodecSet().has(`${entry.codec}:${entry.container}`)
									);
									return (
										<button
											type="button"
											class={`segmented-btn${settings().codec === entry.codec ? ' is-active' : ''}`}
											aria-pressed={settings().codec === entry.codec}
											disabled={props.exporting || !supported()}
											title={
												supported()
													? undefined
													: disabledCodecReason(entry.codec, props.capabilityProbeV2)
											}
											onClick={() => setCodec(entry.codec)}
										>
											{codecLabel(entry.codec)} · {entry.container.toUpperCase()}
										</button>
									);
								}}
							</For>
						</div>

						<Show when={nonCoreProbe()}>
							{(probe) => (
								<details class="export-tier-constraints" open>
<summary>{copy().tierConstraints}</summary>
										<p class="export-note">
											{copy().tierLimits.replace('{tier}', probe().tier)}
										</p>
									<ul>
										<For
											each={CODEC_OPTIONS.filter(
												(entry) => !supportedCodecSet().has(`${entry.codec}:${entry.container}`)
											)}
										>
											{(entry) => (
												<li>
													<span>
														{codecLabel(entry.codec)} · {entry.container.toUpperCase()}
													</span>
													<span>{disabledCodecReason(entry.codec, probe())}</span>
												</li>
											)}
										</For>
									</ul>
									<button type="button" class="export-why-link" onClick={props.onWhyConstraints}>
										{copy().why}
									</button>
								</details>
							)}
						</Show>

						<div class="export-fields">
<label class="export-field">
									<span>{copy().width}</span>
								<input
									type="number"
									min="2"
									step="2"
									value={settings().width}
									disabled={props.exporting}
									onInput={(event) => {
										setSettings((current) => ({
											...current,
											width: Number(event.currentTarget.value)
										}));
										setSelectedPresetId(null);
									}}
								/>
							</label>
<label class="export-field">
									<span>{copy().height}</span>
								<input
									type="number"
									min="2"
									step="2"
									value={settings().height}
									disabled={props.exporting}
									onInput={(event) => {
										setSettings((current) => ({
											...current,
											height: Number(event.currentTarget.value)
										}));
										setSelectedPresetId(null);
									}}
								/>
							</label>
							<label class="export-field">
								<span>FPS</span>
								<input
									type="number"
									min="1"
									step="0.01"
									value={settings().fps}
									disabled={props.exporting}
									onInput={(event) => {
										setSettings((current) => ({
											...current,
											fps: Number(event.currentTarget.value)
										}));
										setSelectedPresetId(null);
									}}
								/>
							</label>
<label class="export-field">
									<span>{copy().bitrate}</span>
								<input
									type="number"
									min="0.1"
									step="0.1"
									value={(settings().videoBitrate / 1_000_000).toFixed(1)}
									disabled={props.exporting}
									onInput={(event) => {
										setSettings((current) => ({
											...current,
											videoBitrate: Number(event.currentTarget.value) * 1_000_000
										}));
										setSelectedPresetId(null);
									}}
								/>
							</label>
							{/* Phase 37: Frame Interpolation controls */}
							<Show when={props.interpolationExportAvailable}>
								<label class="export-field export-field--toggle">
									<input
										type="checkbox"
										checked={!!settings().interpolation}
										disabled={props.exporting}
										onChange={(event) => {
											setSettings((current) => ({
												...current,
												interpolation: event.currentTarget.checked
													? {
															mode: 'fps-upconvert',
															factorCap: 4,
															targetFps: Math.round(settings().fps * 2),
															motionBlur: false
														}
													: undefined
											}));
											setSelectedPresetId(null);
										}}
									/>
									<span>{copy().fpsUpconvert}</span>
								</label>
								<Show when={settings().interpolation}>
<label class="export-field">
											<span>{copy().targetFps}</span>
										<input
											type="number"
											min="1"
											max="240"
											value={settings().interpolation?.targetFps ?? Math.round(settings().fps * 2)}
											disabled={props.exporting}
											onInput={(event) => {
												setSettings((current) => ({
													...current,
													interpolation: current.interpolation
														? {
																...current.interpolation,
																targetFps: Math.max(
																	1,
																	Math.min(240, Number(event.currentTarget.value) || 60)
																)
															}
														: undefined
												}));
												setSelectedPresetId(null);
											}}
										/>
									</label>
									<label class="export-field export-field--toggle">
										<input
											type="checkbox"
											checked={settings().interpolation?.motionBlur ?? false}
											disabled={props.exporting}
											onChange={(event) => {
												setSettings((current) => ({
													...current,
													interpolation: current.interpolation
														? {
																...current.interpolation,
																motionBlur: event.currentTarget.checked
															}
														: undefined
												}));
												setSelectedPresetId(null);
											}}
										/>
										<span>{copy().motionBlur}</span>
									</label>
								</Show>
							</Show>
						</div>

						{/* Range mode */}
<p class="export-eyebrow">{copy().rangeSection}</p>
							<div class="export-presets" role="group" aria-label={copy().exportRangeGroup}>
							<button
								type="button"
								class={`segmented-btn${rangeMode() === 'full' ? ' is-active' : ''}`}
								aria-pressed={rangeMode() === 'full'}
								disabled={props.exporting}
								onClick={() => {
									setRangeMode('full');
									setUseRange(false);
									setRangeError(null);
								}}
							>
{copy().rangeFull}
								</button>
							<button
								type="button"
								class={`segmented-btn${rangeMode() === 'range' ? ' is-active' : ''}`}
								aria-pressed={rangeMode() === 'range'}
								disabled={props.exporting || props.timelineDuration <= 0}
								onClick={() => {
									setRangeMode('range');
									setUseRange(true);
									setRangeError(null);
								}}
							>
{copy().rangeRange}
								</button>
							<Show when={props.markers.length >= 2}>
								<button
									type="button"
									class={`segmented-btn${rangeMode() === 'markers' ? ' is-active' : ''}`}
									aria-pressed={rangeMode() === 'markers'}
									disabled={props.exporting}
									onClick={() => {
										setRangeMode('markers');
										setUseRange(false);
										setRangeError(null);
									}}
								>
{copy().rangeMarkers}
									</button>
							</Show>
						</div>

						<Show when={rangeMode() === 'range'}>
							<div class="export-fields">
<label class="export-field">
										<span>{copy().rangeIn}</span>
									<input
										type="number"
										min="0"
										step="0.01"
										max={props.timelineDuration}
										value={rangeStart()}
										disabled={props.exporting}
										onInput={(event) => {
											setRangeStart(Number(event.currentTarget.value));
											setRangeError(null);
										}}
									/>
								</label>
<label class="export-field">
										<span>{copy().rangeOut}</span>
									<input
										type="number"
										min="0"
										step="0.01"
										max={props.timelineDuration}
										value={rangeEnd()}
										disabled={props.exporting}
										onInput={(event) => {
											setRangeEnd(Number(event.currentTarget.value));
											setRangeError(null);
										}}
									/>
								</label>
							</div>
							<Show when={rangeError() ?? (rangeInvalid() ? copy().rangeOrder : null)}>
								{(message) => <p class="export-error">{message()}</p>}
							</Show>
						</Show>

<Show when={rangeMode() === 'markers'}>
								<p class="export-note">
									{(props.markers.length - 1 === 1
										? copy().markersQueuedOne
										: copy().markersQueuedMany
									)
										.replace('{m}', String(props.markers.length))
										.replace('{n}', String(props.markers.length - 1))}
								</p>
							</Show>

						<Show when={props.progress}>
							{(progress) => (
								<div class="export-progress">
									<div class="export-progress-row">
										<span>{progress().phase}</span>
										<span class="tabular-nums">{percent()}%</span>
									</div>
									<progress max="1" value={progress().percent} />
									<div class="export-estimate">
										<span>{formatDuration(progress().etaSeconds)}</span>
										<Show when={progress().subRealtime && progress().etaSeconds !== null}>
											<span>{copy().subRealtime}</span>
										</Show>
									</div>
								</div>
							)}
						</Show>

						<Show when={props.lastResult}>
							<p class="export-note">{props.lastResult}</p>
						</Show>
						<Show when={props.error}>
							<p class="export-error">{props.error}</p>
						</Show>
						<Show when={props.warnings.length > 0}>
							<div class="export-warning-list" role="status" aria-live="polite" aria-atomic="true">
								<For each={props.warnings}>{(warning) => <p class="export-note">{warning}</p>}</For>
							</div>
						</Show>

						{/* Chapters section (Phase 44 T7.4) */}
						<details class="export-chapters">
							<summary>YouTube Chapters</summary>
							<ChaptersSection
								markers={props.markers}
								timelineDuration={props.timelineDuration}
								projectName={props.projectName ?? 'project'}
							/>
						</details>

						{/* Save preset */}
						<Show when={savingPreset()}>
							<div class="export-fields" style={{ 'margin-top': '8px' }}>
								<label class="export-field" style={{ flex: 1 }}>
									<span>{copy().presetName}</span>
									<input
										type="text"
										value={presetName()}
										onInput={(e) => setPresetName(e.currentTarget.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleSavePreset();
										}}
										placeholder={copy().myPreset}
									/>
								</label>
								<label class="export-field" style={{ flex: 1 }}>
									<span>{copy().filenameTemplate}</span>
									<input
										type="text"
										value={presetTemplate()}
										onInput={(e) => {
											setPresetTemplate(e.currentTarget.value);
											setTemplateError(null);
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleSavePreset();
										}}
										placeholder="{project}_{preset}_{index}"
									/>
								</label>
							</div>
							<Show when={templateError()}>
								{(message) => (
									<p class="export-error" style={{ 'margin-bottom': '8px' }}>
										{message()}
									</p>
								)}
							</Show>
							<div class="export-actions" style={{ 'margin-top': '4px' }}>
								<Button
									variant="default"
									disabled={!presetName().trim()}
									onClick={handleSavePreset}
								>
									{copy().save}
								</Button>
								<Button
									onClick={() => {
										setSavingPreset(false);
										setTemplateError(null);
									}}
								>
									{copy().cancel}
								</Button>
							</div>
						</Show>

						<div class="export-actions">
							<Button
								variant="default"
								disabled={
									props.exporting ||
									!props.hasMedia ||
									effectiveSupportedCodecs().length === 0 ||
									rangeInvalid()
								}
								onClick={handleStart}
							>
{copy().start}
								</Button>
							<Button
								disabled={
									props.exporting ||
									!props.hasMedia ||
									effectiveSupportedCodecs().length === 0 ||
									rangeInvalid()
								}
								onClick={handleEnqueue}
							>
<ListPlus size={14} aria-hidden="true" />
									{copy().addToQueue}{' '}
									<span
										class="text-xs text-muted-foreground font-normal"
										title={copy().renderQueueDevNote}
									>
										({copy().experimental})
									</span>
								</Button>
<Show when={props.exporting}>
									<Button onClick={() => props.onCancel()}>{copy().stopExport}</Button>
								</Show>
							<Show when={!savingPreset()}>
								<Button
									disabled={props.exporting}
									onClick={() => {
										const preset = props.presets.find((p) => p.id === selectedPresetId());
										setPresetTemplate(preset?.outputTemplate ?? '');
										setTemplateError(null);
										setSavingPreset(true);
									}}
								>
<Save size={14} aria-hidden="true" />
										{copy().savePreset}{' '}
										<span class="text-xs text-muted-foreground font-normal">({copy().experimental})</span>
									</Button>
							</Show>
							<Popover.CloseTrigger
								class={buttonVariants()}
								type="button"
								disabled={props.exporting}
							>
{copy().close}
								</Popover.CloseTrigger>
						</div>
						<Show when={props.onOpenGuide}>
							{/* The popover portals outside the app shell, so close it before the guide covers the editor. */}
							<button
								type="button"
								class="export-why-link"
								onClick={() => {
									setOpen(false);
									props.onOpenGuide?.();
								}}
							>
{copy().exportGuideLink}
								</button>
						</Show>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	);
}

/** Chapters section for the Export dialog — Phase 44 T7.4. */
function ChaptersSection(props: {
	markers: TimelineMarkerSnapshot[];
	timelineDuration: number;
	projectName: string;
}) {
	const copy = () => studioCopy(studioLocale());
	const chapterResult = createMemo(() =>
		generateChapterText(props.markers, props.timelineDuration)
	);
	const isValid = () => chapterResult().valid;
	const chapterText = () => {
		const r = chapterResult();
		return r.valid ? r.text : '';
	};
	const chapterReason = () => {
		const r = chapterResult();
		return r.valid ? '' : r.reason;
	};
	const chapterEntries = () => {
		const r = chapterResult();
		return r.valid ? r.entries : [];
	};

	async function handleCopy() {
		const text = chapterText();
		if (!text) return;
		const res = await copyToClipboard(text);
		if (!res.ok) console.warn('Clipboard write failed:', res.error);
	}

	async function handleSave() {
		const text = chapterText();
		const entries = chapterEntries();
		if (!text || entries.length === 0) return;
		const textBlob = new Blob([text], { type: 'text/plain' });
		const jsonContent = generateChaptersJson(entries);
		const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
		const textName = `${props.projectName}.chapters.txt`;
		const jsonName = `${props.projectName}.chapters.json`;

		if (typeof (globalThis as Record<string, unknown>).showSaveFilePicker === 'function') {
			try {
				const handle = await (
					globalThis as unknown as {
						showSaveFilePicker: (options: unknown) => Promise<FileSystemFileHandle>;
					}
				).showSaveFilePicker({
					suggestedName: textName,
					types: [{ description: copy().chaptersFileType, accept: { 'text/plain': ['.txt'] } }]
				});
				const writable = await handle.createWritable();
				await writable.write(textBlob);
				await writable.close();
				// Download JSON as sidecar fallback (parent directory not accessible from file handle).
				downloadBlob(jsonBlob, jsonName);
			} catch (err) {
				if (isAbortError(err)) {
					// User cancelled file picker — no feedback needed
					return;
				}
				console.warn('Native save failed:', err);
				downloadBlob(textBlob, textName);
				downloadBlob(jsonBlob, jsonName);
			}
		} else {
			downloadBlob(textBlob, textName);
			downloadBlob(jsonBlob, jsonName);
		}
	}

	return (
		<div class="chapters-section">
			<Show when={isValid()} fallback={<p class="export-error">{chapterReason()}</p>}>
				<div class="chapters-preview">
					<pre class="chapters-text">{chapterText()}</pre>
				</div>
				<div class="chapters-actions">
<Button variant="secondary" onClick={handleCopy}>
							<Copy size={14} aria-hidden="true" />
							{copy().copyToClipboard}
						</Button>
						<Button variant="secondary" onClick={handleSave}>
							<Download size={14} aria-hidden="true" />
							{copy().saveChaptersTxt}
						</Button>
				</div>
			</Show>
		</div>
	);
}
