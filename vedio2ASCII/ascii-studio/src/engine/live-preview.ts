import {
	acknowledgeLivePreviewFrame,
	createLivePreviewBackpressureState,
	scheduleLivePreviewFrame,
	stopLivePreview,
	type LivePreviewFrame,
	type LivePreviewFrameAck,
	type LivePreviewStateMessage,
	type WorkerCommand
} from '../protocol';
import { RollingFrameRate } from './rolling-frame-rate';

export { RollingFrameRate } from './rolling-frame-rate';

type VideoFrameCallback = (now: number, metadata: { mediaTime: number }) => void;
type VideoWithFrameCallback = HTMLVideoElement & {
	requestVideoFrameCallback?: (callback: VideoFrameCallback) => number;
	cancelVideoFrameCallback?: (handle: number) => void;
};

export interface LivePreviewDriverOptions {
	send(command: WorkerCommand, transfer?: Transferable[]): void;
	onState(
		state: Pick<
			LivePreviewStateMessage,
			'mode' | 'sourceFps' | 'droppedFrames' | 'inFlight' | 'lastMediaTimeS' | 'lastError'
		>
	): void;
}

function closeFrame(frame: LivePreviewFrame | null): void {
	frame?.close();
}

/** Native-video real-time producer. It never advances the media clock itself. */
export class LivePreviewDriver {
	private readonly video: VideoWithFrameCallback;
	private sourceId: string | null = null;
	private url: string | null = null;
	private callbackHandle: number | null = null;
	private rafHandle: number | null = null;
	private sequence = 0;
	private state = createLivePreviewBackpressureState('');
	private pending: { frame: LivePreviewFrame; sequence: number; mediaTimeS: number } | null = null;
	private droppedFrames = 0;
	private lastMediaTimeS: number | null = null;
	private readonly sourceRate = new RollingFrameRate();

	constructor(private readonly options: LivePreviewDriverOptions) {
		this.video = document.createElement('video') as VideoWithFrameCallback;
		this.video.muted = true;
		this.video.playsInline = true;
		this.video.preload = 'auto';
		this.video.style.display = 'none';
		document.body.append(this.video);
	}

	async start(sourceId: string, file: File, timeS: number, playing: boolean): Promise<void> {
		this.stop();
		this.sourceId = sourceId;
		this.state = createLivePreviewBackpressureState(sourceId);
		this.url = URL.createObjectURL(file);
		this.video.src = this.url;
		await new Promise<void>((resolve, reject) => {
			this.video.addEventListener('loadedmetadata', () => resolve(), { once: true });
			this.video.addEventListener('error', () => reject(new Error('无法加载实时预览视频。')), {
				once: true
			});
		});
		await this.seek(timeS);
		this.options.send({ type: 'live-preview-start', sourceId });
		if (playing) await this.video.play();
		this.schedule();
	}

	async seek(timeS: number): Promise<void> {
		this.cancelCallback();
		if (!Number.isFinite(timeS) || !this.sourceId) return;
		closeFrame(this.pending?.frame ?? null);
		this.pending = null;
		this.video.currentTime = Math.max(0, timeS);
		await new Promise<void>((resolve) =>
			this.video.addEventListener('seeked', () => resolve(), { once: true })
		);
		// Frames captured before the seek are stale: reset the backpressure state
		// machine and sequence so late ACKs from the worker are rejected and the
		// next capture starts a fresh in-flight slot.
		this.state = createLivePreviewBackpressureState(this.sourceId);
		this.sequence = 0;
		if (this.video.paused) {
			// Paused seek: present exactly one frame so the ASCII monitor follows
			// the playhead; the continuous schedule() loop only runs while playing.
			void this.capture(this.video.currentTime, true);
		} else {
			this.schedule();
		}
	}

	async setPlaying(playing: boolean): Promise<void> {
		if (!this.sourceId) return;
		if (playing) await this.video.play();
		else this.video.pause();
		this.schedule();
	}

	handleAck(message: LivePreviewFrameAck): void {
		if (!this.sourceId || message.sourceId !== this.sourceId) return;
		const acknowledged = acknowledgeLivePreviewFrame(
			this.state,
			message.sourceId,
			message.sequence
		);
		if (!acknowledged.accepted) return;
		this.state = acknowledged.state;
		if (acknowledged.nextSequence !== null && this.pending) {
			const pending = this.pending;
			this.pending = null;
			this.sendFrame(pending.frame, pending.sequence, pending.mediaTimeS);
		}
		this.emitState('running');
	}

	stop(): void {
		this.cancelCallback();
		this.video.pause();
		closeFrame(this.pending?.frame ?? null);
		this.pending = null;
		if (this.sourceId) this.options.send({ type: 'live-preview-stop', sourceId: this.sourceId });
		this.state = stopLivePreview(this.state);
		this.sourceId = null;
		if (this.url) URL.revokeObjectURL(this.url);
		this.url = null;
		this.video.removeAttribute('src');
		this.video.load();
	}

	dispose(): void {
		this.stop();
		this.video.remove();
	}

	private schedule(): void {
		this.cancelCallback();
		if (!this.sourceId || this.video.paused || this.video.ended) return;
		if (this.video.requestVideoFrameCallback) {
			this.callbackHandle = this.video.requestVideoFrameCallback((_now, metadata) => {
				this.callbackHandle = null;
				void this.capture(metadata.mediaTime);
				this.schedule();
			});
		} else {
			this.rafHandle = requestAnimationFrame(() => {
				this.rafHandle = null;
				void this.capture(this.video.currentTime);
				this.schedule();
			});
		}
	}

	private async capture(mediaTimeS: number, force = false): Promise<void> {
		if (!this.sourceId || this.video.ended) return;
		if (!force && this.video.paused) return;
		this.lastMediaTimeS = mediaTimeS;
		// A forced capture is a one-shot paused seek, not a frame-rate sample.
		if (!force) this.sourceRate.record(performance.now());
		let frame: LivePreviewFrame;
		try {
			frame =
				typeof VideoFrame === 'function'
					? new VideoFrame(this.video, { timestamp: Math.round(mediaTimeS * 1e6) })
					: await createImageBitmap(this.video);
		} catch (error) {
			this.emitState('error', error instanceof Error ? error.message : String(error));
			return;
		}
		const sequence = this.sequence++;
		const scheduled = scheduleLivePreviewFrame(this.state, this.sourceId, sequence);
		this.state = scheduled.state;
		if (scheduled.disposition === 'send') this.sendFrame(frame, sequence, mediaTimeS);
		else if (scheduled.disposition === 'replace-pending') {
			closeFrame(this.pending?.frame ?? null);
			this.pending = { frame, sequence, mediaTimeS };
			if (scheduled.replacedSequence !== undefined) this.droppedFrames += 1;
		} else {
			closeFrame(frame);
			this.droppedFrames += 1;
		}
		this.emitState('running');
	}

	private sendFrame(frame: LivePreviewFrame, sequence: number, mediaTimeS: number): void {
		if (!this.sourceId) return closeFrame(frame);
		this.options.send(
			{ type: 'live-preview-frame', sourceId: this.sourceId, sequence, mediaTimeS, frame },
			[frame]
		);
	}

	private emitState(mode: LivePreviewStateMessage['mode'], lastError: string | null = null): void {
		this.options.onState({
			mode,
			sourceFps: this.sourceRate.value(performance.now()),
			droppedFrames: this.droppedFrames,
			inFlight: this.state.inFlightSequence === null ? 0 : 1,
			lastMediaTimeS: this.lastMediaTimeS,
			lastError
		});
	}

	private cancelCallback(): void {
		if (this.callbackHandle !== null) this.video.cancelVideoFrameCallback?.(this.callbackHandle);
		if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
		this.callbackHandle = null;
		this.rafHandle = null;
	}
}
