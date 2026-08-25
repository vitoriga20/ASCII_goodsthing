import { describe, expect, it } from 'vite-plus/test';
import {
	DEFAULT_VOICE_CLEANUP_SETTINGS,
	acknowledgeLivePreviewFrame,
	createLivePreviewBackpressureState,
	getLivePreviewTransferables,
	isLivePreviewFrameCommand,
	scheduleLivePreviewFrame,
	stopLivePreview,
	type WorkerCommand,
	type WorkerStateMessage
} from './protocol';

describe('voice cleanup protocol', () => {
	it('keeps analysis and settings messages structured-clone safe', () => {
		const analyse: WorkerCommand = {
			type: 'voice-cleanup-analyse-loudness',
			targetLufs: -14
		};
		const result: WorkerStateMessage = {
			type: 'voice-cleanup-analysis-result',
			measuredLufs: -20,
			normalisationGainDb: 6,
			normalisedLufs: -14
		};
		const update: WorkerCommand = {
			type: 'voice-cleanup-update-settings',
			settings: {
				...DEFAULT_VOICE_CLEANUP_SETTINGS,
				denoiserEnabledTracks: ['voice-a']
			}
		};

		expect(structuredClone(analyse)).toEqual(analyse);
		expect(structuredClone(result)).toEqual(result);
		expect(structuredClone(update)).toEqual(update);
	});
});
describe('live preview protocol', () => {
	it('keeps one sent frame and one replaceable latest pending frame', () => {
		let state = createLivePreviewBackpressureState('source-a');
		let scheduled = scheduleLivePreviewFrame(state, 'source-a', 1);
		expect(scheduled.disposition).toBe('send');
		state = scheduled.state;
		scheduled = scheduleLivePreviewFrame(state, 'source-a', 2);
		expect(scheduled.disposition).toBe('replace-pending');
		state = scheduled.state;
		scheduled = scheduleLivePreviewFrame(state, 'source-a', 3);
		expect(scheduled).toMatchObject({
			disposition: 'replace-pending',
			state: { inFlightSequence: 1, pendingSequence: 3 }
		});
		const acknowledged = acknowledgeLivePreviewFrame(scheduled.state, 'source-a', 1);
		expect(acknowledged).toMatchObject({
			accepted: true,
			nextSequence: 3,
			state: { inFlightSequence: 3, pendingSequence: null }
		});
	});
});

describe('live preview protocol guards', () => {
  it('rejects stale acknowledgements, duplicate sequences and frames after stop', () => {
    let state = createLivePreviewBackpressureState('source-a');
    state = scheduleLivePreviewFrame(state, 'source-a', 2).state;
    expect(acknowledgeLivePreviewFrame(state, 'source-a', 1).accepted).toBe(false);
    expect(scheduleLivePreviewFrame(state, 'source-a', 2).disposition).toBe('reject');
    state = stopLivePreview(state);
    expect(scheduleLivePreviewFrame(state, 'source-a', 3).disposition).toBe('ignore');
    expect(acknowledgeLivePreviewFrame(state, 'source-a', 2).accepted).toBe(false);
  });

  it('marks frame messages for transfer without cloning their resources', () => {
    const frame = {} as ImageBitmap;
    const command: WorkerCommand = { type: 'live-preview-frame', sourceId: 'source-a', sequence: 4, mediaTimeS: 1.5, frame };
    expect(isLivePreviewFrameCommand(command)).toBe(true);
    expect(isLivePreviewFrameCommand({ type: 'live-preview-frame', sourceId: '', sequence: 1 })).toBe(false);
    expect(getLivePreviewTransferables(command)).toEqual([frame]);
  });

  it('keeps control and HUD state messages structured-clone safe', () => {
    const start: WorkerCommand = { type: 'live-preview-start', sourceId: 'source-a' };
    const stop: WorkerCommand = { type: 'live-preview-stop', sourceId: 'source-a' };
    const ack: WorkerStateMessage = { type: 'live-preview-frame-ack', sourceId: 'source-a', sequence: 2 };
    const state: WorkerStateMessage = { type: 'live-preview-state', mode: 'running', sourceFps: 24, renderFps: 12, droppedFrames: 3, inFlight: 1, lastMediaTimeS: 1.25, lastError: null };
    expect(structuredClone(start)).toEqual(start);
    expect(structuredClone(stop)).toEqual(stop);
    expect(structuredClone(ack)).toEqual(ack);
    expect(structuredClone(state)).toEqual(state);
  });
});
