import { formatIsoForDisplay, isIsoTimestamp } from '../time';
import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';
import { Trash2 } from 'lucide-solid';
import { TRANSCRIPT_WINDOW_RADIUS, computeSegmentWindow } from './transcript-window';
import type {
	CaptionAnimStylePresetSnapshot,
	CaptionDiagnosticSnapshot,
	CaptionExportSettingsSnapshot,
	CaptionPresetIdSnapshot,
	CaptionTrackSnapshot,
	CaptionStyleSnapshot
} from '../protocol';
import { CaptionStyleInspector } from './CaptionStyleInspector';
import { RailEmpty } from './RailEmpty';
import { studioCopy, studioLocale } from './locale';

interface TranscriptPanelProps {
	captionTracks: CaptionTrackSnapshot[];
	diagnostics: readonly CaptionDiagnosticSnapshot[];
	playheadTime: number;
	selectedTrackId: string | null;
	selectedSegmentIds: readonly string[];
	onSelectTrack: (trackId: string | null) => void;
	onSelectSegmentIds: (segmentIds: string[]) => void;
	onImport: (file: File, trackId?: string) => void;
	onExport: (settings: CaptionExportSettingsSnapshot) => void;
	onDeleteTrack: (trackId: string) => void;
	onDeleteTracks: (trackIds: readonly string[]) => void;
	onSetTrack: (
		trackId: string,
		patch: {
			name?: string;
			language?: string | null;
			burnedIn?: boolean;
			visible?: boolean;
			defaultStyle?: Partial<CaptionStyleSnapshot>;
		}
	) => void;
	onSetSegmentText: (trackId: string, segmentId: string, text: string) => void;
	onSetSegmentTiming: (trackId: string, segmentId: string, start: number, end: number) => void;
	onSetSegmentStyle: (
		trackId: string,
		segmentId: string,
		style: Partial<CaptionStyleSnapshot>
	) => void;
	onSplit: (trackId: string, segmentId: string, time: number) => void;
	onMerge: (trackId: string, segmentIds: readonly string[]) => void;
	onDelete: (trackId: string, segmentIds: readonly string[]) => void;
	onSnap: (trackId: string, segmentId: string, edge: 'start' | 'end' | 'both') => void;
	/** Phase 30: user-imported caption animation style presets. */
	customAnimCaptionPresets: readonly CaptionAnimStylePresetSnapshot[];
	/** Phase 30: set the animation preset on the selected segment or track default. */
	onSetAnimPreset: (trackId: string, segmentId: string | undefined, presetId: string) => void;
	/** Phase 30: import a validated custom preset into the project. */
	onImportCustomPreset: (preset: CaptionAnimStylePresetSnapshot) => void;
	/** Phase 30: remove a custom preset by id. */
	onDeleteCustomPreset: (presetId: string) => void;
}

type Copy = ReturnType<typeof studioCopy>;

const PRESETS: { value: CaptionPresetIdSnapshot; labelKey: keyof Copy }[] = [
	{ value: 'subtitle', labelKey: 'presetSubtitle' },
	{ value: 'lower-third', labelKey: 'presetLowerThird' },
	{ value: 'note', labelKey: 'presetNote' },
	{ value: 'screencast', labelKey: 'presetScreencast' }
];

function formatTime(value: number): string {
	return value.toFixed(2);
}

function parseTime(value: string, fallback: number): number {
	const trimmed = value.trim();
	if (trimmed === '') return fallback;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function cueLabel(c: Copy, count: number): string {
	const template = count === 1 ? c.cueSingular : c.cueMany;
	return template.replace('{n}', String(count));
}

function trackMeta(c: Copy, track: CaptionTrackSnapshot): string {
	const language = track.language ? track.language.toUpperCase() : c.trackLanguageAuto;
	const subtitleState = track.burnedIn ? c.subtitlesOn : c.subtitleSidecar;
	const visibility = track.visible ? c.trackVisible : c.trackHidden;
	return `${cueLabel(c, track.segments.length)} · ${language} · ${subtitleState} · ${visibility}`;
}

interface GeneratedTrackInfo {
	createdAt: string | null;
	label: string;
}

function generatedTrackInfo(c: Copy, track: CaptionTrackSnapshot): GeneratedTrackInfo | null {
	if (!track.generatedBy) return null;
	try {
		const parsed = JSON.parse(track.generatedBy) as {
			generatedBy?: unknown;
			engine?: unknown;
			createdAt?: unknown;
		};
		if (parsed.generatedBy !== 'auto-captions-phase-29') return null;
		const createdAt =
			typeof parsed.createdAt === 'string' && isIsoTimestamp(parsed.createdAt)
				? parsed.createdAt
				: null;
		const engine = typeof parsed.engine === 'string' ? parsed.engine : 'auto captions';
		const knownEngine = engine === 'ort-whisper';
		return {
			createdAt,
			label: knownEngine ? c.engineAutoCaptions : engine
		};
	} catch {
		return null;
	}
}

function formatGeneratedAt(c: Copy, info: GeneratedTrackInfo | null): string {
	if (!info?.createdAt) return c.generatedFallback;
	return formatIsoForDisplay(info.createdAt);
}

function trackDuration(track: CaptionTrackSnapshot): string {
	const end = track.segments.reduce(
		(max, segment) => Math.max(max, segment.start + segment.duration),
		0
	);
	return end > 0 ? `${end.toFixed(1)} s` : '0.0 s';
}

export function TranscriptPanel(props: TranscriptPanelProps) {
	const copy = () => studioCopy(studioLocale());
	let importInput: HTMLInputElement | undefined;
	const activeTrack = createMemo(
		() =>
			props.captionTracks.find((track) => track.id === props.selectedTrackId) ??
			props.captionTracks[0] ??
			null
	);
	const activeSegment = createMemo(() => {
		const track = activeTrack();
		if (!track) return null;
		return (
			track.segments.find((segment) => segment.id === props.selectedSegmentIds[0]) ??
			track.segments[0] ??
			null
		);
	});
	const [draftText, setDraftText] = createSignal('');

	// Memoize the selection as a Set so per-row membership is O(1) instead of an
	// O(segments × selection) `Array.includes` scan during render.
	const selectedIdSet = createMemo(() => new Set(props.selectedSegmentIds));

	// Window the rendered rows around the active/playhead segment so large caption
	// files (thousands of segments) never materialize every row at once.
	const activeSegmentIndex = createMemo(() => {
		const track = activeTrack();
		if (!track || track.segments.length === 0) return 0;
		const selectedId = props.selectedSegmentIds[0];
		if (selectedId) {
			const byId = track.segments.findIndex((segment) => segment.id === selectedId);
			if (byId >= 0) return byId;
		}
		// Fall back to the segment under the playhead. Caption segments are sorted by
		// start time, so binary search keeps this O(log N) — playheadTime updates ~60×
		// per second during playback and would otherwise rescan the whole track.
		const t = props.playheadTime;
		let low = 0;
		let high = track.segments.length - 1;
		let byTime = -1;
		while (low <= high) {
			const mid = (low + high) >> 1;
			const segment = track.segments[mid]!;
			if (t >= segment.start && t < segment.start + segment.duration) {
				byTime = mid;
				break;
			} else if (t < segment.start) {
				high = mid - 1;
			} else {
				low = mid + 1;
			}
		}
		return byTime >= 0 ? byTime : 0;
	});
	// Manual paging anchor: lets the user reach caption rows outside the
	// active/playhead-centered window (B5 windowing would otherwise make distant
	// rows unreachable in a long SRT/WebVTT import). Cleared whenever the selection
	// or active track changes so selecting a segment recenters the view.
	const [viewAnchor, setViewAnchor] = createSignal<number | null>(null);
	createEffect(
		on([() => props.selectedSegmentIds[0], () => activeTrack()?.id], () => setViewAnchor(null))
	);
	const windowCenter = createMemo(() => viewAnchor() ?? activeSegmentIndex());
	const segmentWindow = createMemo(() =>
		computeSegmentWindow(activeTrack()?.segments.length ?? 0, windowCenter())
	);
	function pageWindow(direction: -1 | 1): void {
		const total = activeTrack()?.segments.length ?? 0;
		const { start, end } = segmentWindow();
		const next =
			direction < 0
				? Math.max(0, start - TRANSCRIPT_WINDOW_RADIUS)
				: Math.min(total - 1, end - 1 + TRANSCRIPT_WINDOW_RADIUS);
		setViewAnchor(next);
	}
	const visibleSegments = createMemo(() => {
		const track = activeTrack();
		if (!track) return [];
		const { start, end } = segmentWindow();
		return track.segments.slice(start, end);
	});

	const exportStem = createMemo(() => {
		const track = activeTrack();
		if (!track) return copy().exportStemCaptions;
		return track.name.trim().replace(/\s+/g, '-').toLowerCase() || copy().exportStemCaptions;
	});
	const autoCaptionTracks = createMemo(() =>
		props.captionTracks
			.map((track, index) => ({ track, index, info: generatedTrackInfo(copy(), track) }))
			.filter((entry) => entry.info !== null)
	);
	const olderAutoCaptionTrackIds = createMemo(() => {
		const tracks = autoCaptionTracks();
		if (tracks.length < 2) return [];
		let latest = tracks[0]!;
		for (const entry of tracks.slice(1)) {
			const entryTime = entry.info?.createdAt;
			const latestTime = latest.info?.createdAt;
			if (entryTime && latestTime) {
				if (entryTime > latestTime) latest = entry;
			} else if (entryTime) {
				latest = entry;
			} else if (!latestTime) {
				if (entry.index > latest.index) latest = entry;
			}
		}
		return tracks
			.filter((entry) => entry.track.id !== latest.track.id)
			.map((entry) => entry.track.id);
	});

	createEffect(() => {
		setDraftText(activeSegment()?.text ?? '');
	});

	function toggleSegment(segmentId: string, checked: boolean): void {
		const next = new Set(props.selectedSegmentIds);
		if (checked) next.add(segmentId);
		else next.delete(segmentId);
		props.onSelectSegmentIds([...next]);
	}

	return (
		<section class="panel transcript-panel">
			<div class="transcript-header">
				<div>
					<h2 class="panel-title">{copy().transcriptPanelTitle}</h2>
					<p class="transcript-subtitle">{copy().transcriptPanelSubtitle}</p>
				</div>
				<div class="transcript-actions">
					<Show when={olderAutoCaptionTrackIds().length > 0}>
						<button
							type="button"
							class="button danger transcript-bulk-delete"
							title={copy().deleteOlderAutoCaptions.replace(
								'{n}',
								String(olderAutoCaptionTrackIds().length)
							)}
							aria-label={copy().deleteOlderAutoCaptions.replace(
								'{n}',
								String(olderAutoCaptionTrackIds().length)
							)}
							onClick={() => props.onDeleteTracks(olderAutoCaptionTrackIds())}
						>
							<Trash2 size={14} aria-hidden="true" />
							{copy().keepLatestN.replace('{n}', String(olderAutoCaptionTrackIds().length))}
						</button>
					</Show>
					<button type="button" class="button secondary" onClick={() => importInput?.click()}>
						{copy().import}
					</button>
					<input
						ref={(el) => (importInput = el)}
						class="sr-only"
						type="file"
						accept=".srt,.vtt,text/vtt,application/x-subrip"
						onChange={(event) => {
							const file = event.currentTarget.files?.[0];
							if (file) props.onImport(file, activeTrack()?.id);
							event.currentTarget.value = '';
						}}
					/>
					<button
						type="button"
						class="button secondary"
						disabled={!activeTrack()}
						onClick={() =>
							activeTrack() &&
							props.onExport({
								trackId: activeTrack()!.id,
								formats: ['srt', 'webvtt'],
								range: { mode: 'full-track' },
								fileStem: exportStem()
							})
						}
					>
						{copy().export}
					</button>
				</div>
			</div>

			<Show
				when={props.captionTracks.length > 0}
				fallback={<RailEmpty title={copy().noCaptionsYet}>{copy().noCaptionsHint}</RailEmpty>}
			>
				<Show when={activeTrack()}>
					{(track) => {
						const info = () => generatedTrackInfo(copy(), track());
						return (
							<div class="transcript-active-summary">
								<div class="transcript-active-copy">
									<span class="transcript-kicker">{copy().activeTrackLabel}</span>
									<strong>{track().name}</strong>
									<span class="transcript-active-meta">
										<span>
											{cueLabel(copy(), track().segments.length)} · {trackDuration(track())} ·{' '}
											{track().language
												? track().language!.toUpperCase()
												: copy().trackLanguageAuto}
										</span>
										<Show when={autoCaptionTracks().length > 1}>
											<span>
												{copy()
													.generatedRunsOlder.replace('{n}', String(autoCaptionTracks().length))
													.replace('{m}', String(olderAutoCaptionTrackIds().length))}
											</span>
										</Show>
									</span>
								</div>
								<div class="transcript-active-badges">
									<Show when={info()}>
										{(generated) => (
											<>
												<span class="transcript-pill">{generated().label}</span>
												<span class="transcript-muted">
													{formatGeneratedAt(copy(), generated())}
												</span>
											</>
										)}
									</Show>
								</div>
							</div>
						);
					}}
				</Show>

				<div class="transcript-track-list">
					<For each={props.captionTracks}>
						{(track) => {
							const info = () => generatedTrackInfo(copy(), track);
							return (
								<div
									class={`transcript-track-card${activeTrack()?.id === track.id ? ' is-active' : ''}`}
								>
									<button
										type="button"
										class="transcript-track-main"
										onClick={() => {
											props.onSelectTrack(track.id);
											props.onSelectSegmentIds(track.segments[0] ? [track.segments[0].id] : []);
										}}
									>
										<span class="transcript-track-name">
											{track.name}
											<Show when={info()}>
												<span class="transcript-track-chip">{info()!.label}</span>
											</Show>
										</span>
										<span class="transcript-track-meta">
											{trackMeta(copy(), track)} · {trackDuration(track)}
										</span>
										<Show when={info()}>
											{(generated) => (
												<span class="transcript-track-meta">
													{formatGeneratedAt(copy(), generated())}
												</span>
											)}
										</Show>
									</button>
									<button
										type="button"
										class="transcript-icon-button danger"
										title={copy().deleteTrackLabel.replace('{name}', track.name)}
										aria-label={copy().deleteTrackLabel.replace('{name}', track.name)}
										onClick={() => props.onDeleteTrack(track.id)}
									>
										<Trash2 size={14} aria-hidden="true" />
									</button>
								</div>
							);
						}}
					</For>
				</div>

				<Show when={activeTrack()}>
					{(track) => (
						<>
							<div class="transcript-track-controls">
								<label>
									<span>{copy().nameField}</span>
									<input
										value={track().name}
										onChange={(event) =>
											props.onSetTrack(track().id, { name: event.currentTarget.value })
										}
									/>
								</label>
								<label>
									<span>{copy().languageLabel}</span>
									<input
										value={track().language ?? ''}
										placeholder="en"
										onChange={(event) =>
											props.onSetTrack(track().id, { language: event.currentTarget.value || null })
										}
									/>
								</label>
								<label class="transcript-inline-check">
									<input
										type="checkbox"
										checked={track().burnedIn}
										onChange={(event) =>
											props.onSetTrack(track().id, { burnedIn: event.currentTarget.checked })
										}
									/>
									<span>{copy().burnInCheckbox}</span>
								</label>
								<label class="transcript-inline-check">
									<input
										type="checkbox"
										checked={track().visible}
										onChange={(event) =>
											props.onSetTrack(track().id, { visible: event.currentTarget.checked })
										}
									/>
									<span>{copy().visibleToggle}</span>
								</label>
								<label>
									<span>{copy().presetPhase22}</span>
									<select
										value={
											(track().defaultStyle.presetId === 'subtitle' ||
											track().defaultStyle.presetId === 'lower-third' ||
											track().defaultStyle.presetId === 'note'
												? track().defaultStyle.presetId
												: 'subtitle') ?? 'subtitle'
										}
										onChange={(event) =>
											props.onSetTrack(track().id, {
												defaultStyle: {
													presetId: event.currentTarget.value as CaptionPresetIdSnapshot
												}
											})
										}
									>
										<For each={PRESETS}>
											{(preset) => <option value={preset.value}>{copy()[preset.labelKey]}</option>}
										</For>
									</select>
								</label>
								<div class="caption-anim-style-section">
									<div class="caption-anim-style-heading">{copy().animatedStylePhase30}</div>
									<CaptionStyleInspector
										presetId={track().defaultStyle.presetId ?? 'subtitle'}
										customPresets={props.customAnimCaptionPresets}
										onSetPresetId={(presetId) =>
											props.onSetAnimPreset(track().id, undefined, presetId)
										}
										onImportPreset={(preset) => props.onImportCustomPreset(preset)}
										onDeletePreset={(presetId) => props.onDeleteCustomPreset(presetId)}
									/>
								</div>
								<label>
									<span>{copy().fontSizeLabel}</span>
									<input
										type="number"
										min="16"
										max="160"
										value={track().defaultStyle.overrides?.fontSizePx ?? 64}
										onChange={(event) =>
											props.onSetTrack(track().id, {
												defaultStyle: {
													overrides: {
														...track().defaultStyle.overrides,
														fontSizePx: Number(event.currentTarget.value)
													}
												}
											})
										}
									/>
								</label>
							</div>

							<div class="transcript-workspace">
								<div class="transcript-list-pane">
									<div class="transcript-section-header">
										<span>{copy().segmentsLabel}</span>
										<span>{cueLabel(copy(), track().segments.length)}</span>
									</div>
									<div class="transcript-segment-list">
										<Show when={segmentWindow().before > 0}>
											<button
												type="button"
												class="transcript-window-hint"
												onClick={() => pageWindow(-1)}
											>
												{copy().showEarlier.replace('{n}', String(segmentWindow().before))}
											</button>
										</Show>
										<For each={visibleSegments()}>
											{(segment, index) => (
												<div
													class={`transcript-row${selectedIdSet().has(segment.id) ? ' is-selected' : ''}`}
												>
													<input
														class="transcript-row-select"
														type="checkbox"
														aria-label={copy().selectSegmentLabel.replace(
															'{n}',
															String(segmentWindow().start + index() + 1)
														)}
														checked={selectedIdSet().has(segment.id)}
														onChange={(event) =>
															toggleSegment(segment.id, event.currentTarget.checked)
														}
													/>
													<button
														type="button"
														class="transcript-row-main"
														onClick={() => {
															props.onSelectTrack(track().id);
															props.onSelectSegmentIds([segment.id]);
															setDraftText(segment.text);
														}}
													>
														<span class="transcript-row-index">
															#{segmentWindow().start + index() + 1}
														</span>
														<span class="transcript-time">
															{formatTime(segment.start)} -{' '}
															{formatTime(segment.start + segment.duration)}
														</span>
														<span class="transcript-text">{segment.text}</span>
													</button>
												</div>
											)}
										</For>
										<Show when={segmentWindow().after > 0}>
											<button
												type="button"
												class="transcript-window-hint"
												onClick={() => pageWindow(1)}
											>
												{copy().showLater.replace('{n}', String(segmentWindow().after))}
											</button>
										</Show>
									</div>
								</div>

								<div class="transcript-editor-pane">
									<Show
										when={activeSegment()}
										fallback={<p class="placeholder-text">{copy().noSegmentSelected}</p>}
									>
										{(segment) => (
											<div class="transcript-editor">
												<div class="transcript-section-header">
													<span>{copy().editSegment}</span>
													<span>
														{formatTime(segment().start)} -{' '}
														{formatTime(segment().start + segment().duration)}
													</span>
												</div>
												<label>
													<span>{copy().text}</span>
													<textarea
														value={draftText()}
														rows={5}
														onInput={(event) => setDraftText(event.currentTarget.value)}
														onBlur={() =>
															props.onSetSegmentText(track().id, segment().id, draftText())
														}
													/>
												</label>
												<div class="transcript-timing-grid">
													<label>
														<span>{copy().start}</span>
														<input
															value={formatTime(segment().start)}
															onChange={(event) =>
																props.onSetSegmentTiming(
																	track().id,
																	segment().id,
																	parseTime(event.currentTarget.value, segment().start),
																	segment().start + segment().duration
																)
															}
														/>
													</label>
													<label>
														<span>{copy().endLabel}</span>
														<input
															value={formatTime(segment().start + segment().duration)}
															onChange={(event) =>
																props.onSetSegmentTiming(
																	track().id,
																	segment().id,
																	segment().start,
																	parseTime(
																		event.currentTarget.value,
																		segment().start + segment().duration
																	)
																)
															}
														/>
													</label>
													<label>
														<span>{copy().colorLabel}</span>
														<input
															type="color"
															value={
																segment().style?.overrides?.color ??
																track().defaultStyle.overrides?.color ??
																'#ffffff'
															}
															onChange={(event) =>
																props.onSetSegmentStyle(track().id, segment().id, {
																	overrides: { color: event.currentTarget.value }
																})
															}
														/>
													</label>
													<label>
														<span>{copy().backgroundLabel}</span>
														<input
															type="color"
															value={
																segment().style?.overrides?.backgroundColor ??
																track().defaultStyle.overrides?.backgroundColor ??
																'#000000'
															}
															onChange={(event) =>
																props.onSetSegmentStyle(track().id, segment().id, {
																	overrides: { backgroundColor: event.currentTarget.value }
																})
															}
														/>
													</label>
												</div>
												<div class="transcript-editor-actions">
													<button
														type="button"
														class="button secondary"
														onClick={() =>
															props.onSplit(track().id, segment().id, props.playheadTime)
														}
													>
														{copy().splitAtPlayhead}
													</button>
													<button
														type="button"
														class="button secondary"
														disabled={props.selectedSegmentIds.length < 2}
														onClick={() => props.onMerge(track().id, props.selectedSegmentIds)}
													>
														{copy().mergeSelected}
													</button>
													<button
														type="button"
														class="button secondary"
														onClick={() => props.onSnap(track().id, segment().id, 'start')}
													>
														{copy().snapStart}
													</button>
													<button
														type="button"
														class="button secondary"
														onClick={() => props.onSnap(track().id, segment().id, 'end')}
													>
														{copy().snapEnd}
													</button>
													<button
														type="button"
														class="button secondary"
														onClick={() => props.onSnap(track().id, segment().id, 'both')}
													>
														{copy().snapBoth}
													</button>
													<button
														type="button"
														class="button danger"
														onClick={() =>
															props.onDelete(
																track().id,
																props.selectedSegmentIds.length > 0
																	? props.selectedSegmentIds
																	: [segment().id]
															)
														}
													>
														{copy().delete}
													</button>
												</div>
											</div>
										)}
									</Show>
								</div>
							</div>
						</>
					)}
				</Show>
			</Show>

			<Show when={props.diagnostics.length > 0}>
				<div class="transcript-diagnostics" role="status" aria-live="polite">
					<For each={props.diagnostics.slice(0, 6)}>
						{(diag) => <p class={`transcript-diagnostic is-${diag.severity}`}>{diag.message}</p>}
					</For>
				</div>
			</Show>
		</section>
	);
}
