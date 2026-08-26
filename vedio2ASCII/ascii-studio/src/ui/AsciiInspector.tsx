import { createEffect, createSignal, onCleanup, For, type JSX } from 'solid-js';
import {
	applyAsciiPreset,
	ASCII_CHARSETS,
	type AsciiCharsetId,
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

const CHARSET_LABELS: Record<AsciiCharsetId, (copy: ReturnType<typeof studioCopy>) => string> = {
	binary: (c) => c.charsetBinary,
	classic: (c) => c.charsetClassic,
	letters: (c) => c.charsetLetters,
	matrix: (c) => c.charsetMatrix,
	symbols: (c) => c.charsetSymbols
};

const CHARSET_COMMIT_MS = 250;

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
	// The charset input is a free-text field that commits debounced. The signal
	// holds what the user is typing; the committed value lives in props. An
	// external change (preset click) syncs the field, but only when it did not
	// originate from this input, so typing is never clobbered by the effect.
	// oxlint-disable-next-line solid/reactivity -- one-shot initial capture; live updates flow through the createEffect below
	const [charsetText, setCharsetText] = createSignal(props.value().charset);
	// oxlint-disable-next-line solid/reactivity -- one-shot initial capture of the last committed value
	let committedCharset = props.value().charset;
	let commitTimer: ReturnType<typeof setTimeout> | null = null;

	createEffect(() => {
		const current = props.value().charset;
		if (current !== committedCharset) {
			committedCharset = current;
			setCharsetText(current);
		}
	});

	function commitCharset(text: string) {
		committedCharset = text;
		props.onChange({ charset: text });
	}

	function scheduleCharsetCommit(text: string) {
		if (commitTimer) clearTimeout(commitTimer);
		commitTimer = setTimeout(() => commitCharset(text), CHARSET_COMMIT_MS);
	}

	onCleanup(() => {
		if (commitTimer) clearTimeout(commitTimer);
	});

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

			<div class="ascii-charset" role="group" aria-label={copy().asciiCharset}>
				<span class="ascii-charset-label">{copy().asciiCharset}</span>
				<div class="ascii-preset-grid">
					<For each={ASCII_CHARSETS}>
						{(charset) => (
							<button
								type="button"
								class="ascii-preset"
								onClick={() => props.onChange({ charset: charset.chars })}
							>
								{CHARSET_LABELS[charset.id](copy())}
							</button>
						)}
					</For>
				</div>
				<input
					class="ascii-charset-input"
					type="text"
					spellcheck={false}
					value={charsetText()}
					placeholder={copy().customCharsetPlaceholder}
					onInput={(event) => {
						const text = event.currentTarget.value;
						setCharsetText(text);
						scheduleCharsetCommit(text);
					}}
					onBlur={() => commitCharset(charsetText())}
				/>
				<p class="ascii-charset-hint">{copy().customCharsetHint}</p>
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
