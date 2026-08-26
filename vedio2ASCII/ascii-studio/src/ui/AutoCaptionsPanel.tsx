/**
 * "Auto Captions (Experimental)" panel — Phase 29 (on-device Whisper on ONNX
 * Runtime Web).
 *
 * Thin renderer over `AsrController` state. Everything heavy happens in the
 * lazily spawned ASR worker; this component only shows status, drives actions,
 * and displays model-download and transcription progress.
 */
import { createEffect, createSignal, For, Show, type Component } from 'solid-js';
import { X } from 'lucide-solid';
import { Button } from './components/button';
import { ASR_ACCURACY_NOTE, ASR_UNAVAILABLE_MESSAGE } from '../engine/asr/asr-probe';
import {
	asrActionAvailability,
	type AsrClipTarget,
	type AsrControllerState
} from './asr-controller';
import { studioCopy, studioLocale } from './locale';

export interface AutoCaptionsPanelProps {
	open: boolean;
	state: AsrControllerState;
	selectedClip: AsrClipTarget | null;
	onLoadModel: () => void;
	onSelectModel: (id: string) => void;
	onTranscribeClip: (language?: string) => void;
	onTranscribeRange: (language?: string) => void;
	onCancel: () => void;
	onClose: () => void;
}

type ActiveAsrJob = NonNullable<AsrControllerState['job']>;

type Copy = ReturnType<typeof studioCopy>;

function formatBytes(bytes: number | null): string {
	if (bytes === null) return '—';
	if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
	if (bytes >= 1000) return `${(bytes / 1000).toFixed(0)} KB`;
	return `${bytes} B`;
}

function formatDuration(ms: number | null): string {
	if (ms === null) return '—';
	if (ms >= 60000) return `${(ms / 60000).toFixed(1)} min`;
	return `${(ms / 1000).toFixed(2)} s`;
}

function formatLanguage(c: Copy, lang: string | null): string {
	if (!lang) return c.autoDetect;
	switch (lang) {
		case 'zh':
			return c.languageChinese;
		case 'en':
			return c.languageEnglish;
		default:
			return lang;
	}
}

function clampFraction(value: number | null | undefined): number {
	return Math.min(Math.max(value ?? 0, 0), 1);
}

function formatProgressPercent(value: number | null | undefined): string {
	return `${Math.round(clampFraction(value) * 100)}%`;
}

function asrJobLabel(c: Copy, job: ActiveAsrJob): string {
	switch (job.phase) {
		case 'extracting':
			return c.asrJobExtracting;
		case 'creating-track':
			return c.asrJobCreatingTrack;
		case 'transcribing':
			return c.asrJobTranscribing;
	}
}

export const AutoCaptionsPanel: Component<AutoCaptionsPanelProps> = (props) => {
	let panelRef: HTMLElement | undefined;
	const copy = () => studioCopy(studioLocale());
	const [language, setLanguage] = createSignal<string>('en');

	createEffect(() => {
		if (props.open) {
			requestAnimationFrame(() => panelRef?.focus());
		}
	});

	const availability = () => asrActionAvailability(props.state, props.selectedClip);
	const engineLabel = () => {
		if (props.state.recommendedEngine !== 'ort-whisper') return copy().engineUnavailable;
		const accel = props.state.accelerator ?? 'wasm';
		return `ONNX Whisper (${accel.toUpperCase()})`;
	};
	const isLoading = () => props.state.modelStatus === 'loading';
	const isCompilingModel = () =>
		isLoading() &&
		props.state.modelSizeBytes !== null &&
		props.state.downloadedBytes !== null &&
		props.state.downloadedBytes >= props.state.modelSizeBytes;
	const modelProgressLabel = () =>
		isCompilingModel()
			? copy().modelCompiling.replace('{name}', props.state.model.name)
			: copy().modelDownloading.replace('{name}', props.state.model.name);
	const modelProgressMeta = () =>
		isCompilingModel()
			? copy()
					.modelVerifiedCompiling.replace('{size}', formatBytes(props.state.modelSizeBytes))
					.replace('{engine}', engineLabel())
			: `${formatBytes(props.state.downloadedBytes)} / ${formatBytes(props.state.modelSizeBytes)}`;

	return (
		<Show when={props.open}>
			<div class="capability-backdrop" onClick={() => props.onClose()} aria-hidden="true" />
			<aside
				ref={(el) => (panelRef = el)}
				class="diagnostics-panel panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="auto-captions-panel-title"
				tabIndex={-1}
				onKeyDown={(e) => {
					if (e.key === 'Escape') props.onClose();
				}}
			>
				<header class="capability-panel-header">
					<div>
						<p class="panel-title" id="auto-captions-panel-title">
							{copy().autoCaptionsPanelTitle}
						</p>
						<p class="capability-panel-tier">{copy().asrPrivacyStatement}</p>
					</div>
					<Button
						size="icon"
						variant="ghost"
						onClick={props.onClose}
						aria-label={copy().closeAutoCaptionsPanel}
						title={copy().closeAutoCaptionsPanel}
					>
						<X size={16} aria-hidden="true" />
					</Button>
				</header>

				<Show
					when={props.state.available}
					fallback={<p class="capability-panel-note">{ASR_UNAVAILABLE_MESSAGE}</p>}
				>
					<Show when={isLoading() || props.state.job}>
						<section class="diagnostics-section">
							<h2>{copy().progressLabel}</h2>
							<Show
								when={isLoading()}
								fallback={
									<Show when={props.state.job}>
										{(job) => (
											<div
												class="asr-progress-block"
												role="status"
												aria-live="polite"
												aria-atomic="true"
											>
												<div class="asr-progress-row">
													<span class="asr-progress-label">{asrJobLabel(copy(), job())}</span>
													<span class="asr-progress-value tabular-nums">
														{formatProgressPercent(job().fraction)}
													</span>
												</div>
												<progress
													class="asr-progress-bar"
													value={clampFraction(job().fraction)}
													max={1}
													aria-label={copy().autoCaptionsProgressAria}
												/>
												<div class="asr-progress-meta">
													<span>{job().clip?.fileName ?? copy().timelineRange}</span>
													<span class="tabular-nums">
														{job().processedSeconds.toFixed(0)} / {job().totalSeconds.toFixed(0)} s
													</span>
												</div>
											</div>
										)}
									</Show>
								}
							>
								<div class="asr-progress-block" role="status" aria-live="polite" aria-atomic="true">
									<div class="asr-progress-row">
										<span class="asr-progress-label">{modelProgressLabel()}</span>
										<span class="asr-progress-value tabular-nums">
											{formatProgressPercent(props.state.downloadFraction)}
										</span>
									</div>
									<progress
										class="asr-progress-bar"
										value={clampFraction(props.state.downloadFraction)}
										max={1}
										aria-label={copy().modelDownloadProgressAria}
									/>
									<div class="asr-progress-meta">
										<span class="tabular-nums">{modelProgressMeta()}</span>
										<span>{engineLabel()}</span>
									</div>
								</div>
							</Show>
						</section>
					</Show>

					<section class="diagnostics-section">
						<h2>{copy().modelLabel}</h2>
						<Show when={props.state.models.length > 1}>
							<label style={{ display: 'block', 'margin-bottom': '0.4rem' }}>
								<span class="capability-panel-note">{copy().chooseModel}</span>
								<select
									value={props.state.model.id}
									disabled={props.state.modelStatus === 'loading' || props.state.job !== null}
									onChange={(e) => props.onSelectModel(e.currentTarget.value)}
									style={{ display: 'block', 'margin-top': '0.2rem', width: '100%' }}
								>
									<For each={props.state.models}>
										{(model) => <option value={model.id}>{model.name}</option>}
									</For>
								</select>
							</label>
						</Show>
						<p style={{ margin: '0', 'font-weight': '600' }}>{props.state.model.name}</p>
						<p class="capability-panel-note">{props.state.model.description}</p>
						<p class="capability-panel-note">
							{props.state.model.provider} · {props.state.model.license} ·{' '}
							{formatBytes(props.state.model.sizeBytes)}
							{' · '}
							<a href={props.state.model.infoUrl} target="_blank" rel="noopener noreferrer">
								{copy().learnMoreArrow}
							</a>
						</p>
						<Show when={props.state.modelStatus === 'loaded' && props.state.cached}>
							<p class="capability-panel-note">{copy().modelLoadedFromCache}</p>
						</Show>
					</section>

					<section class="diagnostics-section">
						<h2>{copy().engine}</h2>
						<dl class="diagnostics-grid">
							<div>
								<dt>{copy().detectedEngine}</dt>
								<dd>
									{engineLabel()}
									<span
										class="capability-panel-note"
										style={{ display: 'block', 'margin-top': '0.3rem' }}
									>
										{ASR_ACCURACY_NOTE}
									</span>
								</dd>
							</div>
							<div>
								<dt>{copy().modelStatus}</dt>
								<dd>{props.state.modelStatus}</dd>
							</div>
							<div>
								<dt>{copy().modelSize}</dt>
								<dd>{formatBytes(props.state.modelSizeBytes)}</dd>
							</div>
							<div>
								<dt>{copy().lastTranscription}</dt>
								<dd>{formatDuration(props.state.lastDurationMs)}</dd>
							</div>
						</dl>
						<Show when={props.state.error}>
							<p class="capability-panel-note" role="alert">
								{props.state.error}
							</p>
						</Show>
					</section>

					<section class="diagnostics-section">
						<h2>{copy().languageLabel}</h2>
						<div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
							<label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
								<input
									type="radio"
									name="asr-lang"
									value=""
									checked={language() === ''}
									onChange={() => setLanguage('')}
								/>
								{copy().autoDetect}
							</label>
							<label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
								<input
									type="radio"
									name="asr-lang"
									value="zh"
									checked={language() === 'zh'}
									onChange={() => setLanguage('zh')}
								/>
								{copy().languageChinese}
							</label>
							<label style={{ display: 'flex', 'align-items': 'center', gap: '0.25rem' }}>
								<input
									type="radio"
									name="asr-lang"
									value="en"
									checked={language() === 'en'}
									onChange={() => setLanguage('en')}
								/>
								{copy().languageEnglish}
							</label>
						</div>
					</section>

					<section class="diagnostics-section">
						<h2>{copy().clip}</h2>
						<Show
							when={props.selectedClip}
							fallback={<p class="capability-panel-note">{copy().selectClipToTranscribe}</p>}
						>
							{(clip) => (
								<p class="capability-panel-note">
									{clip().fileName} — {clip().durationS.toFixed(1)} s
								</p>
							)}
						</Show>
					</section>

					<section class="diagnostics-section">
						<h2>{copy().actionsLabel}</h2>
						<div style={{ display: 'flex', gap: '0.5rem', 'flex-wrap': 'wrap' }}>
							<Button
								variant="secondary"
								size="sm"
								disabled={!availability().loadModel.enabled}
								title={availability().loadModel.reason ?? copy().loadModelTitle}
								onClick={props.onLoadModel}
							>
								{copy().loadModel}
							</Button>
							<Button
								variant="secondary"
								size="sm"
								disabled={!availability().transcribeClip.enabled}
								title={
									availability().transcribeClip.reason ??
									(language()
										? copy().transcribeClipTitle.replace(
												'{language}',
												formatLanguage(copy(), language())
											)
										: copy().transcribeClipTitlePlain)
								}
								onClick={() => props.onTranscribeClip(language() || undefined)}
							>
								{copy().transcribeClip}
							</Button>
							<Button
								variant="secondary"
								size="sm"
								disabled={!availability().transcribeRange.enabled}
								title={availability().transcribeRange.reason ?? copy().transcribeRangeTitle}
								onClick={() => props.onTranscribeRange(language() || undefined)}
							>
								{copy().transcribeRange}
							</Button>
							<Button
								variant="secondary"
								size="sm"
								disabled={!availability().cancel.enabled}
								title={availability().cancel.reason ?? copy().cancelTitle}
								onClick={props.onCancel}
							>
								{copy().cancel}
							</Button>
						</div>
					</section>
				</Show>

				<footer class="capability-panel-note">{copy().footerWhisperNote}</footer>
			</aside>
		</Show>
	);
};

export default AutoCaptionsPanel;
