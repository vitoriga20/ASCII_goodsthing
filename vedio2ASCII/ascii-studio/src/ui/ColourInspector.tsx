/** Colour metadata inspector section — Phase 21.
 *
 *  Read-only display of source colour metadata for the selected clip,
 *  plus any active HDR / gamut warnings.
 */

import { For, createMemo } from 'solid-js';
import type { HDRWarningSnapshot } from '../protocol';
import { studioCopy, studioLocale } from './locale';

export interface ColourInspectorProps {
	primaries: string | null;
	transfer: string | null;
	matrix: string | null;
	origin: string | null;
	fullRange: boolean | null;
	warnings: HDRWarningSnapshot[];
}

export default function ColourInspector(props: ColourInspectorProps) {
	const copy = () => studioCopy(studioLocale());
	const hasMetadata = createMemo(() => props.origin !== null && props.origin !== 'none');
	const hasWarnings = createMemo(() => props.warnings.length > 0);

	return (
		<section class="inspector-section colour-section">
			<h3 class="inspector-heading">{copy().colour}</h3>

			{!hasMetadata() && !hasWarnings() && <p class="colour-none">{copy().noColourMetadata}</p>}

			{hasMetadata() && (
				<dl class="colour-metadata">
					<dt>{copy().origin}</dt>
					<dd>{props.origin}</dd>
					<dt>{copy().primaries}</dt>
					<dd>{props.primaries ?? copy().unknown}</dd>
					<dt>{copy().transfer}</dt>
					<dd>{props.transfer ?? copy().unknown}</dd>
					<dt>{copy().matrix}</dt>
					<dd>{props.matrix ?? copy().unknown}</dd>
					<dt>{copy().range}</dt>
					<dd>{props.fullRange ? copy().full : copy().limited}</dd>
				</dl>
			)}

			{hasWarnings() && (
				<ul class="colour-warnings">
					<For each={props.warnings}>
						{(w) => (
							<li
								class={`colour-warning colour-warning--${w.type === 'hdr-content-detected' ? 'amber' : 'red'}`}
							>
								{w.message}
							</li>
						)}
					</For>
				</ul>
			)}
		</section>
	);
}
