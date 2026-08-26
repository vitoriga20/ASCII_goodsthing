import { Show } from 'solid-js';
import {
	ChevronDown,
	ChevronUp,
	Eye,
	EyeOff,
	Film,
	Headphones,
	Link2,
	Lock,
	Music2,
	Target,
	Trash2,
	Unlock,
	VolumeX
} from 'lucide-solid';
import { type TimelineTrackSnapshot as ProtocolTimelineTrack } from '../protocol';
import { studioCopy, studioLocale } from './locale';

interface TimelineTrackProps {
	track: ProtocolTimelineTrack;
	index: number;
	trackCount: number;
	onRemove: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onSetLock: (locked: boolean) => void;
	onSetVisible: (visible: boolean) => void;
	onSetSyncLock: (syncLocked: boolean) => void;
	onSetEditTarget: (editTarget: boolean) => void;
}

/** Track label + management controls (reorder / remove) for timeline mirror models. */
export function TimelineTrack(props: TimelineTrackProps) {
	const copy = () => studioCopy(studioLocale());
	return (
		<div class="track-label">
			<span class="track-label-main">
				{props.track.type === 'video' ? (
					<Film size={13} aria-hidden="true" />
				) : (
					<Music2 size={13} aria-hidden="true" />
				)}
				<span>{props.track.id}</span>
			</span>
			<span class="track-label-meta">
				{copy().clipCount.replace('{n}', String(props.track.clips.length))}
			</span>
			<Show when={props.track.solo || props.track.muted}>
				<span class="track-badges">
					{props.track.solo ? (
						<span class="track-badge">
							<Headphones size={11} aria-hidden="true" />
							{copy().solo}
						</span>
					) : null}
					{props.track.muted ? (
						<span class="track-badge is-muted">
							<VolumeX size={11} aria-hidden="true" />
							{copy().muted}
						</span>
					) : null}
				</span>
			</Show>
			<span class="track-controls">
				<button
					type="button"
					class={`track-control-button${props.track.locked ? ' is-active' : ''}`}
					onClick={() => props.onSetLock(!props.track.locked)}
					aria-label={`${props.track.locked ? copy().unlockX : copy().lockX}`.replace(
						'{x}',
						props.track.id
					)}
					aria-pressed={props.track.locked}
					title={props.track.locked ? copy().unlockTrack : copy().lockTrack}
				>
					{props.track.locked ? (
						<Lock size={12} aria-hidden="true" />
					) : (
						<Unlock size={12} aria-hidden="true" />
					)}
				</button>
				<button
					type="button"
					class={`track-control-button${!props.track.visible ? ' is-active' : ''}`}
					onClick={() => props.onSetVisible(!props.track.visible)}
					aria-label={`${props.track.visible ? copy().hideX : copy().showX}`.replace(
						'{x}',
						props.track.id
					)}
					aria-pressed={!props.track.visible}
					title={props.track.visible ? copy().hideTrack : copy().showTrack}
				>
					{props.track.visible ? (
						<Eye size={12} aria-hidden="true" />
					) : (
						<EyeOff size={12} aria-hidden="true" />
					)}
				</button>
				<button
					type="button"
					class={`track-control-button${props.track.syncLocked ? ' is-active' : ''}`}
					onClick={() => props.onSetSyncLock(!props.track.syncLocked)}
					aria-label={`${props.track.syncLocked ? copy().unsyncX : copy().syncLockX}`.replace(
						'{x}',
						props.track.id
					)}
					aria-pressed={props.track.syncLocked}
					title={props.track.syncLocked ? copy().disableSyncLock : copy().enableSyncLock}
				>
					<Link2 size={12} aria-hidden="true" />
				</button>
				<button
					type="button"
					class={`track-control-button${props.track.editTarget ? ' is-active' : ''}`}
					onClick={() => props.onSetEditTarget(!props.track.editTarget)}
					aria-label={`${props.track.editTarget ? copy().untargetX : copy().targetX}`.replace(
						'{x}',
						props.track.id
					)}
					aria-pressed={props.track.editTarget}
					title={props.track.editTarget ? copy().disableEditTarget : copy().enableEditTarget}
				>
					<Target size={12} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="track-control-button"
					onClick={() => props.onMoveUp()}
					disabled={props.index === 0}
					aria-label={copy().moveXUp.replace('{x}', props.track.id)}
					title={copy().moveTrackUp}
				>
					<ChevronUp size={12} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="track-control-button"
					onClick={() => props.onMoveDown()}
					disabled={props.index >= props.trackCount - 1}
					aria-label={copy().moveXDown.replace('{x}', props.track.id)}
					title={copy().moveTrackDown}
				>
					<ChevronDown size={12} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="track-control-button is-danger"
					onClick={() => props.onRemove()}
					aria-label={copy().removeX.replace('{x}', props.track.id)}
					title={copy().removeTrack}
				>
					<Trash2 size={12} aria-hidden="true" />
				</button>
			</span>
		</div>
	);
}
