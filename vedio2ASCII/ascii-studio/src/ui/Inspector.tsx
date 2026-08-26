import { Show, For, createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js';
import { ChevronLeft, ChevronRight, Diamond, RotateCcw, Upload } from 'lucide-solid';
import { DEFAULT_BEAUTY_EFFECT, DEFAULT_SKIN_MASK } from '../protocol';
import type {
	BeautyEffectSnapshot,
	BeautyModelStatus,
	ClipEffectParamsSnapshot,
	ClipKeyframeParamSnapshot,
	ClipKeyframesSnapshot,
	ClipLutSnapshot,
	CalloutPayload,
	CapabilityTierV2,
	FitModeSnapshot,
	KeyframeEasingSnapshot,
	MediaAssetSnapshot,
	MediaMetadata,
	PaddedBackgroundParams,
	SessionEventLogRef,
	SkinMaskSnapshot,
	TitleAlignSnapshot,
	TitleContentSnapshot,
	TitleStyleSnapshot,
	TimeRemapKeyframeSnapshot,
	TimeRemapSnapshot,
	TransformParamsSnapshot
} from '../protocol';
import { clipLocalTime, hasKeyframeTrack, keyframeAt, sortedKeyframes } from './keyframes';
import { ZoomPresetPanel } from './ZoomPresetPanel';
import { AutoZoomPanel } from './AutoZoomPanel';
import { CalloutInspector } from './CalloutInspector';
import { studioCopy, studioLocale } from './locale';
import { RailEmpty } from './RailEmpty';
import { PaddedBackgroundPanel } from './PaddedBackgroundPanel';

export interface SelectedTitle {
	trackId: string;
	clipId: string;
	title: TitleContentSnapshot;
}

export interface SelectedClip {
	trackId: string;
	clipId: string;
	kind?: import('../protocol').ClipKindSnapshot;
	sourceId?: string;
	sourceWidth?: number;
	sourceHeight?: number;
	start: number;
	inPoint?: number;
	duration: number;
	effects: ClipEffectParamsSnapshot;
	transform: TransformParamsSnapshot;
	keyframes?: ClipKeyframesSnapshot;
	lut?: ClipLutSnapshot;
	skinMask?: SkinMaskSnapshot;
	/** Phase 31: optional portrait matte configuration. */
	matte?: import('../protocol').ClipMatteSnapshot;
	/** Phase 35: optional time-remap speed curve. */
	timeRemap?: import('../protocol').TimeRemapSnapshot;
	/** Phase 32b: optional landmark-driven beauty configuration. */
	beauty?: BeautyEffectSnapshot;
	/** Phase 42: origin capture session id for retake detection. */
	captureSessionId?: string;
	callout?: CalloutPayload;
	paddedBackground?: PaddedBackgroundParams;
}

export interface SelectedClipTransform {
	trackId: string;
	clipId: string;
	transform: TransformParamsSnapshot;
}

export interface SelectedTrackMix {
	trackId: string;
	gain: number;
	pan: number;
	muted: boolean;
	solo: boolean;
}

export interface SelectedClipFades {
	trackId: string;
	clipId: string;
	duration: number;
	audioFadeIn: number;
	audioFadeOut: number;
}

/** Phase 13: selected transition metadata for the Inspector panel. */
export interface SelectedTransition {
	transitionId: string;
	trackId: string;
	fromClipId: string;
	toClipId: string;
	durationS: number;
	/** Maximum achievable duration in seconds based on source clip headroom. */
	maxDurationS?: number;
	kind: import('../protocol').TransitionKindSnapshot;
}

interface InspectorProps {
	metadata: MediaMetadata | null;
	selectedClip: SelectedClip | null;
	selectedTrackMix: SelectedTrackMix | null;
	selectedClipFades: SelectedClipFades | null;
	selectedClipTransform: SelectedClipTransform | null;
	selectedTitle: SelectedTitle | null;
	/** Phase 13: selected transition data. */
	selectedTransition: SelectedTransition | null;
	capabilityTier?: CapabilityTierV2;
	sessionEventLogs?: readonly SessionEventLogRef[];
	mediaAssets?: readonly MediaAssetSnapshot[];
	onPickPreviewRegion?: (onPick: (x: number, y: number) => void) => void;
	playheadTime: number;
	onSetTitle: (
		trackId: string,
		clipId: string,
		patch: { text?: string; style?: Partial<TitleStyleSnapshot> }
	) => void;
	onEffectParam: (
		trackId: string,
		clipId: string,
		key: keyof ClipEffectParamsSnapshot,
		value: number
	) => void;
	onTransform: (
		trackId: string,
		clipId: string,
		transform: Partial<TransformParamsSnapshot>
	) => void;
	onSeek: (time: number) => void;
	onSetKeyframe: (
		trackId: string,
		clipId: string,
		key: ClipKeyframeParamSnapshot,
		t: number,
		value: number,
		easing: KeyframeEasingSnapshot
	) => void;
	onDeleteKeyframe: (
		trackId: string,
		clipId: string,
		key: ClipKeyframeParamSnapshot,
		t: number
	) => void;
	onReplaceKeyframeTracks?: (
		trackId: string,
		clipId: string,
		tracks: ClipKeyframesSnapshot
	) => void;
	onSetCallout?: (trackId: string, clipId: string, payload: CalloutPayload) => void;
	onSetPaddedBackground?: (
		trackId: string,
		clipId: string,
		params: PaddedBackgroundParams | null
	) => void;
	onImportLut: (trackId: string, clipId: string, file: File) => void;
	onLutStrength: (trackId: string, clipId: string, strength: number) => void;
	/** Phase 31: portrait matte callbacks. */
	onSetMatteEnabled?: (enabled: boolean) => void;
	onSetMatteStrength?: (strength: number) => void;
	onSetMatteMode?: (mode: import('../protocol').MatteMode) => void;
	onSetMatteBlurRadius?: (blurRadius: number) => void;
	/** Phase 31: matte engine status (posted by the pipeline worker). */
	matteStatus?: import('../protocol').MatteEngineStatusSnapshot | null;
	onTrackGain: (trackId: string, gain: number) => void;
	onTrackMute: (trackId: string, muted: boolean) => void;
	onTrackSolo: (trackId: string, solo: boolean) => void;
	onTrackPan: (trackId: string, pan: number) => void;
	onClipFade: (trackId: string, clipId: string, edge: 'in' | 'out', durationS: number) => void;
	/** Phase 13: transition editing callbacks. */
	onTransitionKind?: (
		transitionId: string,
		kind: import('../protocol').TransitionKindSnapshot
	) => void;
	onTransitionDuration?: (transitionId: string, durationS: number) => void;
	onRemoveTransition?: (transitionId: string) => void;
	/** Phase 32a: skin-mask sidecar editing. */
	onSkinMask?: (trackId: string, clipId: string, mask: SkinMaskSnapshot) => void;
	/** Phase 32a: session-only A/B bypass toggle. */
	onSkinSmoothBypass?: (trackId: string, clipId: string, bypass: boolean) => void;
	/** Phase 35: time-remap callbacks. */
	onSetTimeRemap?: (trackId: string, clipId: string, remap: TimeRemapSnapshot) => void;
	onClearTimeRemap?: (trackId: string, clipId: string) => void;
	/** Phase 38a: look preset callbacks. */
	onImportLookPreset?: (trackId: string, clipId: string, presetFile: File, lutFile?: File) => void;
	onExportLookPreset?: (trackId: string, clipId: string) => void;
	/** Phase 32b: beauty effect editing. */
	onBeautyEffect?: (trackId: string, clipId: string, beauty: Partial<BeautyEffectSnapshot>) => void;
	/** Phase 32b: whether the browser can run the accelerated beauty path (WebGPU + COI). */
	beautyAvailable?: boolean;
	/** Phase 32b: on-device beauty model load status. */
	beautyModelStatus?: BeautyModelStatus;
	/** Phase 32b: total beauty model download size in bytes (from the manifest). */
	beautyModelSizeBytes?: number;
	/** Phase 32b: bytes downloaded so far while loading. */
	beautyModelDownloadedBytes?: number;
	/** Phase 32b: clear, non-alarming reason the model is unavailable/failed. */
	beautyModelError?: string;
	/** Phase 32b: request an on-device beauty model download (explicit user action). */
	onLoadBeautyModel?: () => void;
	/** Phase 42: opens the Record panel in retake mode for the selected clip. */
	onRetakeRequested?: (clipId: string) => void;
	recorderSessionState?: 'idle' | 'armed' | 'recording' | 'paused' | 'stopping';
	/**
	 * Phase 32a: whether the active preview tier supports the WebGPU skin-smooth
	 * compute chain. When false, the strength slider is disabled and a note
	 * explains why; without this gate, users can drag the slider, see no preview
	 * change, and export with their changes silently dropped.
	 */
	previewTierSupportsSkinSmooth?: boolean;
}

type TransformSliderKey = 'x' | 'y' | 'scale' | 'rotation' | 'opacity';

interface TransformSliderSpec {
	key: TransformSliderKey;
	label: string;
	min: number;
	max: number;
	step: number;
	format: (value: number) => string;
}

function coerceTimeRemapEasing(value: string): TimeRemapKeyframeSnapshot['easing'] {
	return value === 'ease' || value === 'hold' ? value : 'linear';
}

type TitleNumberKey =
	| 'fontSizePx'
	| 'backgroundOpacity'
	| 'outlineWidthPx'
	| 'shadowBlurPx'
	| 'shadowOffsetXPx'
	| 'shadowOffsetYPx';
type TitleColorKey = 'color' | 'backgroundColor' | 'outlineColor' | 'shadowColor';

interface TitleSliderSpec {
	key: TitleNumberKey;
	label: string;
	min: number;
	max: number;
	step: number;
	format: (value: number) => string;
}

const PARAM_DEBOUNCE_MS = 80;

interface SliderSpec {
	key: keyof ClipEffectParamsSnapshot;
	label: string;
	min: number;
	max: number;
	step: number;
	format: (value: number) => string;
}

interface SkinMaskSliderSpec {
	key: keyof SkinMaskSnapshot;
	label: string;
	min: number;
	max: number;
	step: number;
	format: (v: number) => string;
}

const SKIN_SMOOTH_NATURAL_MAX = 0.45;

type MixDraft = Pick<SelectedTrackMix, 'gain' | 'pan'>;
type FadeDraft = Pick<SelectedClipFades, 'audioFadeIn' | 'audioFadeOut'>;
type TransformDraft = TransformParamsSnapshot;

export function Inspector(props: InspectorProps) {
	const copy = () => studioCopy(studioLocale());
	// Slider / option specs are built inside the component so every label follows
	// the active locale (these were module-level English constants originally).
	const TRANSFORM_SLIDERS: TransformSliderSpec[] = [
		{
			key: 'x',
			label: copy().positionX,
			min: -1,
			max: 1,
			step: 0.005,
			format: (v) => v.toFixed(3)
		},
		{
			key: 'y',
			label: copy().positionY,
			min: -1,
			max: 1,
			step: 0.005,
			format: (v) => v.toFixed(3)
		},
		{
			key: 'scale',
			label: copy().scale,
			min: 0.1,
			max: 3,
			step: 0.01,
			format: (v) => `${v.toFixed(2)}×`
		},
		{
			key: 'rotation',
			label: copy().rotation,
			min: -180,
			max: 180,
			step: 1,
			format: (v) => `${Math.round(v)}°`
		},
		{
			key: 'opacity',
			label: copy().opacity,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		}
	];
	const FIT_OPTIONS: { value: FitModeSnapshot; label: string }[] = [
		{ value: 'fill', label: copy().fill },
		{ value: 'fit', label: copy().fit },
		{ value: 'letterbox', label: copy().letterbox }
	];
	const TIME_REMAP_EASING_OPTIONS: {
		value: TimeRemapKeyframeSnapshot['easing'];
		label: string;
	}[] = [
		{ value: 'linear', label: copy().easingLinear },
		{ value: 'ease', label: copy().easingEase },
		{ value: 'hold', label: copy().easingHold }
	];
	const TITLE_SLIDERS: TitleSliderSpec[] = [
		{
			key: 'fontSizePx',
			label: copy().fontSize,
			min: 8,
			max: 256,
			step: 1,
			format: (v) => `${Math.round(v)} px`
		},
		{
			key: 'backgroundOpacity',
			label: copy().background,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'outlineWidthPx',
			label: copy().outline,
			min: 0,
			max: 32,
			step: 0.5,
			format: (v) => `${v.toFixed(1)} px`
		},
		{
			key: 'shadowBlurPx',
			label: copy().shadowBlur,
			min: 0,
			max: 64,
			step: 1,
			format: (v) => `${Math.round(v)} px`
		},
		{
			key: 'shadowOffsetXPx',
			label: copy().shadowX,
			min: -64,
			max: 64,
			step: 1,
			format: (v) => `${Math.round(v)} px`
		},
		{
			key: 'shadowOffsetYPx',
			label: copy().shadowY,
			min: -64,
			max: 64,
			step: 1,
			format: (v) => `${Math.round(v)} px`
		}
	];
	const TITLE_COLORS: { key: TitleColorKey; label: string }[] = [
		{ key: 'color', label: copy().text },
		{ key: 'backgroundColor', label: copy().background },
		{ key: 'outlineColor', label: copy().outline },
		{ key: 'shadowColor', label: copy().shadow }
	];
	const TITLE_ALIGN_OPTIONS: { value: TitleAlignSnapshot; label: string }[] = [
		{ value: 'left', label: copy().alignLeft },
		{ value: 'center', label: copy().alignCenter },
		{ value: 'right', label: copy().alignRight }
	];
	const SLIDERS: SliderSpec[] = [
		{
			key: 'brightness',
			label: copy().brightness,
			min: -1,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'contrast',
			label: copy().contrast,
			min: 0,
			max: 2,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'saturation',
			label: copy().saturation,
			min: 0,
			max: 2,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'temperature',
			label: copy().temperature,
			min: 2000,
			max: 10000,
			step: 50,
			format: (v) => `${Math.round(v)} K`
		},
		{
			key: 'temperatureStrength',
			label: copy().tempStrength,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		}
	];
	const SKIN_SMOOTH_STRENGTH_SLIDER: SliderSpec = {
		key: 'skinSmoothStrength',
		label: copy().strength,
		min: 0,
		max: 1,
		step: 0.01,
		format: (v) => v.toFixed(2)
	};
	const LUT_STRENGTH_SLIDER: SliderSpec = {
		key: 'lutStrength',
		label: copy().strength,
		min: 0,
		max: 1,
		step: 0.01,
		format: (v) => v.toFixed(2)
	};
	const LOOK_SLIDERS: SliderSpec[] = [
		{
			key: 'grainStrength',
			label: copy().grainStrength,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'grainSize',
			label: copy().grainSize,
			min: 0.5,
			max: 4.0,
			step: 0.1,
			format: (v) => v.toFixed(1)
		},
		{
			key: 'halationThreshold',
			label: copy().halationThreshold,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'halationRadius',
			label: copy().halationRadius,
			min: 0,
			max: 64,
			step: 1,
			format: (v) => `${Math.round(v)}px`
		},
		{
			key: 'halationTintR',
			label: copy().tintR,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'halationTintG',
			label: copy().tintG,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'halationTintB',
			label: copy().tintB,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'vignetteAmount',
			label: copy().vignetteAmount,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'vignetteFeather',
			label: copy().vignetteFeather,
			min: 0,
			max: 1,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'vignetteRoundness',
			label: copy().vignetteRoundness,
			min: 0,
			max: 2,
			step: 0.01,
			format: (v) => v.toFixed(2)
		}
	];
	const SKIN_MASK_SLIDERS: SkinMaskSliderSpec[] = [
		{
			key: 'cbMin',
			label: copy().cbMin,
			min: -0.5,
			max: 0.5,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'cbMax',
			label: copy().cbMax,
			min: -0.5,
			max: 0.5,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'crMin',
			label: copy().crMin,
			min: -0.5,
			max: 0.5,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'crMax',
			label: copy().crMax,
			min: -0.5,
			max: 0.5,
			step: 0.01,
			format: (v) => v.toFixed(2)
		},
		{
			key: 'softness',
			label: copy().softness,
			min: 0.005,
			max: 0.15,
			step: 0.005,
			format: (v) => v.toFixed(3)
		}
	];
	// Localized keyframe navigation aria templates.
	const keyframeAria = {
		previous: (label: string) => copy().prevKeyframe.replace('{label}', label),
		toggle: (label: string) => copy().toggleKeyframe.replace('{label}', label),
		next: (label: string) => copy().nextKeyframe.replace('{label}', label)
	};
	const [draft, setDraft] = createSignal<ClipEffectParamsSnapshot | null>(null);
	const [mixDraft, setMixDraft] = createSignal<MixDraft | null>(null);
	const [fadeDraft, setFadeDraft] = createSignal<FadeDraft | null>(null);
	const [transformDraft, setTransformDraft] = createSignal<TransformDraft | null>(null);
	const [titleDraft, setTitleDraft] = createSignal<TitleContentSnapshot | null>(null);
	const titleTarget = { trackId: '', clipId: '' };
	let titleTimer: ReturnType<typeof setTimeout> | undefined;
	let titlePatch: { text?: string; style?: Partial<TitleStyleSnapshot> } = {};
	const transformPending = new Map<TransformSliderKey, number>();
	const transformDebouncers = new Map<TransformSliderKey, ReturnType<typeof setTimeout>>();
	const transformTarget = { trackId: '', clipId: '' };
	const pending = new Map<keyof ClipEffectParamsSnapshot, number>();
	const debouncers = new Map<keyof ClipEffectParamsSnapshot, ReturnType<typeof setTimeout>>();
	const keyframeTimes = new Map<ClipKeyframeParamSnapshot, number>();
	const mixPending = new Map<keyof MixDraft, number>();
	const mixDebouncers = new Map<keyof MixDraft, ReturnType<typeof setTimeout>>();
	const fadePending = new Map<keyof FadeDraft, number>();
	const fadeDebouncers = new Map<keyof FadeDraft, ReturnType<typeof setTimeout>>();
	const pendingTarget = { trackId: '', clipId: '' };
	const mixTarget = { trackId: '' };
	const fadeTarget = { trackId: '', clipId: '' };
	let lutInput: HTMLInputElement | undefined;
	let lookPresetInput: HTMLInputElement | undefined;

	const [skinSmoothBypass, setSkinSmoothBypass] = createSignal(false);
	// Bypass is a per-clip preview toggle; reset it whenever the selected clip
	// changes so an A/B from one clip doesn't leak into the next clip's view.
	createEffect(
		on(
			() => props.selectedClip?.clipId,
			() => setSkinSmoothBypass(false),
			{ defer: true }
		)
	);
	const skinMaskPending = new Map<string, number>();
	const skinMaskDebouncers = new Map<string, ReturnType<typeof setTimeout>>();
	const skinMaskTarget = { trackId: '', clipId: '' };
	const skinSmoothStrength = createMemo(
		() => draft()?.skinSmoothStrength ?? props.selectedClip?.effects.skinSmoothStrength ?? 0
	);
	const skinSmoothKeyframed = createMemo(() =>
		Boolean(props.selectedClip?.keyframes?.skinSmoothStrength?.length)
	);
	const skinMaskControlsEnabled = createMemo(
		() => skinSmoothStrength() > 0 || skinSmoothKeyframed()
	);
	const skinSmoothIsStrong = createMemo(() => skinSmoothStrength() > SKIN_SMOOTH_NATURAL_MAX);
	const skinSmoothStatus = createMemo(() => {
		if (skinSmoothIsStrong()) return copy().skinSmoothStatusStrong;
		if (skinSmoothStrength() > 0) return copy().skinSmoothStatusPreview;
		if (skinSmoothKeyframed()) return copy().skinSmoothStatusKeyframed;
		return copy().skinSmoothStatusInactive;
	});
	const skinSmoothNote = createMemo(() => {
		if (!skinMaskControlsEnabled()) return copy().skinSmoothNoteRaise;
		if (skinSmoothIsStrong()) {
			return copy().skinSmoothNoteHigh;
		}
		if (skinSmoothKeyframed() && skinSmoothStrength() === 0) {
			return copy().skinSmoothNoteKeyframed;
		}
		return copy().skinSmoothNoteNatural;
	});

	const lookNeutral = createMemo(() => {
		const e = draft() ?? props.selectedClip?.effects;
		if (!e) return true;
		return (
			e.grainStrength === 0 &&
			e.grainSize === 1.0 &&
			e.halationThreshold === 0.75 &&
			e.halationRadius === 0 &&
			e.halationTintR === 1.0 &&
			e.halationTintG === 0.3 &&
			e.halationTintB === 0.1 &&
			e.vignetteAmount === 0 &&
			e.vignetteFeather === 0.5 &&
			e.vignetteRoundness === 1.0
		);
	});

	function currentSkinMask() {
		const clip = props.selectedClip;
		const mask = clip?.skinMask;
		return {
			cbMin: mask?.cbMin ?? DEFAULT_SKIN_MASK.cbMin,
			cbMax: mask?.cbMax ?? DEFAULT_SKIN_MASK.cbMax,
			crMin: mask?.crMin ?? DEFAULT_SKIN_MASK.crMin,
			crMax: mask?.crMax ?? DEFAULT_SKIN_MASK.crMax,
			softness: mask?.softness ?? DEFAULT_SKIN_MASK.softness
		};
	}

	type SkinMaskDraft = ReturnType<typeof currentSkinMask>;
	let skinMaskDraft: SkinMaskDraft | null = null;
	let skinMaskDraftClipId: string | null = null;

	function cloneCurrentSkinMask(): SkinMaskDraft {
		return { ...currentSkinMask() };
	}

	function resetSkinMaskDraft(): void {
		skinMaskDraft = null;
		skinMaskDraftClipId = null;
	}

	function resetSkinMaskDraftIfIdle(): void {
		if (skinMaskPending.size === 0 && skinMaskDebouncers.size === 0) {
			resetSkinMaskDraft();
		}
	}

	createEffect(on(() => props.selectedClip?.skinMask, resetSkinMaskDraftIfIdle, { defer: true }));

	function getSkinMaskDraft() {
		const clip = props.selectedClip;
		if (!clip) {
			resetSkinMaskDraft();
			return null;
		}
		if (skinMaskDraftClipId !== clip.clipId) {
			skinMaskDraft = cloneCurrentSkinMask();
			skinMaskDraftClipId = clip.clipId;
		} else if (!skinMaskDraft) {
			skinMaskDraft = cloneCurrentSkinMask();
		}
		return skinMaskDraft;
	}

	function flushSkinMaskPending() {
		if (!skinMaskTarget.clipId || skinMaskPending.size === 0) return;
		for (const handle of skinMaskDebouncers.values()) clearTimeout(handle);
		skinMaskDebouncers.clear();
		const mask =
			skinMaskDraft && skinMaskDraftClipId === skinMaskTarget.clipId
				? skinMaskDraft
				: getSkinMaskDraft();
		if (!mask) return;
		for (const [k, v] of skinMaskPending) mask[k as keyof typeof mask] = v;
		skinMaskPending.clear();
		props.onSkinMask?.(skinMaskTarget.trackId, skinMaskTarget.clipId, {
			cbMin: mask.cbMin,
			cbMax: mask.cbMax,
			crMin: mask.crMin,
			crMax: mask.crMax,
			softness: mask.softness
		});
	}

	function scheduleSkinMaskParam(key: string, value: number) {
		const clip = props.selectedClip;
		if (!clip || !props.onSkinMask) return;
		if (!skinMaskControlsEnabled()) return;
		skinMaskTarget.trackId = clip.trackId;
		skinMaskTarget.clipId = clip.clipId;
		skinMaskPending.set(key, value);
		const existing = skinMaskDebouncers.get(key);
		if (existing) clearTimeout(existing);
		const base = getSkinMaskDraft();
		if (!base) return;
		skinMaskDebouncers.set(
			key,
			setTimeout(() => {
				skinMaskDebouncers.delete(key);
				for (const [k, v] of skinMaskPending) base[k as keyof typeof base] = v;
				skinMaskPending.clear();
				for (const [, timer] of skinMaskDebouncers) clearTimeout(timer);
				skinMaskDebouncers.clear();
				props.onSkinMask!(skinMaskTarget.trackId, skinMaskTarget.clipId, {
					cbMin: base.cbMin,
					cbMax: base.cbMax,
					crMin: base.crMin,
					crMax: base.crMax,
					softness: base.softness
				});
			}, PARAM_DEBOUNCE_MS)
		);
	}

	function currentLocalTime(): number | null {
		const clip = props.selectedClip;
		return clip ? clipLocalTime(clip, props.playheadTime) : null;
	}

	function shouldEditKeyframe(key: ClipKeyframeParamSnapshot): boolean {
		const clip = props.selectedClip;
		return Boolean(clip && currentLocalTime() !== null && hasKeyframeTrack(clip.keyframes, key));
	}

	function hasKeyframeAtPlayhead(key: ClipKeyframeParamSnapshot): boolean {
		const clip = props.selectedClip;
		return Boolean(clip && keyframeAt(clip.keyframes?.[key], currentLocalTime()));
	}

	function toggleKeyframe(key: ClipKeyframeParamSnapshot, value: number): void {
		const clip = props.selectedClip;
		if (!clip) return;
		if (currentLocalTime() === null) return;
		if (hasKeyframeAtPlayhead(key)) {
			props.onDeleteKeyframe(clip.trackId, clip.clipId, key, props.playheadTime);
		} else {
			props.onSetKeyframe(clip.trackId, clip.clipId, key, props.playheadTime, value, 'linear');
		}
	}

	function seekKeyframe(key: ClipKeyframeParamSnapshot, direction: -1 | 1): void {
		const clip = props.selectedClip;
		if (!clip) return;
		const localTime = currentLocalTime();
		if (localTime === null) return;
		const frames = sortedKeyframes(clip.keyframes?.[key]);
		const next =
			direction < 0
				? [...frames].reverse().find((frame) => frame.t < localTime - 1e-3)
				: frames.find((frame) => frame.t > localTime + 1e-3);
		if (next) props.onSeek(clip.start + next.t);
	}

	// Phase 32b: beauty model-state labels (the editing controls only render once a
	// model is loaded, so the panel never presents a no-op effect — R1.3/R7.1).
	const beautyModelStateLabel = (): string => {
		switch (props.beautyModelStatus) {
			case 'loading':
				return copy().loading;
			case 'failed':
				return copy().unavailable;
			case 'loaded':
				return copy().ready;
			default:
				return copy().loadRequired;
		}
	};
	const beautyModelSizeLabel = (): string => {
		const bytes = props.beautyModelSizeBytes;
		if (!bytes || bytes <= 0) return '';
		const mb = bytes / (1024 * 1024);
		return mb >= 1 ? ` (${mb.toFixed(1)} MB)` : ` (${Math.max(1, Math.round(bytes / 1024))} KB)`;
	};

	function handleLutFile(file: File | undefined): void {
		const clip = props.selectedClip;
		if (!clip || !file) return;
		props.onImportLut(clip.trackId, clip.clipId, file);
	}

	function flushPending() {
		if (!pendingTarget.clipId || pending.size === 0) return;
		for (const handle of debouncers.values()) clearTimeout(handle);
		debouncers.clear();
		for (const [key, value] of pending) {
			const keyframeTime = keyframeTimes.get(key);
			if (keyframeTime !== undefined) {
				props.onSetKeyframe(
					pendingTarget.trackId,
					pendingTarget.clipId,
					key,
					keyframeTime,
					value,
					'linear'
				);
				keyframeTimes.delete(key);
			} else if (key === 'lutStrength') {
				props.onLutStrength(pendingTarget.trackId, pendingTarget.clipId, value);
			} else {
				props.onEffectParam(pendingTarget.trackId, pendingTarget.clipId, key, value);
			}
		}
		pending.clear();
	}

	function flushMixPending() {
		if (!mixTarget.trackId || mixPending.size === 0) return;
		for (const handle of mixDebouncers.values()) clearTimeout(handle);
		mixDebouncers.clear();
		for (const [key, value] of mixPending) {
			if (key === 'gain') props.onTrackGain(mixTarget.trackId, value);
			if (key === 'pan') props.onTrackPan(mixTarget.trackId, value);
		}
		mixPending.clear();
	}

	function flushFadePending() {
		if (!fadeTarget.clipId || fadePending.size === 0) return;
		for (const handle of fadeDebouncers.values()) clearTimeout(handle);
		fadeDebouncers.clear();
		for (const [key, value] of fadePending) {
			props.onClipFade(
				fadeTarget.trackId,
				fadeTarget.clipId,
				key === 'audioFadeIn' ? 'in' : 'out',
				value
			);
		}
		fadePending.clear();
	}

	function flushTransformPending() {
		if (!transformTarget.clipId || transformPending.size === 0) return;
		for (const handle of transformDebouncers.values()) clearTimeout(handle);
		transformDebouncers.clear();
		const patch: Partial<TransformParamsSnapshot> = {};
		for (const [key, value] of transformPending) {
			const keyframeTime = keyframeTimes.get(key);
			if (keyframeTime !== undefined) {
				props.onSetKeyframe(
					transformTarget.trackId,
					transformTarget.clipId,
					key,
					keyframeTime,
					value,
					'linear'
				);
				keyframeTimes.delete(key);
			} else {
				patch[key] = value;
			}
		}
		if (Object.keys(patch).length > 0) {
			props.onTransform(transformTarget.trackId, transformTarget.clipId, patch);
		}
		transformPending.clear();
	}

	function scheduleTransformParam(key: TransformSliderKey, value: number) {
		const transform = props.selectedClipTransform;
		if (!transform) return;
		transformTarget.trackId = transform.trackId;
		transformTarget.clipId = transform.clipId;
		setTransformDraft((prev) => {
			const base = prev ?? transform.transform;
			return { ...base, [key]: value };
		});
		transformPending.set(key, value);
		if (shouldEditKeyframe(key)) keyframeTimes.set(key, props.playheadTime);
		const existing = transformDebouncers.get(key);
		if (existing) clearTimeout(existing);
		transformDebouncers.set(
			key,
			setTimeout(() => {
				transformDebouncers.delete(key);
				const latest = transformPending.get(key);
				transformPending.delete(key);
				if (latest !== undefined) {
					const keyframeTime = keyframeTimes.get(key);
					if (keyframeTime !== undefined) {
						keyframeTimes.delete(key);
						props.onSetKeyframe(
							transform.trackId,
							transform.clipId,
							key,
							keyframeTime,
							latest,
							'linear'
						);
					} else {
						props.onTransform(transform.trackId, transform.clipId, { [key]: latest });
					}
				}
			}, PARAM_DEBOUNCE_MS)
		);
	}

	function setFitMode(fit: FitModeSnapshot) {
		const transform = props.selectedClipTransform;
		if (!transform) return;
		setTransformDraft((prev) => {
			const base = prev ?? transform.transform;
			return { ...base, fit };
		});
		props.onTransform(transform.trackId, transform.clipId, { fit });
	}

	function flushTitle() {
		if (titleTimer) {
			clearTimeout(titleTimer);
			titleTimer = undefined;
		}
		if (!titleTarget.clipId) return;
		if (titlePatch.text === undefined && !titlePatch.style) return;
		props.onSetTitle(titleTarget.trackId, titleTarget.clipId, titlePatch);
		titlePatch = {};
	}

	function scheduleTitle(patch: { text?: string; style?: Partial<TitleStyleSnapshot> }) {
		const title = props.selectedTitle;
		if (!title) return;
		titleTarget.trackId = title.trackId;
		titleTarget.clipId = title.clipId;
		setTitleDraft((prev) =>
			prev
				? {
						text: patch.text ?? prev.text,
						style: patch.style ? { ...prev.style, ...patch.style } : prev.style
					}
				: prev
		);
		if (patch.text !== undefined) titlePatch.text = patch.text;
		if (patch.style) titlePatch.style = { ...titlePatch.style, ...patch.style };
		if (titleTimer) clearTimeout(titleTimer);
		titleTimer = setTimeout(flushTitle, PARAM_DEBOUNCE_MS);
	}

	function syncDraftFromClip(clip: SelectedClip) {
		setDraft((prev) => {
			const base = { ...clip.effects };
			if (!prev) return base;
			const next = { ...base };
			for (const key of new Set([...pending.keys(), ...debouncers.keys()])) {
				next[key] = prev[key];
			}
			return next;
		});
	}

	function scheduleMixParam(key: keyof MixDraft, value: number) {
		const mix = props.selectedTrackMix;
		if (!mix) return;
		mixTarget.trackId = mix.trackId;
		setMixDraft((prev) => ({ gain: mix.gain, pan: mix.pan, ...prev, [key]: value }));
		mixPending.set(key, value);
		const existing = mixDebouncers.get(key);
		if (existing) clearTimeout(existing);
		mixDebouncers.set(
			key,
			setTimeout(() => {
				mixDebouncers.delete(key);
				const latest = mixPending.get(key);
				mixPending.delete(key);
				if (latest !== undefined) {
					if (key === 'gain') props.onTrackGain(mix.trackId, latest);
					if (key === 'pan') props.onTrackPan(mix.trackId, latest);
				}
			}, PARAM_DEBOUNCE_MS)
		);
	}

	function scheduleFadeParam(key: keyof FadeDraft, value: number) {
		const fades = props.selectedClipFades;
		if (!fades) return;
		fadeTarget.trackId = fades.trackId;
		fadeTarget.clipId = fades.clipId;
		setFadeDraft((prev) => ({
			audioFadeIn: fades.audioFadeIn,
			audioFadeOut: fades.audioFadeOut,
			...prev,
			[key]: value
		}));
		fadePending.set(key, value);
		const existing = fadeDebouncers.get(key);
		if (existing) clearTimeout(existing);
		fadeDebouncers.set(
			key,
			setTimeout(() => {
				fadeDebouncers.delete(key);
				const latest = fadePending.get(key);
				fadePending.delete(key);
				if (latest !== undefined) {
					props.onClipFade(
						fades.trackId,
						fades.clipId,
						key === 'audioFadeIn' ? 'in' : 'out',
						latest
					);
				}
			}, PARAM_DEBOUNCE_MS)
		);
	}

	createEffect(() => {
		const clip = props.selectedClip;
		if (!clip) {
			flushPending();
			flushMixPending();
			flushFadePending();
			flushSkinMaskPending();
			pendingTarget.trackId = '';
			pendingTarget.clipId = '';
			mixTarget.trackId = '';
			fadeTarget.trackId = '';
			fadeTarget.clipId = '';
			skinMaskTarget.trackId = '';
			skinMaskTarget.clipId = '';
			setDraft(null);
			setMixDraft(null);
			setFadeDraft(null);
			setSkinSmoothBypass(false);
			return;
		}
		if (pendingTarget.clipId && pendingTarget.clipId !== clip.clipId) {
			flushPending();
		}
		if (skinMaskTarget.clipId && skinMaskTarget.clipId !== clip.clipId) {
			flushSkinMaskPending();
			setSkinSmoothBypass(false);
		}
		pendingTarget.trackId = clip.trackId;
		pendingTarget.clipId = clip.clipId;
		syncDraftFromClip(clip);
	});

	createEffect(() => {
		const mix = props.selectedTrackMix;
		if (!mix) {
			flushMixPending();
			mixTarget.trackId = '';
			setMixDraft(null);
			return;
		}
		if (mixTarget.trackId && mixTarget.trackId !== mix.trackId) {
			flushMixPending();
		}
		mixTarget.trackId = mix.trackId;
		setMixDraft((prev) => {
			const base = { gain: mix.gain, pan: mix.pan };
			if (!prev) return base;
			return {
				gain: mixPending.has('gain') || mixDebouncers.has('gain') ? prev.gain : mix.gain,
				pan: mixPending.has('pan') || mixDebouncers.has('pan') ? prev.pan : mix.pan
			};
		});
	});

	createEffect(() => {
		const fades = props.selectedClipFades;
		if (!fades) {
			flushFadePending();
			fadeTarget.trackId = '';
			fadeTarget.clipId = '';
			setFadeDraft(null);
			return;
		}
		if (fadeTarget.clipId && fadeTarget.clipId !== fades.clipId) {
			flushFadePending();
		}
		fadeTarget.trackId = fades.trackId;
		fadeTarget.clipId = fades.clipId;
		setFadeDraft((prev) => {
			const base = { audioFadeIn: fades.audioFadeIn, audioFadeOut: fades.audioFadeOut };
			if (!prev) return base;
			return {
				audioFadeIn:
					fadePending.has('audioFadeIn') || fadeDebouncers.has('audioFadeIn')
						? prev.audioFadeIn
						: fades.audioFadeIn,
				audioFadeOut:
					fadePending.has('audioFadeOut') || fadeDebouncers.has('audioFadeOut')
						? prev.audioFadeOut
						: fades.audioFadeOut
			};
		});
	});

	createEffect(() => {
		const transform = props.selectedClipTransform;
		if (!transform) {
			flushTransformPending();
			transformTarget.trackId = '';
			transformTarget.clipId = '';
			setTransformDraft(null);
			return;
		}
		if (transformTarget.clipId && transformTarget.clipId !== transform.clipId) {
			flushTransformPending();
		}
		transformTarget.trackId = transform.trackId;
		transformTarget.clipId = transform.clipId;
		setTransformDraft((prev) => {
			const base = { ...transform.transform };
			if (!prev) return base;
			const next = { ...base };
			for (const spec of TRANSFORM_SLIDERS) {
				if (transformPending.has(spec.key) || transformDebouncers.has(spec.key)) {
					next[spec.key] = prev[spec.key];
				}
			}
			return next;
		});
	});

	createEffect(() => {
		const title = props.selectedTitle;
		if (!title) {
			flushTitle();
			titleTarget.trackId = '';
			titleTarget.clipId = '';
			setTitleDraft(null);
			return;
		}
		if (titleTarget.clipId && titleTarget.clipId !== title.clipId) {
			flushTitle();
		}
		titleTarget.trackId = title.trackId;
		titleTarget.clipId = title.clipId;
		// Mirror the authoritative content unless a local edit is still pending for
		// this clip (debounce in flight), so the worker echo doesn't clobber typing.
		setTitleDraft((prev) =>
			prev && titleTimer !== undefined && titleTarget.clipId === title.clipId
				? prev
				: { text: title.title.text, style: { ...title.title.style } }
		);
	});

	onCleanup(() => {
		flushPending();
		flushMixPending();
		flushFadePending();
		flushTransformPending();
		flushSkinMaskPending();
		flushTitle();
	});

	const phase43Available = () => props.capabilityTier === 'core-webgpu';
	const phase43VideoClip = () =>
		Boolean(
			props.selectedClipTransform &&
			props.selectedClip?.kind !== 'callout' &&
			props.selectedClip?.kind !== 'title'
		);
	const selectedEventLogRef = () => {
		const sourceId = props.selectedClip?.sourceId;
		if (!sourceId) return undefined;
		return props.sessionEventLogs?.find((ref) => ref.sourceId === sourceId);
	};

	function scheduleParam(key: keyof ClipEffectParamsSnapshot, value: number) {
		const clip = props.selectedClip;
		if (!clip) return;
		pendingTarget.trackId = clip.trackId;
		pendingTarget.clipId = clip.clipId;
		setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
		pending.set(key, value);
		if (shouldEditKeyframe(key)) keyframeTimes.set(key, props.playheadTime);
		const existing = debouncers.get(key);
		if (existing) clearTimeout(existing);
		debouncers.set(
			key,
			setTimeout(() => {
				debouncers.delete(key);
				const latest = pending.get(key);
				pending.delete(key);
				if (latest !== undefined) {
					const keyframeTime = keyframeTimes.get(key);
					if (keyframeTime !== undefined) {
						keyframeTimes.delete(key);
						props.onSetKeyframe(clip.trackId, clip.clipId, key, keyframeTime, latest, 'linear');
					} else if (key === 'lutStrength') {
						props.onLutStrength(clip.trackId, clip.clipId, latest);
					} else {
						props.onEffectParam(clip.trackId, clip.clipId, key, latest);
					}
				}
			}, PARAM_DEBOUNCE_MS)
		);
	}

	function sendTimeRemap(remap: TimeRemapSnapshot): void {
		const clip = props.selectedClip;
		if (!clip) return;
		props.onSetTimeRemap?.(clip.trackId, clip.clipId, remap);
	}

	function sortedRemapKeyframes(
		keyframes: readonly TimeRemapKeyframeSnapshot[]
	): TimeRemapKeyframeSnapshot[] {
		return [...keyframes].sort((a, b) => a.outTimeS - b.outTimeS);
	}

	function updateRemapKeyframe(
		remap: TimeRemapSnapshot,
		index: number,
		patch: Partial<TimeRemapKeyframeSnapshot>
	): void {
		const keyframes = remap.keyframes.map((kf, i) => (i === index ? { ...kf, ...patch } : kf));
		sendTimeRemap({ ...remap, keyframes: sortedRemapKeyframes(keyframes) });
	}

	function addRemapKeyframe(remap: TimeRemapSnapshot): void {
		const clip = props.selectedClip;
		if (!clip) return;
		const keyframes = sortedRemapKeyframes(remap.keyframes);
		let outTimeS = clip.duration * 0.5;
		let speed = 1;
		if (keyframes.length > 0) {
			speed = keyframes[Math.floor(keyframes.length / 2)]?.speed ?? 1;
		}
		if (keyframes.length > 1) {
			let largestGap = -1;
			for (let i = 0; i < keyframes.length - 1; i += 1) {
				const left = keyframes[i];
				const right = keyframes[i + 1];
				if (!left || !right) continue;
				const gap = right.outTimeS - left.outTimeS;
				if (gap > largestGap) {
					largestGap = gap;
					outTimeS = left.outTimeS + gap * 0.5;
					speed = (left.speed + right.speed) * 0.5;
				}
			}
		}
		const next = sortedRemapKeyframes([
			...keyframes,
			{
				outTimeS: Number(outTimeS.toFixed(3)),
				speed: Math.min(4, Math.max(0.25, speed)),
				easing: 'ease'
			}
		]);
		sendTimeRemap({ ...remap, keyframes: next });
	}

	return (
		<aside class="inspector panel">
			<h2 class="panel-title">{copy().inspector}</h2>
			<Show
				when={props.selectedClip}
				fallback={<RailEmpty title={copy().selectClip}>{copy().selectClipHint}</RailEmpty>}
			>
				{(clip) => (
					<div class="inspector-section">
						<dl class="clip-summary">
							<div>
								<dt>{copy().track}</dt>
								<dd>{clip().trackId}</dd>
							</div>
							<div>
								<dt>{copy().clip}</dt>
								<dd>{clip().clipId}</dd>
							</div>
						</dl>
						<Show when={clip().captureSessionId && props.onRetakeRequested}>
							<div class="inspector-retake-row">
								<button
									type="button"
									onClick={() => props.onRetakeRequested?.(clip().clipId)}
									disabled={(props.recorderSessionState ?? 'idle') !== 'idle'}
									title={
										(props.recorderSessionState ?? 'idle') !== 'idle'
											? copy().recordingInProgress
											: undefined
									}
								>
									<RotateCcw size={14} aria-hidden="true" />
									{copy().retake}
								</button>
								<Show when={(props.recorderSessionState ?? 'idle') !== 'idle'}>
									<span>{copy().recordingInProgress}</span>
								</Show>
							</div>
						</Show>
						<Show when={titleDraft()}>
							{(title) => (
								<div class="title-controls">
									<h3 class="panel-subtitle">{copy().title}</h3>
									<label class="title-text-label">
										<span class="effect-slider-label">{copy().text}</span>
										<textarea
											class="title-text-input"
											rows={2}
											value={title().text}
											onInput={(e) =>
												scheduleTitle({ text: (e.currentTarget as HTMLTextAreaElement).value })
											}
										/>
									</label>
									<For each={TITLE_SLIDERS}>
										{(spec) => (
											<label class="effect-slider">
												<span class="effect-slider-label">
													{spec.label}
													<span class="effect-slider-value tabular-nums">
														{spec.format(title().style[spec.key])}
													</span>
												</span>
												<input
													type="range"
													min={spec.min}
													max={spec.max}
													step={spec.step}
													value={title().style[spec.key]}
													onInput={(e) =>
														scheduleTitle({
															style: {
																[spec.key]: Number((e.currentTarget as HTMLInputElement).value)
															} as Partial<TitleStyleSnapshot>
														})
													}
												/>
											</label>
										)}
									</For>
									<div class="title-colors">
										<For each={TITLE_COLORS}>
											{(spec) => (
												<label class="title-color">
													<span class="effect-slider-label">{spec.label}</span>
													<input
														type="color"
														value={title().style[spec.key]}
														onInput={(e) =>
															scheduleTitle({
																style: {
																	[spec.key]: (e.currentTarget as HTMLInputElement).value
																} as Partial<TitleStyleSnapshot>
															})
														}
													/>
												</label>
											)}
										</For>
									</div>
									<label class="effect-slider transform-fit">
										<span class="effect-slider-label">{copy().align}</span>
										<select
											value={title().style.align}
											onChange={(e) =>
												scheduleTitle({
													style: {
														align: (e.currentTarget as HTMLSelectElement)
															.value as TitleAlignSnapshot
													}
												})
											}
										>
											<For each={TITLE_ALIGN_OPTIONS}>
												{(option) => <option value={option.value}>{option.label}</option>}
											</For>
										</select>
									</label>
								</div>
							)}
						</Show>
						<Show when={mixDraft()}>
							{(mix) => (
								<div class="track-mix-controls">
									<h3 class="panel-subtitle">{copy().trackMix}</h3>
									<label class="effect-slider">
										<span class="effect-slider-label">
											{copy().gain}
											<span class="effect-slider-value tabular-nums">{mix().gain.toFixed(2)}</span>
										</span>
										<input
											type="range"
											min={0}
											max={2}
											step={0.01}
											value={mix().gain}
											onInput={(e) =>
												scheduleMixParam(
													'gain',
													Number((e.currentTarget as HTMLInputElement).value)
												)
											}
										/>
									</label>
									<label class="effect-slider">
										<span class="effect-slider-label">
											{copy().pan}
											<span class="effect-slider-value tabular-nums">{mix().pan.toFixed(2)}</span>
										</span>
										<input
											type="range"
											min={-1}
											max={1}
											step={0.01}
											value={mix().pan}
											onInput={(e) =>
												scheduleMixParam('pan', Number((e.currentTarget as HTMLInputElement).value))
											}
										/>
									</label>
									<Show when={props.selectedTrackMix}>
										{(trackMix) => (
											<>
												<label class="mix-toggle">
													<input
														type="checkbox"
														checked={trackMix().muted}
														onChange={(e) =>
															props.onTrackMute(
																trackMix().trackId,
																(e.currentTarget as HTMLInputElement).checked
															)
														}
													/>
													{copy().mute}
												</label>
												<label class="mix-toggle">
													<input
														type="checkbox"
														checked={trackMix().solo}
														onChange={(e) =>
															props.onTrackSolo(
																trackMix().trackId,
																(e.currentTarget as HTMLInputElement).checked
															)
														}
													/>
													{copy().solo}
												</label>
											</>
										)}
									</Show>
								</div>
							)}
						</Show>
						<Show when={fadeDraft()}>
							{(fades) => (
								<div class="track-mix-controls">
									<h3 class="panel-subtitle">{copy().audioFades}</h3>
									<label class="effect-slider">
										<span class="effect-slider-label">
											{copy().fadeIn}
											<span class="effect-slider-value tabular-nums">
												{fades().audioFadeIn.toFixed(2)}s
											</span>
										</span>
										<input
											type="range"
											min={0}
											max={props.selectedClipFades?.duration ?? 0}
											step={0.01}
											value={fades().audioFadeIn}
											onInput={(e) =>
												scheduleFadeParam(
													'audioFadeIn',
													Number((e.currentTarget as HTMLInputElement).value)
												)
											}
										/>
									</label>
									<label class="effect-slider">
										<span class="effect-slider-label">
											{copy().fadeOut}
											<span class="effect-slider-value tabular-nums">
												{fades().audioFadeOut.toFixed(2)}s
											</span>
										</span>
										<input
											type="range"
											min={0}
											max={props.selectedClipFades?.duration ?? 0}
											step={0.01}
											value={fades().audioFadeOut}
											onInput={(e) =>
												scheduleFadeParam(
													'audioFadeOut',
													Number((e.currentTarget as HTMLInputElement).value)
												)
											}
										/>
									</label>
								</div>
							)}
						</Show>
						<Show when={transformDraft()}>
							{(transform) => (
								<div class="effect-sliders transform-controls">
									<h3 class="panel-subtitle">{copy().transform}</h3>
									<For each={TRANSFORM_SLIDERS}>
										{(spec) => (
											<div class="effect-slider">
												<div class="effect-slider-label">
													<span>{spec.label}</span>
													<span class="effect-slider-value tabular-nums">
														{spec.format(transform()[spec.key])}
													</span>
												</div>
												<div class="keyframe-slider-row">
													<button
														type="button"
														class="keyframe-nav"
														aria-label={keyframeAria.previous(spec.label)}
														onClick={() => seekKeyframe(spec.key, -1)}
														disabled={!props.selectedClip?.keyframes?.[spec.key]?.length}
													>
														<ChevronLeft size={14} />
													</button>
													<button
														type="button"
														class={`keyframe-toggle${hasKeyframeAtPlayhead(spec.key) ? ' is-active' : ''}`}
														aria-label={keyframeAria.toggle(spec.label)}
														aria-pressed={hasKeyframeAtPlayhead(spec.key)}
														onClick={() => toggleKeyframe(spec.key, transform()[spec.key])}
														disabled={currentLocalTime() === null}
													>
														<Diamond size={13} />
													</button>
													<input
														type="range"
														min={spec.min}
														max={spec.max}
														step={spec.step}
														value={transform()[spec.key]}
														onInput={(e) =>
															scheduleTransformParam(
																spec.key,
																Number((e.currentTarget as HTMLInputElement).value)
															)
														}
													/>
													<button
														type="button"
														class="keyframe-nav"
														aria-label={keyframeAria.next(spec.label)}
														onClick={() => seekKeyframe(spec.key, 1)}
														disabled={!props.selectedClip?.keyframes?.[spec.key]?.length}
													>
														<ChevronRight size={14} />
													</button>
												</div>
											</div>
										)}
									</For>
									<label class="effect-slider transform-fit">
										<span class="effect-slider-label">{copy().fit}</span>
										<select
											value={transform().fit}
											onChange={(e) =>
												setFitMode((e.currentTarget as HTMLSelectElement).value as FitModeSnapshot)
											}
										>
											<For each={FIT_OPTIONS}>
												{(option) => <option value={option.value}>{option.label}</option>}
											</For>
										</select>
									</label>
								</div>
							)}
						</Show>
						<Show when={phase43VideoClip() || props.selectedClip?.kind === 'callout'}>
							<Show
								when={phase43Available()}
								fallback={
									<div
										class="inspector-section phase43-disabled"
										title={copy().requiresWebGPU}
										aria-disabled="true"
									>
										<h3 class="panel-subtitle">{copy().screencastTools}</h3>
										<p class="placeholder-text">{copy().requiresWebGPU}</p>
									</div>
								}
							>
								<Show
									when={
										phase43VideoClip() && props.onReplaceKeyframeTracks ? props.selectedClip : null
									}
								>
									{(selected) => (
										<>
											<ZoomPresetPanel
												trackId={selected().trackId}
												clipId={selected().clipId}
												hasExistingKeyframes={Boolean(
													selected().keyframes?.x?.length ||
													selected().keyframes?.y?.length ||
													selected().keyframes?.scale?.length
												)}
												onSetKeyframes={(trackId, clipId, keyframes) =>
													props.onReplaceKeyframeTracks?.(trackId, clipId, keyframes)
												}
												onPickRegion={props.onPickPreviewRegion}
											/>
											<AutoZoomPanel
												trackId={selected().trackId}
												clipId={selected().clipId}
												sessionEventLogRef={selectedEventLogRef()}
												clipStartUs={Math.round((selected().inPoint ?? 0) * 1_000_000)}
												sourceWidth={selected().sourceWidth}
												sourceHeight={selected().sourceHeight}
												onSetKeyframes={(trackId, clipId, keyframes) =>
													props.onReplaceKeyframeTracks?.(trackId, clipId, keyframes)
												}
											/>
											<Show when={props.onSetPaddedBackground}>
												<PaddedBackgroundPanel
													trackId={selected().trackId}
													clipId={selected().clipId}
													paddedBackground={selected().paddedBackground}
													mediaAssets={props.mediaAssets}
													onSetPaddedBackground={(trackId, clipId, params) =>
														props.onSetPaddedBackground?.(trackId, clipId, params)
													}
												/>
											</Show>
										</>
									)}
								</Show>
								<Show
									when={
										props.selectedClip?.kind === 'callout' &&
										props.selectedClip.callout &&
										props.onSetCallout
									}
								>
									<CalloutInspector
										trackId={props.selectedClip!.trackId}
										clipId={props.selectedClip!.clipId}
										callout={props.selectedClip!.callout!}
										onSetCallout={(trackId, clipId, payload) =>
											props.onSetCallout?.(trackId, clipId, payload)
										}
									/>
								</Show>
							</Show>
						</Show>
						{/* Phase 35: Speed section — visible for non-title clips with time-remap support */}
						<Show
							when={
								props.selectedClip && props.selectedClip.kind !== 'title' && props.onSetTimeRemap
							}
						>
							<div class="effect-sliders">
								<h3 class="panel-subtitle">{copy().speed}</h3>
								<Show
									when={props.selectedClip?.timeRemap}
									fallback={
										<button
											type="button"
											class="btn btn-secondary"
											aria-label={copy().addSpeedRamp}
											onClick={() => {
												const selected = props.selectedClip;
												if (!selected) return;
												props.onSetTimeRemap?.(selected.trackId, selected.clipId, {
													keyframes: [
														{ outTimeS: 0, speed: 1, easing: 'linear' },
														{ outTimeS: selected.duration, speed: 1, easing: 'linear' }
													],
													pitchPreserve: true,
													sourceDurationS: selected.duration
												});
											}}
										>
											{copy().addRamp}
										</button>
									}
								>
									{(remap) => (
										<>
											<div class="remap-info">
												<div class="remap-keyframes">
													<For each={remap().keyframes}>
														{(kf, i) => (
															<div class="remap-keyframe">
																<div class="remap-keyframe-title">
																	{copy().keyframeN.replace('{n}', String(i() + 1))}
																</div>
																<label class="remap-control-row">
																	<span class="remap-control-label">{copy().time}</span>
																	<input
																		class="remap-number-input"
																		type="number"
																		min="0"
																		max={props.selectedClip?.duration ?? remap().sourceDurationS}
																		step="0.01"
																		value={kf.outTimeS}
																		aria-label={copy().speedRampKeyframeTime.replace(
																			'{n}',
																			String(i() + 1)
																		)}
																		onChange={(e) =>
																			updateRemapKeyframe(remap(), i(), {
																				outTimeS: Number(e.currentTarget.value)
																			})
																		}
																	/>
																	<span class="remap-unit">s</span>
																</label>
																<label class="remap-control-row">
																	<span class="remap-control-label">{copy().speed}</span>
																	<input
																		class="remap-speed-slider"
																		type="range"
																		min="0.25"
																		max="4"
																		step="0.01"
																		value={kf.speed}
																		aria-label={copy().speedRampKeyframeSpeed.replace(
																			'{n}',
																			String(i() + 1)
																		)}
																		onChange={(e) =>
																			updateRemapKeyframe(remap(), i(), {
																				speed: Number(e.currentTarget.value)
																			})
																		}
																	/>
																	<span class="remap-speed-value">{kf.speed.toFixed(2)}x</span>
																</label>
																<label class="remap-control-row">
																	<span class="remap-control-label">{copy().easing}</span>
																	<select
																		class="remap-select"
																		value={kf.easing}
																		aria-label={copy().speedRampKeyframeEasing.replace(
																			'{n}',
																			String(i() + 1)
																		)}
																		onChange={(e) =>
																			updateRemapKeyframe(remap(), i(), {
																				easing: coerceTimeRemapEasing(e.currentTarget.value)
																			})
																		}
																	>
																		<For each={TIME_REMAP_EASING_OPTIONS}>
																			{(option) => (
																				<option value={option.value}>{option.label}</option>
																			)}
																		</For>
																	</select>
																</label>
															</div>
														)}
													</For>
												</div>
												<button
													type="button"
													class="btn btn-secondary"
													aria-label={copy().addSpeedRampKeyframe}
													onClick={() => addRemapKeyframe(remap())}
												>
													{copy().addKeyframe}
												</button>
												<label class="remap-pitch-preserve">
													<input
														type="checkbox"
														checked={remap().pitchPreserve}
														aria-label={copy().pitchPreserve}
														onChange={(e) =>
															sendTimeRemap({
																...remap(),
																pitchPreserve: e.currentTarget.checked
															})
														}
													/>
													<span>{copy().pitchPreserve}</span>
												</label>
											</div>
											<button
												type="button"
												class="btn btn-secondary"
												aria-label={copy().clearSpeedRamp}
												onClick={() => {
													const selected = props.selectedClip;
													if (!selected) return;
													props.onClearTimeRemap?.(selected.trackId, selected.clipId);
												}}
											>
												{copy().clearRamp}
											</button>
										</>
									)}
								</Show>
							</div>
						</Show>
						<Show when={draft()}>
							{(effects) => (
								<div class="effect-sliders">
									<h3 class="panel-subtitle">{copy().effects}</h3>
									<For each={SLIDERS}>
										{(spec) => (
											<div class="effect-slider">
												<div class="effect-slider-label">
													<span>{spec.label}</span>
													<span class="effect-slider-value tabular-nums">
														{spec.format(effects()[spec.key])}
													</span>
												</div>
												<div class="keyframe-slider-row">
													<button
														type="button"
														class="keyframe-nav"
														aria-label={keyframeAria.previous(spec.label)}
														onClick={() => seekKeyframe(spec.key, -1)}
														disabled={!props.selectedClip?.keyframes?.[spec.key]?.length}
													>
														<ChevronLeft size={14} />
													</button>
													<button
														type="button"
														class={`keyframe-toggle${hasKeyframeAtPlayhead(spec.key) ? ' is-active' : ''}`}
														aria-label={keyframeAria.toggle(spec.label)}
														aria-pressed={hasKeyframeAtPlayhead(spec.key)}
														onClick={() => toggleKeyframe(spec.key, effects()[spec.key])}
														disabled={currentLocalTime() === null}
													>
														<Diamond size={13} />
													</button>
													<input
														type="range"
														min={spec.min}
														max={spec.max}
														step={spec.step}
														value={effects()[spec.key]}
														onInput={(e) =>
															scheduleParam(
																spec.key,
																Number((e.currentTarget as HTMLInputElement).value)
															)
														}
													/>
													<button
														type="button"
														class="keyframe-nav"
														aria-label={keyframeAria.next(spec.label)}
														onClick={() => seekKeyframe(spec.key, 1)}
														disabled={!props.selectedClip?.keyframes?.[spec.key]?.length}
													>
														<ChevronRight size={14} />
													</button>
												</div>
											</div>
										)}
									</For>
									<div
										class={`skin-smooth-panel${skinMaskControlsEnabled() ? ' is-active' : ' is-inactive'}${skinSmoothIsStrong() ? ' is-strong' : ''}${props.previewTierSupportsSkinSmooth === false ? ' is-tier-unsupported' : ''}`}
										aria-disabled={
											props.previewTierSupportsSkinSmooth === false || !skinMaskControlsEnabled()
												? 'true'
												: undefined
										}
									>
										<Show when={props.previewTierSupportsSkinSmooth === false}>
											<p class="skin-smooth-tier-note" role="note">
												{copy().skinSmoothRequiresWebGPU}
											</p>
										</Show>
										<div class="skin-smooth-status">
											<span class="skin-smooth-status-copy">
												<span class="skin-smooth-title">{copy().skinSmoothing}</span>
												<span class="skin-smooth-status-text">{skinSmoothStatus()}</span>
											</span>
											<span
												class={`skin-smooth-status-pill${skinMaskControlsEnabled() ? ' is-active' : ' is-inactive'}${skinSmoothIsStrong() ? ' is-warning' : ''}`}
											>
												{skinSmoothIsStrong()
													? copy().strong
													: skinSmoothStrength() > 0
														? copy().on
														: skinSmoothKeyframed()
															? copy().animated
															: copy().off}
											</span>
										</div>
										<div class="effect-slider skin-smooth-strength">
											<div class="effect-slider-label">
												<span>{SKIN_SMOOTH_STRENGTH_SLIDER.label}</span>
												<span class="effect-slider-value tabular-nums">
													{SKIN_SMOOTH_STRENGTH_SLIDER.format(effects().skinSmoothStrength)}
												</span>
											</div>
											<div class="keyframe-slider-row">
												<button
													type="button"
													class="keyframe-nav"
													aria-label={keyframeAria.previous(copy().skinSmoothing)}
													onClick={() => seekKeyframe(SKIN_SMOOTH_STRENGTH_SLIDER.key, -1)}
													disabled={!props.selectedClip?.keyframes?.skinSmoothStrength?.length}
												>
													<ChevronLeft size={14} />
												</button>
												<button
													type="button"
													class={`keyframe-toggle${hasKeyframeAtPlayhead(SKIN_SMOOTH_STRENGTH_SLIDER.key) ? ' is-active' : ''}`}
													aria-label={keyframeAria.toggle(copy().skinSmoothing)}
													aria-pressed={hasKeyframeAtPlayhead(SKIN_SMOOTH_STRENGTH_SLIDER.key)}
													onClick={() =>
														toggleKeyframe(
															SKIN_SMOOTH_STRENGTH_SLIDER.key,
															effects().skinSmoothStrength
														)
													}
													disabled={currentLocalTime() === null}
												>
													<Diamond size={13} />
												</button>
												<input
													type="range"
													min={SKIN_SMOOTH_STRENGTH_SLIDER.min}
													max={SKIN_SMOOTH_STRENGTH_SLIDER.max}
													step={SKIN_SMOOTH_STRENGTH_SLIDER.step}
													value={effects().skinSmoothStrength}
													disabled={props.previewTierSupportsSkinSmooth === false}
													onInput={(e) =>
														scheduleParam(
															SKIN_SMOOTH_STRENGTH_SLIDER.key,
															Number((e.currentTarget as HTMLInputElement).value)
														)
													}
												/>
												<button
													type="button"
													class="keyframe-nav"
													aria-label={keyframeAria.next(copy().skinSmoothing)}
													onClick={() => seekKeyframe(SKIN_SMOOTH_STRENGTH_SLIDER.key, 1)}
													disabled={!props.selectedClip?.keyframes?.skinSmoothStrength?.length}
												>
													<ChevronRight size={14} />
												</button>
											</div>
										</div>
										<p class={`skin-smooth-note${skinSmoothIsStrong() ? ' is-warning' : ''}`}>
											{skinSmoothNote()}
										</p>
										<Show when={skinMaskControlsEnabled()}>
											<div class="skin-smooth-bypass">
												<button
													type="button"
													class={`bypass-toggle${skinSmoothBypass() ? ' is-active' : ''}`}
													aria-pressed={skinSmoothBypass()}
													aria-label={copy().bypassSkinSmoothing}
													onClick={() => {
														const clip = props.selectedClip;
														if (clip && props.onSkinSmoothBypass) {
															const next = !skinSmoothBypass();
															setSkinSmoothBypass(next);
															props.onSkinSmoothBypass(clip.trackId, clip.clipId, next);
														}
													}}
												>
													{copy().bypass}
												</button>
												<span>{copy().previewOnlyNote}</span>
											</div>
										</Show>
										<details
											class={`skin-mask-disclosure${skinMaskControlsEnabled() ? '' : ' is-disabled'}`}
										>
											<summary>
												<span>{copy().skinMask}</span>
												<span class="skin-mask-summary">{copy().advanced}</span>
											</summary>
											<div class="skin-mask-sliders">
												<For each={SKIN_MASK_SLIDERS}>
													{(spec) => (
														<div class="effect-slider">
															<div class="effect-slider-label">
																<span>{spec.label}</span>
																<span class="effect-slider-value tabular-nums">
																	{spec.format(currentSkinMask()[spec.key])}
																</span>
															</div>
															<input
																type="range"
																aria-label={spec.label}
																min={spec.min}
																max={spec.max}
																step={spec.step}
																value={currentSkinMask()[spec.key]}
																disabled={!skinMaskControlsEnabled()}
																onInput={(e) =>
																	scheduleSkinMaskParam(
																		spec.key,
																		Number((e.currentTarget as HTMLInputElement).value)
																	)
																}
															/>
														</div>
													)}
												</For>
												<button
													type="button"
													class="skin-mask-reset"
													disabled={!skinMaskControlsEnabled()}
													onClick={() => {
														const clip = props.selectedClip;
														if (clip && props.onSkinMask && skinMaskControlsEnabled()) {
															props.onSkinMask(clip.trackId, clip.clipId, {
																...DEFAULT_SKIN_MASK
															});
														}
													}}
												>
													{copy().resetMask}
												</button>
											</div>
										</details>
									</div>
									<div class="lut-controls">
										<div class="lut-header">
											<span class="effect-slider-label">
												LUT{' '}
												<span class="text-xs text-muted-foreground font-normal">
													{copy().experimental}
												</span>
											</span>
											<button
												type="button"
												class="lut-import-button"
												aria-label={copy().importLut}
												onClick={() => lutInput?.click()}
											>
												<Upload size={14} />
											</button>
											<input
												ref={(el) => {
													lutInput = el;
												}}
												class="sr-only"
												type="file"
												accept=".cube,application/octet-stream,text/plain"
												onChange={(event) => {
													const input = event.currentTarget as HTMLInputElement;
													handleLutFile(input.files?.[0]);
													input.value = '';
												}}
											/>
										</div>
										<Show
											when={props.selectedClip?.lut}
											fallback={<p class="lut-empty">{copy().importCubeFile}</p>}
										>
											{(lut) => (
												<p class="lut-name">
													{lut().title || lut().fileName}
													<span>{lut().size}³</span>
												</p>
											)}
										</Show>
										<div class="effect-slider">
											<div class="effect-slider-label">
												<span>{LUT_STRENGTH_SLIDER.label}</span>
												<span class="effect-slider-value tabular-nums">
													{LUT_STRENGTH_SLIDER.format(effects().lutStrength)}
												</span>
											</div>
											<div class="keyframe-slider-row">
												<button
													type="button"
													class="keyframe-nav"
													aria-label={keyframeAria.previous(copy().lutStrength)}
													onClick={() => seekKeyframe(LUT_STRENGTH_SLIDER.key, -1)}
													disabled={!props.selectedClip?.keyframes?.lutStrength?.length}
												>
													<ChevronLeft size={14} />
												</button>
												<button
													type="button"
													class={`keyframe-toggle${hasKeyframeAtPlayhead(LUT_STRENGTH_SLIDER.key) ? ' is-active' : ''}`}
													aria-label={keyframeAria.toggle(copy().lutStrength)}
													aria-pressed={hasKeyframeAtPlayhead(LUT_STRENGTH_SLIDER.key)}
													onClick={() =>
														toggleKeyframe(LUT_STRENGTH_SLIDER.key, effects().lutStrength)
													}
													disabled={currentLocalTime() === null}
												>
													<Diamond size={13} />
												</button>
												<input
													type="range"
													min={LUT_STRENGTH_SLIDER.min}
													max={LUT_STRENGTH_SLIDER.max}
													step={LUT_STRENGTH_SLIDER.step}
													value={effects().lutStrength}
													disabled={!props.selectedClip?.lut}
													onInput={(e) =>
														scheduleParam(
															LUT_STRENGTH_SLIDER.key,
															Number((e.currentTarget as HTMLInputElement).value)
														)
													}
												/>
												<button
													type="button"
													class="keyframe-nav"
													aria-label={keyframeAria.next(copy().lutStrength)}
													onClick={() => seekKeyframe(LUT_STRENGTH_SLIDER.key, 1)}
													disabled={!props.selectedClip?.keyframes?.lutStrength?.length}
												>
													<ChevronRight size={14} />
												</button>
											</div>
										</div>
									</div>
									{/* Phase 38a: Look presets section */}
									<Show
										when={!lookNeutral() || props.selectedClip?.lut || props.onImportLookPreset}
									>
										<div class="look-controls">
											<div class="look-header">
												<span class="effect-slider-label">{copy().look}</span>
												<Show when={props.onImportLookPreset}>
													<button
														type="button"
														class="lut-import-button"
														aria-label={copy().applyLookPreset}
														onClick={() => lookPresetInput?.click()}
													>
														<Upload size={14} />
													</button>
													<input
														ref={(el) => {
															lookPresetInput = el;
														}}
														class="sr-only"
														type="file"
														accept=".json,.cube"
														multiple
														onChange={(event) => {
															const files = event.currentTarget.files;
															if (
																files &&
																files.length > 0 &&
																props.selectedClip &&
																props.onImportLookPreset
															) {
																const jsonFile = Array.from(files).find((f) =>
																	f.name.endsWith('.json')
																);
																const cubeFile = Array.from(files).find((f) =>
																	f.name.endsWith('.cube')
																);
																if (jsonFile) {
																	props.onImportLookPreset(
																		props.selectedClip.trackId,
																		props.selectedClip.clipId,
																		jsonFile,
																		cubeFile
																	);
																}
															}
															event.currentTarget.value = '';
														}}
													/>
												</Show>
											</div>
											<Show when={!lookNeutral()}>
												<For each={LOOK_SLIDERS}>
													{(spec) => (
														<div class="effect-slider">
															<div class="effect-slider-label">
																<span>{spec.label}</span>
																<span class="effect-slider-value tabular-nums">
																	{spec.format(effects()[spec.key])}
																</span>
															</div>
															<div class="keyframe-slider-row">
																<button
																	type="button"
																	class="keyframe-nav"
																	aria-label={keyframeAria.previous(spec.label)}
																	onClick={() => seekKeyframe(spec.key, -1)}
																	disabled={!props.selectedClip?.keyframes?.[spec.key]?.length}
																>
																	<ChevronLeft size={14} />
																</button>
																<button
																	type="button"
																	class={`keyframe-toggle${hasKeyframeAtPlayhead(spec.key) ? ' is-active' : ''}`}
																	aria-label={keyframeAria.toggle(spec.label)}
																	aria-pressed={hasKeyframeAtPlayhead(spec.key)}
																	onClick={() => toggleKeyframe(spec.key, effects()[spec.key])}
																	disabled={currentLocalTime() === null}
																>
																	<Diamond size={13} />
																</button>
																<input
																	type="range"
																	min={spec.min}
																	max={spec.max}
																	step={spec.step}
																	value={effects()[spec.key]}
																	onInput={(e) =>
																		scheduleParam(
																			spec.key,
																			Number((e.currentTarget as HTMLInputElement).value)
																		)
																	}
																/>
																<button
																	type="button"
																	class="keyframe-nav"
																	aria-label={keyframeAria.next(spec.label)}
																	onClick={() => seekKeyframe(spec.key, 1)}
																	disabled={!props.selectedClip?.keyframes?.[spec.key]?.length}
																>
																	<ChevronRight size={14} />
																</button>
															</div>
														</div>
													)}
												</For>
												<Show when={props.onExportLookPreset && props.selectedClip}>
													<button
														type="button"
														class="look-export-button"
														onClick={() =>
															props.onExportLookPreset!(
																props.selectedClip!.trackId,
																props.selectedClip!.clipId
															)
														}
													>
														{copy().exportLookPreset}
													</button>
												</Show>
											</Show>
										</div>
									</Show>
									{/* Phase 31: Portrait Matte controls — shown only when wired */}
									<Show when={props.onSetMatteEnabled}>
										<div class="matte-controls">
											<div class="matte-header">
												<span class="effect-slider-label">
													{copy().portraitMatte}{' '}
													<span class="text-xs text-muted-foreground font-normal">
														{copy().experimental}
													</span>
												</span>
												<Show when={props.matteStatus?.modelStatus === 'loading'}>
													<span class="text-xs text-muted-foreground">{copy().loading}</span>
												</Show>
												<Show when={props.matteStatus?.modelStatus === 'failed'}>
													<span class="text-xs text-destructive">{copy().failed}</span>
												</Show>
											</div>
											<div class="matte-toggle-row">
												<label class="matte-toggle-label">
													<input
														type="checkbox"
														checked={props.selectedClip?.matte?.enabled ?? false}
														onChange={(e) => props.onSetMatteEnabled?.(e.currentTarget.checked)}
													/>
													<span>{copy().enable}</span>
												</label>
											</div>
											<Show when={props.selectedClip?.matte?.enabled}>
												<div class="matte-toggle-row">
													<label class="matte-toggle-label" for="matte-mode-select">
														{copy().mode}
													</label>
													<select
														id="matte-mode-select"
														value={props.selectedClip?.matte?.mode ?? 'remove'}
														onChange={(e) =>
															props.onSetMatteMode?.(
																e.currentTarget.value as import('../protocol').MatteMode
															)
														}
													>
														<option value="remove">{copy().matteRemove}</option>
														<option value="replace">{copy().matteReplace}</option>
														<option value="blur">{copy().matteBlur}</option>
													</select>
												</div>
												<Show when={props.selectedClip?.matte?.mode === 'replace'}>
													<p class="text-xs text-muted-foreground">{copy().matteReplaceNote}</p>
												</Show>
												<div class="effect-slider">
													<div class="effect-slider-label">
														<span>{copy().strength}</span>
														<span class="effect-slider-value tabular-nums">
															{Math.round((props.selectedClip?.matte?.strength ?? 1) * 100)}%
														</span>
													</div>
													<input
														type="range"
														min={0}
														max={100}
														step={1}
														value={Math.round((props.selectedClip?.matte?.strength ?? 1) * 100)}
														onInput={(e) =>
															props.onSetMatteStrength?.(
																Number((e.currentTarget as HTMLInputElement).value) / 100
															)
														}
													/>
												</div>
												<Show when={props.selectedClip?.matte?.mode === 'blur'}>
													<div class="effect-slider">
														<div class="effect-slider-label">
															<span>{copy().blurRadius}</span>
															<span class="effect-slider-value tabular-nums">
																{Math.round(props.selectedClip?.matte?.blurRadius ?? 16)}px
															</span>
														</div>
														<input
															type="range"
															min={0}
															max={64}
															step={1}
															value={Math.round(props.selectedClip?.matte?.blurRadius ?? 16)}
															onInput={(e) =>
																props.onSetMatteBlurRadius?.(
																	Number((e.currentTarget as HTMLInputElement).value)
																)
															}
														/>
													</div>
												</Show>
											</Show>
										</div>
									</Show>
								</div>
							)}
						</Show>
						{/* Phase 32b: Beauty model state + load. The editing controls below only
						    appear once a model is loaded, so the panel never presents a no-op
						    effect (R1.3, R7.1). With the shipped template manifest, loading
						    resolves to "No compatible beauty model configured". */}
						<Show when={props.selectedClip}>
							<Show when={props.beautyAvailable === false}>
								<div class="beauty-panel">
									<div class="beauty-status">
										<span class="beauty-title">{copy().beauty}</span>
										<span class="beauty-status-pill">{copy().unavailable}</span>
									</div>
									<p class="beauty-hint">{copy().beautyNeedsWebGPU}</p>
								</div>
							</Show>
							<Show
								when={
									props.beautyAvailable !== false &&
									(props.beautyModelStatus ?? 'not-loaded') !== 'loaded'
								}
							>
								<div class="beauty-panel">
									<div class="beauty-status">
										<span class="beauty-title">{copy().beauty}</span>
										<span class="beauty-status-pill">{beautyModelStateLabel()}</span>
									</div>
									<p class="beauty-hint">
										{copy().onDeviceModel}
										{beautyModelSizeLabel()}. {copy().runsLocally}
									</p>
									<Show when={props.beautyModelStatus !== 'loading'}>
										<button
											type="button"
											class="button secondary"
											onClick={() => props.onLoadBeautyModel?.()}
										>
											{copy().loadBeautyModel}
											{beautyModelSizeLabel()}
										</button>
									</Show>
									<Show when={props.beautyModelError} keyed>
										{(err) => <p class="beauty-error">{err}</p>}
									</Show>
								</div>
							</Show>
						</Show>
						{/* Phase 32b: Beauty effect editing — only when a model is loaded. */}
						<Show
							when={
								props.selectedClip &&
								props.beautyAvailable !== false &&
								props.beautyModelStatus === 'loaded'
									? (props.selectedClip.beauty ?? DEFAULT_BEAUTY_EFFECT)
									: undefined
							}
						>
							{(beauty) => (
								<div class="beauty-panel">
									<div class="beauty-status">
										<span class="beauty-title">{copy().beauty}</span>
										<span class="beauty-status-pill">
											{beauty().enabled ? copy().on : copy().off}
										</span>
										<button
											type="button"
											class="button secondary"
											aria-label={beauty().enabled ? copy().disableBeauty : copy().enableBeauty}
											onClick={() => {
												const clip = props.selectedClip;
												if (clip && props.onBeautyEffect) {
													props.onBeautyEffect(clip.trackId, clip.clipId, {
														enabled: !beauty().enabled
													});
												}
											}}
										>
											{beauty().enabled ? copy().disable : copy().enable}
										</button>
									</div>
									<div class="effect-slider">
										<div class="effect-slider-label">
											<span>{copy().masterStrength}</span>
											<span class="effect-slider-value tabular-nums">
												{beauty().masterStrength.toFixed(2)}
											</span>
										</div>
										<div class="keyframe-slider-row">
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.previous(
													`${copy().beauty} ${copy().masterStrength}`
												)}
												onClick={() => seekKeyframe('beauty.masterStrength', -1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.masterStrength']?.length}
											>
												<ChevronLeft size={14} />
											</button>
											<button
												type="button"
												class={`keyframe-toggle${hasKeyframeAtPlayhead('beauty.masterStrength') ? ' is-active' : ''}`}
												aria-label={keyframeAria.toggle(
													`${copy().beauty} ${copy().masterStrength}`
												)}
												aria-pressed={hasKeyframeAtPlayhead('beauty.masterStrength')}
												onClick={() =>
													toggleKeyframe('beauty.masterStrength', beauty().masterStrength)
												}
												disabled={currentLocalTime() === null}
											>
												<Diamond size={13} />
											</button>
											<input
												type="range"
												min={0}
												max={1}
												step={0.01}
												value={beauty().masterStrength}
												onInput={(e) => {
													const clip = props.selectedClip;
													if (clip && props.onBeautyEffect) {
														props.onBeautyEffect(clip.trackId, clip.clipId, {
															masterStrength: Number((e.currentTarget as HTMLInputElement).value)
														});
													}
												}}
											/>
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.next(`${copy().beauty} ${copy().masterStrength}`)}
												onClick={() => seekKeyframe('beauty.masterStrength', 1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.masterStrength']?.length}
											>
												<ChevronRight size={14} />
											</button>
										</div>
									</div>
									<div class="effect-slider">
										<div class="effect-slider-label">
											<span>{copy().jawSlim}</span>
											<span class="effect-slider-value tabular-nums">
												{beauty().jawSlim.toFixed(2)}
											</span>
										</div>
										<div class="keyframe-slider-row">
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.previous(copy().jawSlim)}
												onClick={() => seekKeyframe('beauty.jawSlim', -1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.jawSlim']?.length}
											>
												<ChevronLeft size={14} />
											</button>
											<button
												type="button"
												class={`keyframe-toggle${hasKeyframeAtPlayhead('beauty.jawSlim') ? ' is-active' : ''}`}
												aria-label={keyframeAria.toggle(copy().jawSlim)}
												aria-pressed={hasKeyframeAtPlayhead('beauty.jawSlim')}
												onClick={() => toggleKeyframe('beauty.jawSlim', beauty().jawSlim)}
												disabled={currentLocalTime() === null}
											>
												<Diamond size={13} />
											</button>
											<input
												type="range"
												min={0}
												max={1}
												step={0.01}
												value={beauty().jawSlim}
												onInput={(e) => {
													const clip = props.selectedClip;
													if (clip && props.onBeautyEffect) {
														props.onBeautyEffect(clip.trackId, clip.clipId, {
															jawSlim: Number((e.currentTarget as HTMLInputElement).value)
														});
													}
												}}
											/>
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.next(copy().jawSlim)}
												onClick={() => seekKeyframe('beauty.jawSlim', 1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.jawSlim']?.length}
											>
												<ChevronRight size={14} />
											</button>
										</div>
									</div>
									<div class="effect-slider">
										<div class="effect-slider-label">
											<span>{copy().eyeEnlarge}</span>
											<span class="effect-slider-value tabular-nums">
												{beauty().eyeEnlarge.toFixed(2)}
											</span>
										</div>
										<div class="keyframe-slider-row">
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.previous(copy().eyeEnlarge)}
												onClick={() => seekKeyframe('beauty.eyeEnlarge', -1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.eyeEnlarge']?.length}
											>
												<ChevronLeft size={14} />
											</button>
											<button
												type="button"
												class={`keyframe-toggle${hasKeyframeAtPlayhead('beauty.eyeEnlarge') ? ' is-active' : ''}`}
												aria-label={keyframeAria.toggle(copy().eyeEnlarge)}
												aria-pressed={hasKeyframeAtPlayhead('beauty.eyeEnlarge')}
												onClick={() => toggleKeyframe('beauty.eyeEnlarge', beauty().eyeEnlarge)}
												disabled={currentLocalTime() === null}
											>
												<Diamond size={13} />
											</button>
											<input
												type="range"
												min={0}
												max={1}
												step={0.01}
												value={beauty().eyeEnlarge}
												onInput={(e) => {
													const clip = props.selectedClip;
													if (clip && props.onBeautyEffect) {
														props.onBeautyEffect(clip.trackId, clip.clipId, {
															eyeEnlarge: Number((e.currentTarget as HTMLInputElement).value)
														});
													}
												}}
											/>
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.next(copy().eyeEnlarge)}
												onClick={() => seekKeyframe('beauty.eyeEnlarge', 1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.eyeEnlarge']?.length}
											>
												<ChevronRight size={14} />
											</button>
										</div>
									</div>
									<div class="effect-slider">
										<div class="effect-slider-label">
											<span>{copy().noseWidth}</span>
											<span class="effect-slider-value tabular-nums">
												{beauty().noseWidth.toFixed(2)}
											</span>
										</div>
										<div class="keyframe-slider-row">
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.previous(copy().noseWidth)}
												onClick={() => seekKeyframe('beauty.noseWidth', -1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.noseWidth']?.length}
											>
												<ChevronLeft size={14} />
											</button>
											<button
												type="button"
												class={`keyframe-toggle${hasKeyframeAtPlayhead('beauty.noseWidth') ? ' is-active' : ''}`}
												aria-label={keyframeAria.toggle(copy().noseWidth)}
												aria-pressed={hasKeyframeAtPlayhead('beauty.noseWidth')}
												onClick={() => toggleKeyframe('beauty.noseWidth', beauty().noseWidth)}
												disabled={currentLocalTime() === null}
											>
												<Diamond size={13} />
											</button>
											<input
												type="range"
												min={0}
												max={1}
												step={0.01}
												value={beauty().noseWidth}
												onInput={(e) => {
													const clip = props.selectedClip;
													if (clip && props.onBeautyEffect) {
														props.onBeautyEffect(clip.trackId, clip.clipId, {
															noseWidth: Number((e.currentTarget as HTMLInputElement).value)
														});
													}
												}}
											/>
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.next(copy().noseWidth)}
												onClick={() => seekKeyframe('beauty.noseWidth', 1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.noseWidth']?.length}
											>
												<ChevronRight size={14} />
											</button>
										</div>
									</div>
									<div class="effect-slider">
										<div class="effect-slider-label">
											<span>{copy().mouth}</span>
											<span class="effect-slider-value tabular-nums">
												{beauty().mouth.toFixed(2)}
											</span>
										</div>
										<div class="keyframe-slider-row">
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.previous(copy().mouth)}
												onClick={() => seekKeyframe('beauty.mouth', -1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.mouth']?.length}
											>
												<ChevronLeft size={14} />
											</button>
											<button
												type="button"
												class={`keyframe-toggle${hasKeyframeAtPlayhead('beauty.mouth') ? ' is-active' : ''}`}
												aria-label={keyframeAria.toggle(copy().mouth)}
												aria-pressed={hasKeyframeAtPlayhead('beauty.mouth')}
												onClick={() => toggleKeyframe('beauty.mouth', beauty().mouth)}
												disabled={currentLocalTime() === null}
											>
												<Diamond size={13} />
											</button>
											<input
												type="range"
												min={0}
												max={1}
												step={0.01}
												value={beauty().mouth}
												onInput={(e) => {
													const clip = props.selectedClip;
													if (clip && props.onBeautyEffect) {
														props.onBeautyEffect(clip.trackId, clip.clipId, {
															mouth: Number((e.currentTarget as HTMLInputElement).value)
														});
													}
												}}
											/>
											<button
												type="button"
												class="keyframe-nav"
												aria-label={keyframeAria.next(copy().mouth)}
												onClick={() => seekKeyframe('beauty.mouth', 1)}
												disabled={!props.selectedClip?.keyframes?.['beauty.mouth']?.length}
											>
												<ChevronRight size={14} />
											</button>
										</div>
									</div>
								</div>
							)}
						</Show>
					</div>
				)}
			</Show>
			<Show when={props.metadata} keyed>
				{(meta) => (
					<>
						<h3 class="panel-subtitle">{copy().source}</h3>
						<dl class="metadata-list">
							<dt>{copy().duration}</dt>
							<dd class="tabular-nums">{meta.duration.toFixed(2)}s</dd>
							<dt>{copy().tracks}</dt>
							<dd>{meta.trackCount}</dd>
							<Show when={meta.video} keyed>
								{(video) => (
									<>
										<dt>{copy().video}</dt>
										<dd>
											{video.width}×{video.height}
											{video.codec ? ` · ${video.codec}` : ''}
											{video.frameRate != null ? ` · ${video.frameRate.toFixed(2)} fps` : ''}
										</dd>
									</>
								)}
							</Show>
							<Show when={meta.audio} keyed>
								{(audio) => (
									<>
										<dt>{copy().audio}</dt>
										<dd>
											{audio.channels} ch · {audio.sampleRate} Hz
											{audio.codec ? ` · ${audio.codec}` : ''}
										</dd>
									</>
								)}
							</Show>
						</dl>
					</>
				)}
			</Show>
			{/* Phase 13: transition editor */}
			<Show when={props.selectedTransition} keyed>
				{(transition) => (
					<>
						<h3 class="panel-subtitle">{copy().transition}</h3>
						<div class="inspector-section">
							<label class="inspector-label">
								<span>{copy().kind}</span>
								<select
									class="inspector-select"
									value={transition.kind}
									onChange={(e) =>
										props.onTransitionKind?.(
											transition.transitionId,
											e.currentTarget.value as import('../protocol').TransitionKindSnapshot
										)
									}
								>
									<option value="cross-dissolve">{copy().transitionCrossDissolve}</option>
									<option value="dip-to-black">{copy().transitionDipToBlack}</option>
									<option value="wipe">{copy().transitionWipe}</option>
									<option value="slide">{copy().transitionSlide}</option>
								</select>
							</label>
							<label class="inspector-label">
								<span>{copy().duration}</span>
								<div class="inspector-slider-row">
									<input
										type="range"
										min={0.1}
										max={Math.max(0.1, transition.maxDurationS ?? 5)}
										step={0.1}
										value={transition.durationS}
										onInput={(e) =>
											props.onTransitionDuration?.(
												transition.transitionId,
												Number((e.currentTarget as HTMLInputElement).value)
											)
										}
									/>
									<span class="tabular-nums inspector-value">
										{transition.durationS.toFixed(2)}s
									</span>
								</div>
							</label>
							<button
								type="button"
								class="inspector-button is-danger"
								onClick={() => props.onRemoveTransition?.(transition.transitionId)}
							>
								{copy().removeTransition}
							</button>
						</div>
					</>
				)}
			</Show>
		</aside>
	);
}
