import type { CapabilityProbeResult, FeatureSupport } from '../protocol';

/** One row in the capability matrix. Kept JSX-free here (separate from
 *  `CapabilityMatrixPanel.tsx`) so the pure row builders are unit-testable in the
 *  node test environment, which has no Solid JSX transform. */
export interface CapabilityRow {
	label: string;
	support: FeatureSupport;
	active: boolean;
	action: string | null;
}

/** Copy tokens consumed by {@link webnnRow}; kept as a narrow interface so the
 *  pure row builders stay JSX-free and unit-testable in node. */
export interface WebnnRowCopy {
	webnnLabel: string;
	webnnActionEnable: string;
	webnnActionEp: string;
}

export function webnnRow(probe: CapabilityProbeResult, copy: WebnnRowCopy): CapabilityRow {
	// Read WebNN from the stored probe snapshot (populated by probeBeauty) like
	// every other row — not a live `navigator.ml` query, so it stays consistent
	// with the snapshot and respects the DEV `__localcutCapabilityOverrides` hook.
	const hasMl = probe.beauty?.webnn === 'supported';
	const ortEp = probe.cleanup?.accelerator;
	return {
		label: copy.webnnLabel,
		support: hasMl ? 'supported' : 'unsupported',
		active: ortEp === 'webnn',
		action: hasMl
			? copy.webnnActionEp.replace('{ep}', ortEp ?? 'wasm')
			: copy.webnnActionEnable
	};
}
