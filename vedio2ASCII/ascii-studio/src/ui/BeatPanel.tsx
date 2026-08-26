/**
 * BeatPanel -- beat analysis controls for the Media Bin sidebar.
 *
 * Per-source: analyse/progress/enable toggle/BPM summary.
 * Global: offset nudge slider, auto-cut Split/Align buttons.
 */

import { For, Show, createMemo } from 'solid-js';
import type { MediaAssetSnapshot } from '../protocol';
import { studioCopy, studioLocale } from './locale';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BeatPanelProps {
	assets: () => readonly MediaAssetSnapshot[];
	beatResults: () => ReadonlyMap<string, { tempoBpm: number; beatTimesMs: number[] }>;
	beatSettings: () => { enabledSourceIds: string[]; globalOffsetMs: number };
	analysisProgress: () => ReadonlyMap<string, number>;
	onAnalyse: (sourceId: string) => void;
	onCancel: (sourceId: string) => void;
	onToggleSource: (sourceId: string, enabled: boolean) => void;
	onOffsetChange: (offsetMs: number) => void;
	onAutoCut: (mode: 'split' | 'align') => void;
	selectedClipCount: () => number;
	snapToBeats: boolean;
	onToggleSnapToBeats: (enabled: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BeatPanel(props: BeatPanelProps) {
	const copy = () => studioCopy(studioLocale());
	const audioSources = createMemo(() => props.assets().filter((a) => a.audio != null));

	const hasBeatData = createMemo(() => props.beatResults().size > 0);
	const hasEnabledSource = createMemo(() => props.beatSettings().enabledSourceIds.length > 0);
	const snapAvailable = createMemo(() => hasBeatData() && hasEnabledSource());
	const hasSelection = createMemo(() => props.selectedClipCount() > 0);
	const autoCutDisabled = createMemo(() => !hasBeatData() || !hasSelection());

	const autoCutTooltip = createMemo(() => {
		if (!hasBeatData()) return copy().noBeatAnalysisAvailable;
		if (!hasSelection()) return copy().selectClipsToAutoCut;
		return '';
	});

	const snapLabel = createMemo(() => {
		if (!hasBeatData()) return copy().analyseAudioToEnableBeatSnap;
		if (!hasEnabledSource()) return copy().enableBeatGridFirst;
		return copy().snapToTheseBeats;
	});

	return (
		<div class="beat-panel" role="region" aria-label={copy().beatAnalysis}>
			<h3 class="beat-panel-title">{copy().beatDetection}</h3>

			<label class="beat-panel-snap-link">
				<input
					type="checkbox"
					checked={props.snapToBeats}
					onChange={(e) => props.onToggleSnapToBeats(e.currentTarget.checked)}
					disabled={!snapAvailable()}
				/>
				<span>{snapLabel()}</span>
			</label>

			{/* Per-source rows */}
			<div class="beat-panel-sources">
				<For each={audioSources()}>
					{(source) => {
						const result = () => props.beatResults().get(source.sourceId);
						const progress = () => props.analysisProgress().get(source.sourceId);
						const isEnabled = () => props.beatSettings().enabledSourceIds.includes(source.sourceId);
						const isAnalysing = () => progress() !== undefined;
						const progressPercent = () => Math.round((progress() ?? 0) * 100);

						return (
							<div class="beat-panel-source-row">
								<div class="beat-panel-source-head">
									<div class="beat-panel-source-name" title={source.fileName}>
										{source.fileName}
									</div>
									<Show
										when={isAnalysing()}
										fallback={
											<Show
												when={result()}
												fallback={<span class="beat-panel-state">{copy().notYetRun}</span>}
											>
												<span class="beat-panel-state is-ready">{copy().ready}</span>
											</Show>
										}
									>
										<span class="beat-panel-state is-busy">
											{copy().analysingN.replace('{n}', String(progressPercent()))}
										</span>
									</Show>
								</div>

								<Show when={result()} keyed>
									{(beatResult) => (
										<div
											class="beat-panel-result"
											aria-label={copy()
												.bpmAndBeats.replace('{a}', beatResult.tempoBpm.toFixed(0))
												.replace('{b}', String(beatResult.beatTimesMs.length))}
										>
											<span class="beat-panel-metric">
												<strong>{beatResult.tempoBpm.toFixed(0)}</strong>
												<span>{copy().bpm}</span>
											</span>
											<span class="beat-panel-metric">
												<strong>{beatResult.beatTimesMs.length}</strong>
												<span>{copy().beatsCount}</span>
											</span>
										</div>
									)}
								</Show>

								<div class="beat-panel-source-controls">
									<Show
										when={isAnalysing()}
										fallback={
											<button
												type="button"
												class="beat-panel-analyse-btn"
												onClick={() => props.onAnalyse(source.sourceId)}
												aria-label={`${result() ? copy().reanalyseBeatsFor : copy().analyseBeatsFor}`.replace(
													'{x}',
													source.fileName
												)}
											>
												{result() ? copy().reanalyse : copy().analyseBeats}
											</button>
										}
									>
										<div
											class="beat-panel-progress-wrap"
											role="status"
											aria-live="polite"
											aria-atomic="true"
										>
											<div class="beat-panel-progress-track">
												<div
													class="beat-panel-progress-bar"
													role="progressbar"
													aria-valuenow={progressPercent()}
													aria-valuemin={0}
													aria-valuemax={100}
													aria-label={copy().beatAnalysisProgress}
													style={{ transform: `scaleX(${progress() ?? 0})` }}
												/>
											</div>
											<button
												type="button"
												class="beat-panel-cancel-btn"
												onClick={() => props.onCancel(source.sourceId)}
												aria-label={copy().cancelBeatAnalysis}
											>
												{copy().cancel}
											</button>
										</div>
									</Show>
									<button
										type="button"
										class={`beat-panel-toggle${isEnabled() ? ' is-active' : ''}`}
										onClick={() => props.onToggleSource(source.sourceId, !isEnabled())}
										aria-pressed={isEnabled()}
										aria-label={`${isEnabled() ? copy().hideBeatGridFor : copy().showBeatGridFor}`.replace(
											'{x}',
											source.fileName
										)}
										title={isEnabled() ? copy().hideBeats : copy().showBeats}
										disabled={!result()}
									>
										{isEnabled() ? copy().gridOn : copy().showGrid}
									</button>
								</div>
							</div>
						);
					}}
				</For>
				<Show when={audioSources().length === 0}>
					<p class="beat-panel-empty">{copy().importAudioToDetectBeats}</p>
				</Show>
			</div>

			{/* Global controls */}
			<Show when={hasBeatData()}>
				<div class="beat-panel-global">
					<label class="beat-panel-offset-label">
						<span class="beat-panel-field-head">
							<span>{copy().gridOffset}</span>
							<output>{props.beatSettings().globalOffsetMs} ms</output>
						</span>
						<input
							type="range"
							min={-500}
							max={500}
							step={1}
							value={props.beatSettings().globalOffsetMs}
							onInput={(e) => props.onOffsetChange(Number(e.currentTarget.value))}
							aria-label={copy().globalBeatOffsetMs}
						/>
					</label>
					<div class="beat-panel-autocut">
						<button
							type="button"
							class="beat-panel-autocut-btn"
							onClick={() => props.onAutoCut('split')}
							disabled={autoCutDisabled()}
							title={autoCutTooltip() || copy().splitClipsAtBeats}
							aria-disabled={autoCutDisabled()}
						>
							{copy().splitAtBeats}
						</button>
						<button
							type="button"
							class="beat-panel-autocut-btn"
							onClick={() => props.onAutoCut('align')}
							disabled={autoCutDisabled()}
							title={autoCutTooltip() || copy().alignClipsToBeats}
							aria-disabled={autoCutDisabled()}
						>
							{copy().alignToBeats}
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
}
