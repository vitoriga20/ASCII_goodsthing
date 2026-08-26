/** Phase 43: Auto-Zoom proposals panel for the clip Inspector.
 *
 *  Reads the event log from OPFS, clusters events into zoom proposals, and
 *  lets the user apply or skip each proposal.
 */

import { createSignal, createEffect, Show, Index } from 'solid-js';
import {
	clusterEvents,
	applyProposal,
	DEFAULT_AUTO_ZOOM_PARAMS,
	type AutoZoomParams,
	type ZoomProposal
} from '../engine/auto-zoom';
import { parseEventsSidecar } from '../engine/capture/events-sidecar';
import { parseDomEventLog, type DomEventLogEntry } from '../engine/dom-event-log';
import type { ClipKeyframesSnapshot, SessionEventLogRef } from '../protocol';
import { studioCopy, studioLocale } from './locale';

interface AutoZoomPanelProps {
	clipId: string;
	trackId: string;
	clipStartUs?: number;
	sourceWidth?: number;
	sourceHeight?: number;
	sessionEventLogRef?: SessionEventLogRef;
	onSetKeyframes: (trackId: string, clipId: string, keyframes: ClipKeyframesSnapshot) => void;
}

function formatTime(us: number): string {
	const totalS = us / 1e6;
	const h = Math.floor(totalS / 3600);
	const m = Math.floor((totalS % 3600) / 60);
	const s = totalS % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function parseLoadedEvents(
	text: string,
	ref: SessionEventLogRef,
	sourceWidth?: number,
	sourceHeight?: number
): DomEventLogEntry[] | null {
	if (ref.opfsPath.endsWith('.ndjson')) {
		const captureEntries = parseEventsSidecar(text).filter(
			(
				entry
			): entry is Extract<
				ReturnType<typeof parseEventsSidecar>[number],
				{ kind: 'pointer-down' }
			> => entry.kind === 'pointer-down'
		);
		const fallbackWidth = Math.max(1, ...captureEntries.map((entry) => entry.x));
		const fallbackHeight = Math.max(1, ...captureEntries.map((entry) => entry.y));
		const width = sourceWidth && sourceWidth > 0 ? sourceWidth : fallbackWidth;
		const height = sourceHeight && sourceHeight > 0 ? sourceHeight : fallbackHeight;
		return captureEntries.map((entry) => ({
			t: Math.round(entry.t * 1_000_000),
			kind: 'click',
			x: clamp01(entry.x / width),
			y: clamp01(entry.y / height)
		}));
	}
	const log = parseDomEventLog(JSON.parse(text));
	return log?.events ?? null;
}

export function AutoZoomPanel(props: AutoZoomPanelProps) {
	const copy = () => studioCopy(studioLocale());
	const [entries, setEntries] = createSignal<DomEventLogEntry[]>([]);
	const [proposals, setProposals] = createSignal<ZoomProposal[]>([]);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [params, setParams] = createSignal<AutoZoomParams>({ ...DEFAULT_AUTO_ZOOM_PARAMS });

	// Load event log when ref changes
	createEffect(() => {
		const ref = props.sessionEventLogRef;
		if (!ref) {
			setEntries([]);
			setProposals([]);
			return;
		}

		setLoading(true);
		setError(null);

		void (async () => {
			try {
				const root = await navigator.storage.getDirectory();
				const parts = ref.opfsPath.split('/');
				let dir = root;
				for (const part of parts.slice(0, -1)) {
					dir = await dir.getDirectoryHandle(part);
				}
				const fileName = parts[parts.length - 1]!;
				const fileHandle = await dir.getFileHandle(fileName);
				const file = await fileHandle.getFile();
				const text = await file.text();
				const parsed = parseLoadedEvents(text, ref, props.sourceWidth, props.sourceHeight);
				if (parsed) {
					setEntries(parsed);
					setProposals(clusterEvents(parsed, params(), props.clipStartUs ?? 0));
				} else {
					setError(copy().invalidEventLog);
				}
			} catch {
				setError(copy().noEventLog);
			} finally {
				setLoading(false);
			}
		})();
	});

	const handleRecluster = () => {
		const e = entries();
		if (e.length === 0) return;
		setProposals(clusterEvents(e, params(), props.clipStartUs ?? 0));
	};

	const handleApply = (proposal: ZoomProposal) => {
		const keyframes = applyProposal(proposal, params(), props.clipStartUs ?? 0);
		props.onSetKeyframes(props.trackId, props.clipId, keyframes);
		setProposals((prev) =>
			prev.map((p) => (p.id === proposal.id ? { ...p, status: 'applied' } : p))
		);
	};

	const handleSkip = (proposal: ZoomProposal) => {
		setProposals((prev) =>
			prev.map((p) =>
				p.id === proposal.id ? { ...p, status: p.status === 'skipped' ? 'pending' : 'skipped' } : p
			)
		);
	};

	return (
		<section class="inspector-section">
			<h3>{copy().autoZoom}</h3>

			<Show when={!props.sessionEventLogRef}>
				<p class="placeholder-text">{copy().noEventLogHint}</p>
			</Show>

			<Show when={props.sessionEventLogRef}>
				<Show when={loading()}>
					<p class="loading-text">{copy().loadingEventLog}</p>
				</Show>

				<Show when={error()}>
					<p class="error-text">{error()}</p>
				</Show>

				<Show when={!loading() && !error() && entries().length > 0}>
					<div class="autozoom-params">
						<label>
							{copy().windowS}
							<input
								type="number"
								value={params().clusterWindowS}
								onInput={(e) =>
									setParams((p) => ({ ...p, clusterWindowS: Number(e.currentTarget.value) }))
								}
								min={0.5}
								max={30}
								step={0.5}
							/>
						</label>
						<label>
							{copy().distance}
							<input
								type="number"
								value={params().clusterDistanceNorm}
								onInput={(e) =>
									setParams((p) => ({ ...p, clusterDistanceNorm: Number(e.currentTarget.value) }))
								}
								min={0.01}
								max={1}
								step={0.01}
							/>
						</label>
						<label>
							{copy().scale}
							<input
								type="number"
								value={params().zoomScale}
								onInput={(e) =>
									setParams((p) => ({ ...p, zoomScale: Number(e.currentTarget.value) }))
								}
								min={1}
								max={4}
								step={0.1}
							/>
						</label>
						<label>
							{copy().leadInMs}
							<input
								type="number"
								value={params().leadInMs}
								onInput={(e) =>
									setParams((p) => ({ ...p, leadInMs: Number(e.currentTarget.value) }))
								}
								min={0}
								max={5000}
								step={50}
							/>
						</label>
						<label>
							{copy().rampMs}
							<input
								type="number"
								value={params().rampMs}
								onInput={(e) => setParams((p) => ({ ...p, rampMs: Number(e.currentTarget.value) }))}
								min={50}
								max={5000}
								step={50}
							/>
						</label>
						<label>
							{copy().holdMs}
							<input
								type="number"
								value={params().holdMs}
								onInput={(e) => setParams((p) => ({ ...p, holdMs: Number(e.currentTarget.value) }))}
								min={0}
								max={30000}
								step={100}
							/>
						</label>
						<label>
							{copy().mergeMs}
							<input
								type="number"
								value={params().overlapMergeThresholdMs}
								onInput={(e) =>
									setParams((p) => ({
										...p,
										overlapMergeThresholdMs: Number(e.currentTarget.value)
									}))
								}
								min={0}
								max={1000}
								step={10}
							/>
						</label>
					</div>

					<button
						type="button"
						class="recluster-btn"
						aria-label={copy().recluster}
						onClick={handleRecluster}
					>
						{copy().recluster}
					</button>

					<div class="proposal-list">
						<Index each={proposals()}>
							{(proposal, index) => (
								<div class={`proposal-item proposal-item--${proposal().status}`}>
									<span class="proposal-time">{formatTime(proposal().cluster.startUs)}</span>
									<span class="proposal-centroid">
										{(proposal().centroidX * 100).toFixed(0)}% ×{' '}
										{(proposal().centroidY * 100).toFixed(0)}%
									</span>
									<span class="proposal-count">
										{copy().eventsCount.replace('{n}', String(proposal().cluster.eventCount))}
									</span>
									<button
										type="button"
										onClick={() => handleApply(proposal())}
										disabled={proposal().status === 'applied'}
										aria-label={
											proposal().status === 'applied'
												? copy().appliedProposal.replace('{n}', String(index + 1))
												: copy().applyProposal.replace('{n}', String(index + 1))
										}
									>
										{proposal().status === 'applied' ? copy().applied : copy().apply}
									</button>
									<button
										type="button"
										onClick={() => handleSkip(proposal())}
										aria-pressed={proposal().status === 'skipped'}
										aria-label={
											proposal().status === 'skipped'
												? copy().unskipProposal.replace('{n}', String(index + 1))
												: copy().skipProposal.replace('{n}', String(index + 1))
										}
									>
										{proposal().status === 'skipped' ? copy().unskip : copy().skip}
									</button>
								</div>
							)}
						</Index>
					</div>
				</Show>

				<Show when={!loading() && !error() && entries().length === 0}>
					<p class="placeholder-text">{copy().noEvents}</p>
				</Show>
			</Show>
		</section>
	);
}
