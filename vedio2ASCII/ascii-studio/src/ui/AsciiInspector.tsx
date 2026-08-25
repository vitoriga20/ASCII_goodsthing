import { For, type JSX } from 'solid-js';
import {
	applyAsciiPreset,
	type AsciiEffectParams,
	type AsciiPresetId
} from '../engine/ascii-effect';

interface AsciiInspectorProps {
	readonly value: () => AsciiEffectParams;
	readonly onChange: (params: Partial<AsciiEffectParams>) => void;
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
	return (
		<section class="ascii-inspector" aria-label="ASCII effect controls">
			<div class="ascii-inspector-heading">
				<div>
					<p class="panel-kicker">ASCII TREATMENT</p>
					<h2>Glyph Transform</h2>
				</div>
				<label class="ascii-switch">
					<input
						type="checkbox"
						checked={props.value().enabled}
						onChange={(event) => props.onChange({ enabled: event.currentTarget.checked })}
					/>
					<span>Enabled</span>
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
							{preset.label}
						</button>
					)}
				</For>
			</div>

			<div class="ascii-fields">
				<RangeField
					label="Density"
					value={props.value().density}
					min={12}
					max={180}
					step={1}
					onInput={(density) => props.onChange({ density })}
				/>
				<RangeField
					label="Glyph scale"
					value={props.value().glyphScale}
					min={0.5}
					max={3}
					step={0.05}
					onInput={(glyphScale) => props.onChange({ glyphScale })}
				/>
				<RangeField
					label="Contrast"
					value={props.value().contrast}
					min={0}
					max={3}
					step={0.05}
					onInput={(contrast) => props.onChange({ contrast })}
				/>
				<RangeField
					label="Edge detail"
					value={props.value().edgeStrength}
					min={0}
					max={1}
					step={0.02}
					onInput={(edgeStrength) => props.onChange({ edgeStrength })}
				/>
			</div>

			<label class="ascii-select-field">
				<span>Colour treatment</span>
				<select
					value={props.value().colourMode}
					onChange={(event) =>
						props.onChange({ colourMode: event.currentTarget.value as AsciiEffectParams['colourMode'] })
					}
				>
					<option value="green">Emerald signal</option>
					<option value="gold">Gold dust</option>
					<option value="original">Keep source colour</option>
					<option value="mono">Classic mono</option>
				</select>
			</label>
		</section>
	);
}
