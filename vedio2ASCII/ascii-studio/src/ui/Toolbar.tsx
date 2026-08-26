import { createMemo, createSignal, For, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Menu } from '@ark-ui/solid/menu';
import { Popover } from '@ark-ui/solid/popover';
import { ToggleGroup } from '@ark-ui/solid/toggle-group';
import {
	Activity,
	Command,
	Cpu,
	Crosshair,
	FolderOpen,
	Gauge,
	Keyboard,
	Pause,
	Play,
	Radio,
	Redo2,
	Repeat,
	Search,
	ShieldCheck,
	SkipBack,
	SkipForward,
	Undo2
} from 'lucide-solid';
import { cn } from '../lib/utils';
import { Button } from './components/button';
import type { CapabilityTier } from './capabilities';
import type { MediaMetadata } from '../protocol';
import { MeterStrip } from './MeterStrip';
import { LocaleSettings } from './LocaleSettings';
import { studioCopy, type StudioLocale } from './locale';
import { modifierGlyphs } from './platform';
import {
	buildCommandActions,
	buildMenuBarGroups,
	type CommandAction,
	type MenuBarGroup
} from './toolbar-menus';

interface ToolbarProps {
	metadata: MediaMetadata | null;
	playing: () => boolean;
	currentTime: () => number;
	duration: () => number;
	importAccept: string;
	onImportFile: (file: File) => void;
	onPickImport?: () => Promise<boolean>;
	onPlay: () => void;
	onPause: () => void;
	onStep: (direction: 1 | -1) => void;
	loop: () => boolean;
	onToggleLoop: () => void;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	/** Split the selected clip at the playhead (the `S` shortcut handler). */
	onSplit: () => void;
	/** Delete the current timeline selection (the `⌫` shortcut handler). */
	onDelete: () => void;
	/** True when at least one timeline clip is selected — gates `Clip › Split/Delete`. */
	hasSelection: boolean;
	transportDisabled?: boolean;
	importBlocked?: boolean;
	importHint?: string | null;
	crossOriginIsolated: boolean;
	pipelineMode: CapabilityTier;
	pipelineLabel: string;
	previewLabel: string | null;
	encodeFps: number | null;
	onOpenCapabilities?: () => void;
	onOpenHelp?: () => void;
	onOpenConvert?: () => void;
	onOpenAudioCleanup?: () => void;
	/** True when an audio clip is selected — gates the palette's Audio Cleanup action. */
	audioCleanupAvailable?: boolean;
	onOpenAutoCaptions?: () => void;
	onOpenSmartReframe?: () => void;
	onOpenSilenceReview?: () => void;
	onImportKeystrokeOverlay?: () => void;
	keystrokeOverlayAvailable?: boolean;
	onOpenLanguageTools?: () => void;
	onOpenPublish?: () => void;
	onOpenRecord?: () => void;
	onOpenCaptions?: () => void;
	onToggleScopes?: () => void;
	scopesPanelVisible?: boolean;
	scopesPanelAvailable?: boolean;
	onScrollToRenderQueue?: () => void;
	calloutTool?: JSX.Element;
	/** True while a publish session is connecting/live/reconnecting. */
	publishLive?: boolean;
	timelineSnapEnabled: boolean;
	timelineSnapToBeats: boolean;
	onSetTimelineSnapEnabled: (enabled: boolean) => void;
	onSetTimelineSnapToBeats: (enabled: boolean) => void;
	masterGain: number;
	meterSab: SharedArrayBuffer | null;
	onMasterGain: (gain: number) => void;
	locale?: () => StudioLocale;
	onLocaleChange?: (locale: StudioLocale) => void;
	exportControl?: JSX.Element;
}

function formatToolbarTimecode(seconds: number, fps: number | null): string {
	if (!Number.isFinite(seconds) || seconds <= 0) return '00:00:00:00';
	const rate = Math.max(1, fps && Number.isFinite(fps) && fps > 0 ? Math.round(fps) : 30);
	const totalFrames = Math.max(0, Math.round(seconds * rate));
	const frames = totalFrames % rate;
	const totalSeconds = Math.floor(totalFrames / rate);
	const secs = totalSeconds % 60;
	const totalMinutes = Math.floor(totalSeconds / 60);
	const mins = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
		.toString()
		.padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

function formatToolbarDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) return '00:00:00';
	const rounded = Math.round(seconds);
	const secs = rounded % 60;
	const totalMinutes = Math.floor(rounded / 60);
	const mins = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
		.toString()
		.padStart(2, '0')}`;
}

export function Toolbar(props: ToolbarProps) {
	const activeLocale = () => props.locale?.() ?? 'en';
	const copy = () => studioCopy(activeLocale());
	const hasVideo = () => props.metadata?.video != null;
	const transportDisabled = () => props.transportDisabled || !hasVideo();
	const [commandOpen, setCommandOpen] = createSignal(false);
	const timelineModeValues = createMemo(() => {
		const values: string[] = [];
		if (props.timelineSnapEnabled) values.push('snap');
		if (props.timelineSnapEnabled && props.timelineSnapToBeats) values.push('beat');
		return values;
	});
	let importInput: HTMLInputElement | undefined;
	const handleImportInput = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		for (const file of files) {
			props.onImportFile(file);
		}
	};
	const openImport = async () => {
		if (props.importBlocked) return;
		const handled = (await props.onPickImport?.()) ?? false;
		if (!handled) importInput?.click();
	};
	const openCommandPalette = () => {
		setCommandOpen(true);
	};
	onMount(() => {
		const handler = (event: KeyboardEvent) => {
			if (event.defaultPrevented) return;
			const mod = event.metaKey || event.ctrlKey;
			if (!mod || event.altKey || event.shiftKey) return;
			if (event.key.toLowerCase() !== 'k') return;
			const target = event.target;
			if (target instanceof HTMLElement) {
				if (target.isContentEditable) return;
				const tag = target.tagName.toLowerCase();
				if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
			}
			event.preventDefault();
			openCommandPalette();
		};
		window.addEventListener('keydown', handler);
		onCleanup(() => window.removeEventListener('keydown', handler));
	});
	const sourceFormatLabel = () => {
		const video = props.metadata?.video;
		if (!video) return copy().nothingLoaded;
		const fps = video.frameRate ? `${Math.round(video.frameRate)} FPS` : copy().fpsUnknown;
		return `${video.width}×${video.height} · ${fps}`;
	};
	const commandActions = createMemo<CommandAction[]>(() =>
		buildCommandActions({
			locale: activeLocale(),
			importHint: props.importHint,
			importBlocked: props.importBlocked ?? false,
			playing: props.playing(),
			transportDisabled: transportDisabled(),
			audioCleanupAvailable: props.audioCleanupAvailable ?? false,
			languageToolsAvailable: props.onOpenLanguageTools != null,
			onImport: openImport,
			onConvert: () => props.onOpenConvert?.(),
			onPlayPause: props.playing() ? props.onPause : props.onPlay,
			onAudioCleanup: () => props.onOpenAudioCleanup?.(),
			onAutoCaptions: () => props.onOpenAutoCaptions?.(),
			onLanguageTools: () => props.onOpenLanguageTools?.(),
			onSmartReframe: () => props.onOpenSmartReframe?.(),
			onSilenceReview: () => props.onOpenSilenceReview?.(),
			onPublish: () => props.onOpenPublish?.(),
			onCapabilities: () => props.onOpenCapabilities?.(),
			onHelp: () => props.onOpenHelp?.(),
			onOpenRecord: () => props.onOpenRecord?.(),
			onOpenCaptions: () => props.onOpenCaptions?.(),
			onToggleScopes: () => props.onToggleScopes?.(),
			onOpenRenderQueue: () => props.onScrollToRenderQueue?.(),
			scopesPanelAvailable: props.scopesPanelAvailable ?? false
		})
	);
	const runCommand = (action: CommandAction) => {
		if (action.disabled) return;
		void action.onSelect();
		setCommandOpen(false);
	};
	const setTimelineModeValues = (details: { value: string[] }) => {
		const next = new Set(details.value);
		const snapEnabled = next.has('snap');
		props.onSetTimelineSnapEnabled(snapEnabled);
		props.onSetTimelineSnapToBeats(snapEnabled && next.has('beat'));
	};
	// Platform is fixed for the document's lifetime; resolve the label glyphs once.
	const glyphs = modifierGlyphs();
	const menuBarGroups = createMemo<MenuBarGroup[]>(() =>
		buildMenuBarGroups({
			locale: activeLocale(),
			glyphs,
			importBlocked: props.importBlocked ?? false,
			canUndo: props.canUndo,
			canRedo: props.canRedo,
			timelineSnapEnabled: props.timelineSnapEnabled,
			timelineSnapToBeats: props.timelineSnapToBeats,
			hasSelection: props.hasSelection,
			scopesPanelVisible: props.scopesPanelVisible ?? false,
			scopesPanelAvailable: props.scopesPanelAvailable ?? false
		})
	);
	const runMenuItem = (group: MenuBarGroup, value: string) => {
		const item = group.items.find((i) => i.kind === 'item' && i.id === value);
		if (!item || item.kind !== 'item' || item.disabled) return;
		switch (value) {
			case 'import':
				void openImport();
				return;
			case 'convert':
				props.onOpenConvert?.();
				return;
			case 'capabilities':
				props.onOpenCapabilities?.();
				return;
			case 'user-guide':
				props.onOpenHelp?.();
				return;
			case 'undo':
				props.onUndo();
				return;
			case 'redo':
				props.onRedo();
				return;
			case 'snap':
				props.onSetTimelineSnapEnabled(!props.timelineSnapEnabled);
				return;
			case 'beat-snap':
				props.onSetTimelineSnapToBeats(!props.timelineSnapToBeats);
				return;
			case 'scopes':
				props.onToggleScopes?.();
				return;
			case 'render-queue':
				props.onScrollToRenderQueue?.();
				return;
			case 'split':
				props.onSplit();
				return;
			case 'delete':
				props.onDelete();
				return;
		}
	};

	return (
		<header class="toolbar">
			<div class="toolbar-menu">
				<div class="app-brand">
					<span class="app-glyph" aria-hidden="true">
						<Crosshair size={20} strokeWidth={1.6} />
					</span>
<div class="app-brand-copy">
							<h1 class="app-title">LocalCut Studio</h1>
							<span class="app-kicker">{copy().clientNLE}</span>
						</div>
					</div>
					<nav class="toolbar-menu-nav" aria-label={copy().settings}>
						<For each={menuBarGroups()}>
							{(group) => (
								<Menu.Root
									onSelect={(details) => runMenuItem(group, details.value)}
									positioning={{ placement: 'bottom-start', gutter: 6 }}
								>
									<Menu.Trigger
										class="toolbar-menu-item"
										title={copy().openMenu.replace('{n}', group.label)}
									>
										{group.label}
									</Menu.Trigger>
								<Portal>
									<Menu.Positioner>
										<Menu.Content class="command-popover panel toolbar-menu-popover">
											<For each={group.items}>
												{(item) =>
													item.kind === 'separator' ? (
														<Menu.Separator class="toolbar-menu-separator" />
													) : (
														<Menu.Item
															value={item.id}
															disabled={item.disabled}
															class="command-action toolbar-menu-action"
														>
															<span>{item.label}</span>
															<Show when={item.kbd || item.detail}>
																<small>{item.kbd ?? item.detail}</small>
															</Show>
														</Menu.Item>
													)
												}
											</For>
										</Menu.Content>
									</Menu.Positioner>
								</Portal>
							</Menu.Root>
						)}
					</For>
				</nav>
				<Popover.Root
					open={commandOpen()}
					onOpenChange={(details) => setCommandOpen(details.open)}
					positioning={{ placement: 'bottom-end', gutter: 8 }}
				>
<Popover.Trigger class="command-search" aria-label={copy().searchActionsLabel}>
							<Search size={13} aria-hidden="true" />
							<span>{copy().searchActions}</span>
							<kbd>{glyphs.mod}</kbd>
							<kbd>K</kbd>
						</Popover.Trigger>
						<Portal>
							<Popover.Positioner>
								<Popover.Content class="command-popover" aria-label={copy().commandPalette}>
									<header class="command-popover-header">
										<Command size={14} aria-hidden="true" />
										<span>{copy().commandPalette}</span>
									</header>
								<ul class="command-list">
									<For each={commandActions()}>
										{(action) => (
											<li>
												<button
													type="button"
													class="command-action"
													disabled={action.disabled}
													onClick={() => runCommand(action)}
												>
													<span>{action.label}</span>
													<small>{action.detail}</small>
												</button>
											</li>
										)}
									</For>
								</ul>
							</Popover.Content>
						</Popover.Positioner>
					</Portal>
				</Popover.Root>
			</div>
			<div class="toolbar-main">
				<div class="toolbar-left">
					<Button
						variant="default"
						class="import-picker"
						onClick={() => void openImport()}
						disabled={props.importBlocked}
						title={props.importHint ?? undefined}
					>
<FolderOpen size={14} aria-hidden="true" />
							{copy().import}
						</Button>
					<input
						ref={(el) => {
							importInput = el;
						}}
						type="file"
						accept={props.importAccept}
						multiple
						onChange={handleImportInput}
						disabled={props.importBlocked}
						aria-label={copy().import}
						title={props.importHint ?? undefined}
						hidden
					/>
				</div>
				<div class="toolbar-center">
					<span
						class="file-name"
						title={props.metadata?.fileName ?? copy().dropToStart}
					>
						<Show when={props.metadata} fallback={copy().dropToStart}>
							{(meta) => meta().fileName}
						</Show>
					</span>
					<span class="source-format">{sourceFormatLabel()}</span>
				</div>
				<div class="toolbar-right">
<div class="edit-controls" role="group" aria-label={copy().editHistory}>
							<Button
								size="icon"
								onClick={() => props.onUndo()}
								disabled={!props.canUndo}
								aria-label={copy().undo}
								title={copy().undoKbd.replace('{n}', `${glyphs.mod}+Z`)}
							>
								<Undo2 size={14} aria-hidden="true" />
							</Button>
							<Button
								size="icon"
								onClick={() => props.onRedo()}
								disabled={!props.canRedo}
								aria-label={copy().redo}
								title={copy().redoKbd.replace('{n}', `${glyphs.mod}+${glyphs.shift}+Z`)}
							>
								<Redo2 size={14} aria-hidden="true" />
							</Button>
						</div>
						<div class="transport-controls" role="group" aria-label={copy().transport}>
							<Button
								size="icon"
								onClick={() => props.onStep(-1)}
								disabled={transportDisabled()}
								aria-label={copy().stepBackFrame}
								title={copy().stepBackFrameKbd.replace('{n}', 'J')}
							>
								<SkipBack size={14} aria-hidden="true" />
							</Button>
							<Button
								class="transport-play"
								onClick={() => props.onPlay()}
								disabled={transportDisabled() || props.playing()}
								aria-label={copy().playTransport}
								title={copy().playTransportKbd.replace('{n}', 'L')}
							>
								<Play size={14} aria-hidden="true" />
								{copy().play}
							</Button>
							<Button
								onClick={() => props.onPause()}
								disabled={transportDisabled() || !props.playing()}
								aria-label={copy().pauseTransport}
								title={copy().pauseTransportKbd.replace('{n}', 'K')}
							>
								<Pause size={14} aria-hidden="true" />
								{copy().pause}
							</Button>
							<Button
								size="icon"
								onClick={() => props.onStep(1)}
								disabled={transportDisabled()}
								aria-label={copy().stepForwardFrame}
								title={copy().stepForwardFrame}
							>
								<SkipForward size={14} aria-hidden="true" />
							</Button>
							<Button
								size="icon"
								variant={props.loop() ? 'default' : 'secondary'}
								onClick={() => props.onToggleLoop()}
								disabled={transportDisabled()}
								aria-label={copy().loopPlayback}
								aria-pressed={props.loop()}
								title={props.loop() ? copy().loopOn : copy().loopOff}
							>
								<Repeat size={14} aria-hidden="true" />
							</Button>
						</div>
						<div class="toolbar-timecode" aria-label={copy().playbackTimecode}>
						<span>
							{formatToolbarTimecode(props.currentTime(), props.metadata?.video?.frameRate ?? null)}
						</span>
						<small>/</small>
						<span>{formatToolbarDuration(props.duration())}</span>
					</div>
<ToggleGroup.Root
							class="timeline-toggles"
							value={timelineModeValues()}
							multiple
							aria-label={copy().timelineSnapModes}
							onValueChange={setTimelineModeValues}
						>
							<ToggleGroup.Item
								value="snap"
								class="timeline-toggle-status"
								aria-label={copy().toggleTimelineSnap}
								title={copy().toggleTimelineSnap}
							>
								{copy().snap}
							</ToggleGroup.Item>
							<ToggleGroup.Item
								value="beat"
								class="timeline-toggle-status"
								disabled={!props.timelineSnapEnabled}
								aria-label={copy().toggleBeatSnap}
								title={
									props.timelineSnapEnabled ? copy().toggleBeatSnap : copy().enableSnapFirst
								}
							>
								{copy().beat}
							</ToggleGroup.Item>
						</ToggleGroup.Root>
						<div class="master-mix" role="group" aria-label={copy().masterMix}>
						<MeterStrip meterSab={props.meterSab} />
						<label class="master-fader">
							<span class="master-fader-label">{copy().master}</span>
							<input
								type="range"
								class="master-fader-input"
								min={0}
								max={2}
								step={0.01}
								value={props.masterGain}
								onInput={(e) =>
									props.onMasterGain(Number((e.currentTarget as HTMLInputElement).value))
								}
								aria-valuetext={
									Number.isFinite(props.masterGain) ? props.masterGain.toFixed(2) : '0.00'
								}
							/>
							<span class="master-fader-value tabular-nums">
								{Number.isFinite(props.masterGain) ? props.masterGain.toFixed(2) : '0.00'}
							</span>
						</label>
					</div>
					<LocaleSettings locale={activeLocale} onLocaleChange={(locale) => props.onLocaleChange?.(locale)} />
					{props.exportControl}
				</div>
			</div>
<div class="pipeline-strip" aria-label={copy().pipelineStatus}>
					<span
						class={cn(
							'pipeline-chip',
							props.pipelineMode === 'accelerated' && 'is-ok',
							props.pipelineMode === 'limited' && 'is-warn',
							props.pipelineMode === 'starting' && 'is-waiting',
							props.pipelineMode === 'blocked' && 'is-warn'
						)}
					>
						<Gauge size={11} aria-hidden="true" />
						{activeLocale() === 'zh-CN' && props.pipelineLabel === 'Accelerated' ? copy().accelerated : props.pipelineLabel}
					</span>
					<span class="pipeline-chip">
						<Cpu size={11} aria-hidden="true" />
						{copy().client}
					</span>
					<span class={cn('pipeline-chip', props.crossOriginIsolated ? 'is-ok' : 'is-warn')}>
						<ShieldCheck size={11} aria-hidden="true" />
						{props.crossOriginIsolated ? 'COOP/COEP' : copy().noIsolation}
					</span>
				<Show when={props.previewLabel !== null}>
					<span class="pipeline-chip">
						<Activity size={11} aria-hidden="true" />
						PV {props.previewLabel}
					</span>
				</Show>
				<Show when={props.encodeFps !== null}>
					<span class="pipeline-chip">
						<Gauge size={11} aria-hidden="true" />
						{Math.round(props.encodeFps ?? 0)} fps
					</span>
				</Show>
				<span class="pipeline-tools-divider" aria-hidden="true" />
<button
						type="button"
						class={cn('pipeline-chip pipeline-chip-button is-tool', props.publishLive && 'is-live')}
						onClick={() => props.onOpenPublish?.()}
						title={copy().goLiveTitle}
					>
						<Radio size={11} aria-hidden="true" />
						{props.publishLive ? copy().publishLive : copy().goLive}
					</button>
				{/*
				 * IA-T1/D13: the launcher strip is collapsed to frequent + contextual
				 * tools only. Audio Cleanup, Captions, Translate, Reframe, and Silence
				 * are reached through the command palette (⌘K) and menus; Capabilities
				 * and Help have a single home under the `Help` menu.
				 */}
				{props.calloutTool}
				<Show when={props.keystrokeOverlayAvailable}>
<button
							type="button"
							class="pipeline-chip pipeline-chip-button is-tool"
							onClick={() => props.onImportKeystrokeOverlay?.()}
							title={copy().showKeysTitle}
						>
							<Keyboard size={11} aria-hidden="true" />
							{copy().keys}
						</button>
				</Show>
			</div>
		</header>
	);
}
