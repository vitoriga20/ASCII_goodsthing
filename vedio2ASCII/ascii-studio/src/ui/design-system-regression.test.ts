import { describe, expect, it } from 'vite-plus/test';
import appSource from './App.tsx?raw';
import diagnosticsSource from './DiagnosticsPanel.tsx?raw';
import liveAudioChainSource from './LiveAudioChainPanel.tsx?raw';
import { audioEn } from './locales/audio';
import { miscEn } from './locales/misc';

describe('design-system and chrome regression guards', () => {
	it('keeps Replay before Record in the Capture composition', () => {
		const capturePanel = appSource.indexOf('class="capture-record-rail-panel"');
		const replay = appSource.indexOf('<ReplayBufferPanel', capturePanel);
		const record = appSource.indexOf('<RecordPanel', capturePanel);
		expect(capturePanel).toBeGreaterThan(0);
		expect(replay).toBeGreaterThan(capturePanel);
		expect(record).toBeGreaterThan(replay);
	});

	it('uses runtime-honest diagnostics and recording-path audio guidance', () => {
		// Copy moved into the locale dictionaries during i18n; these guards keep
		// the honest wording from regressing regardless of locale.
		expect(miscEn.noRecoveryActions).toBe(
			'No recovery actions are available for this report.'
		);
		expect(diagnosticsSource).not.toContain('All diagnostics passed — no issues detected');
		expect(audioEn.configureBeforeRecording).toBe('Configure before recording');
		expect(audioEn.chainEmptyNote).toContain('live monitoring stays unprocessed');
		expect(liveAudioChainSource).not.toContain('run on the monitor path');
	});
});
