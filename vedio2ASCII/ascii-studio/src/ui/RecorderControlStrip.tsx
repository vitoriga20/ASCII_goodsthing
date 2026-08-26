import { Pause, Play, Square } from 'lucide-solid';
import { Show } from 'solid-js';
import { studioCopy, studioLocale } from './locale';

export type RecorderStripSession = 'idle' | 'recording' | 'paused' | 'stopping';

interface RecorderControlStripProps {
	session: RecorderStripSession;
	elapsedUs: number;
	pausedUs: number;
	testId: string;
	onPause: () => void;
	onResume: () => void;
	onStop: () => void;
}

function formatTime(us: number): string {
	const totalSeconds = Math.max(0, Math.floor(us / 1_000_000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RecorderControlStrip(props: RecorderControlStripProps) {
	const copy = () => studioCopy(studioLocale());
	return (
		<div
			class="recorder-control-strip"
			data-testid={props.testId}
			aria-label={copy().recorderControls}
		>
			<div class="recorder-control-strip-time">
				<strong>{formatTime(props.elapsedUs)}</strong>
				<span aria-label={copy().pausedLabel}>
					{copy().pausedLabel} {formatTime(props.pausedUs)}
				</span>
			</div>
			<div class="recorder-control-strip-actions">
				<Show when={props.session === 'recording'}>
					<button
						type="button"
						aria-label={copy().pauseRecording}
						title={copy().pauseRecording}
						onClick={() => props.onPause()}
					>
						<Pause size={16} aria-hidden="true" />
					</button>
				</Show>
				<Show when={props.session === 'paused'}>
					<button
						type="button"
						aria-label={copy().resumeRecording}
						title={copy().resumeRecording}
						onClick={() => props.onResume()}
					>
						<Play size={16} aria-hidden="true" />
					</button>
				</Show>
				<button
					type="button"
					aria-label={copy().stopRecording}
					title={copy().stopRecording}
					onClick={() => props.onStop()}
					disabled={props.session === 'stopping'}
				>
					<Square size={15} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
