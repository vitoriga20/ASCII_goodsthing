/** Phase 43: Callout tool — toolbar button + placement overlay.
 *
 *  When active, shows a floating kind picker and switches the preview to a
 *  drag-to-place mode. On release, dispatches add-callout.
 */

import { createSignal, Show, For } from 'solid-js';
import { MousePointer2 } from 'lucide-solid';
import type { CalloutKind } from '../protocol';
import { studioCopy, studioLocale } from './locale';

interface CalloutToolProps {
	active: boolean;
	capabilityTier: string;
	onActivate: () => void;
	onDeactivate: () => void;
	onBeginPlacement: (kind: CalloutKind) => void;
}

export function CalloutTool(props: CalloutToolProps) {
	const copy = () => studioCopy(studioLocale());
	const CALLOUT_KINDS: { kind: CalloutKind; label: string }[] = [
		{ kind: 'arrow', label: copy().calloutArrow },
		{ kind: 'box', label: copy().calloutBox },
		{ kind: 'step', label: copy().calloutStep },
		{ kind: 'spotlight', label: copy().calloutSpotlight },
		{ kind: 'blur', label: copy().calloutBlur }
	];
	const [selectedKind, setSelectedKind] = createSignal<CalloutKind>('arrow');
	const [showPicker, setShowPicker] = createSignal(false);

	const isDisabled = () => props.capabilityTier !== 'core-webgpu';

	const handleToolbarClick = () => {
		if (isDisabled()) return;
		if (props.active) {
			props.onDeactivate();
			setShowPicker(false);
		} else {
			props.onActivate();
			setShowPicker(true);
		}
	};

	const handleKindSelect = (kind: CalloutKind) => {
		setSelectedKind(kind);
		setShowPicker(false);
		props.onBeginPlacement(kind);
	};

	return (
		<div class="callout-tool">
			<button
				type="button"
				class={`pipeline-chip pipeline-chip-button ${props.active ? 'is-ok' : ''}`}
				onClick={handleToolbarClick}
				disabled={isDisabled()}
				title={isDisabled() ? copy().requiresWebGPU : copy().calloutTool}
				aria-label={copy().calloutTool}
			>
				<MousePointer2 size={13} aria-hidden="true" />
			</button>

			<Show when={showPicker()}>
				<div
					class="callout-kind-picker"
					role="listbox"
					aria-label={copy().selectCalloutKind}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							setShowPicker(false);
							props.onDeactivate();
						}
					}}
				>
					<For each={CALLOUT_KINDS}>
						{(item) => (
							<button
								type="button"
								role="option"
								aria-selected={selectedKind() === item.kind}
								class={`kind-option ${selectedKind() === item.kind ? 'kind-option--selected' : ''}`}
								onClick={() => handleKindSelect(item.kind)}
							>
								{item.label}
							</button>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
