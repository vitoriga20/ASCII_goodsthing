import { For, type JSX } from 'solid-js';
import {
	applyAsciiPreset,
	type AsciiEffectParams,
	type AsciiPresetId
} from '../engine/ascii-effect';
import { studioCopy, type StudioLocale } from './locale';

interface AsciiInspectorProps {
	readonly value: () => AsciiEffectParams;
	readonly onChange: (params: Partial<AsciiEffectParams>) => void;
	readonly livePreviewEnabled: () => boolean;
	readonly onToggleLivePreview: () => void;
	readonly locale: () => StudioLocale;
}

const PRESETS: ReadonlyArray<{ readonly id: AsciiPresetId; readonly label: string }> = [
	{ id: 'matrix-green', label: 'Matrix Green' },
	{ id: 'gold-dust', label: 'Gold Dust' },
	{ id: 'classic-mono', label: 'Classic Mono' },
	{ id: 'high-detail', label: 'High Detail' }
];

function RangeField(props: {
	readonly label: string;
	readonly value: number;
	readonly min: number;
	readonly max: number;
	readonly step: number;
	readonly onInput: (value: number) => void;
}): JSX.Element {
	return (
		<label class="ascii-field">
			<span>{props.label}</span>
			<output>{props.value.toFixed(props.step < 1 ? 2 : 0)}</output>
			<input
				type="range"
				min={props.min}
				max={props.max}
				step={props.step}
				value={props.value}
				onInput={(event) => props.onInput(Number(event.currentTarget.value))}
			/>
		</label>
	);
}

export function AsciiInspector(props: AsciiInspectorProps): JSX.Element {
	const copy = () => studioCopy(props.locale());
	const presetLabel = (id: AsciiPresetId) =>
		({
			'matrix-green': copy().matrixGreen,
			'gold-dust': copy().goldDust,
			'classic-mono': copy().classicMono,
			'high-detail': copy().highDetail
		})[id];
	return (
		<section class="ascii-inspector" aria-label="ASCII effect controls">
			<div class="ascii-inspector-heading">
				<div>
					<p class="panel-kicker">{copy().asciiTreatment}</p>
					<h2>{copy().glyphTransform}</h2>
				</div>
				<label class="ascii-switch">
					<input
						type="checkbox"
						checked={props.livePreviewEnabled()}
						onChange={() => props.onToggleLivePreview()}
					/>
					<span>{copy().realtimePreview}</span>
				</label>
			</div>

			<div class="ascii-preset-grid" role="group" aria-label="ASCII presets">
				<For each={PRESETS}>
					{(preset) => (
						<button
							type="button"
							class="ascii-preset"
							onClick={() => props.onChange(applyAsciiPreset(preset.id))}
						>
							{presetLabel(preset.id)}
						</button>
					)}
				</For>
			</div>

			<div class="ascii-fields">
				<RangeField
					label={copy().density}
					value={props.value().density}
					min={12}
					max={180}
					step={1}
					onInput={(density) => props.onChange({ density })}
				/>
				<RangeField
					label={copy().glyphScale}
					value={props.value().glyphScale}
					min={0.5}
					max={3}
					step={0.05}
					onInput={(glyphScale) => props.onChange({ glyphScale })}
				/>
				<RangeField
					label={copy().contrast}
					value={props.value().contrast}
					min={0}
					max={3}
					step={0.05}
					onInput={(contrast) => props.onChange({ contrast })}
				/>
				<RangeField
					label={copy().edgeDetail}
					value={props.value().edgeStrength}
					min={0}
					max={1}
					step={0.02}
					onInput={(edgeStrength) => props.onChange({ edgeStrength })}
				/>
			</div>

			<label class="ascii-select-field">
				<span>{copy().colourTreatment}</span>
				<select
					value={props.value().colourMode}
					onChange={(event) =>
						props.onChange({
							colourMode: event.currentTarget.value as AsciiEffectParams['colourMode']
						})
					}
				>
					<option value="green">{copy().emeraldSignal}</option>
					<option value="gold">{copy().goldDust}</option>
					<option value="original">{copy().keepSourceColour}</option>
					<option value="mono">{copy().classicMono}</option>
				</select>
			</label>
		</section>
	);
}
