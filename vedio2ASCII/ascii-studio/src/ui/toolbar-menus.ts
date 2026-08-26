/**
 * Toolbar menu-bar taxonomy (extracted so the IA invariants are unit-testable
 * without rendering the Ark `Menu` portals).
 *
 * IA design D13: the menu bar is the command *taxonomy*, the toolbar holds
 * frequent actions, and every command has exactly one home. Concretely:
 *   - no per-menu `Search actions…` duplicate (the single `command-search`
 *     Popover trigger + ⌘K own the palette);
 *   - `Browser capabilities` lives only under `Help` (not `View`, not a chip);
 *   - menus that would be left empty by those removals are dropped rather than
 *     shown blank.
 */

import { studioCopy, type StudioLocale } from './locale';
import type { ModifierGlyphs } from './platform';

export type MenuBarItem =
	| { kind: 'separator' }
	| {
			kind: 'item';
			id: string;
			label: string;
			kbd?: string;
			detail?: string;
			disabled?: boolean;
	  };

export interface MenuBarGroup {
	id: string;
	label: string;
	items: readonly MenuBarItem[];
}

export interface MenuBarBuildOptions {
	/** Current UI locale — resolves all labels/details through the copy dict. */
	locale: StudioLocale;
	/** Platform-correct modifier glyphs (⌘/⇧/⌫ on macOS, Ctrl/Shift/Del elsewhere). */
	glyphs: ModifierGlyphs;
	importBlocked: boolean;
	canUndo: boolean;
	canRedo: boolean;
	timelineSnapEnabled: boolean;
	timelineSnapToBeats: boolean;
	/** True when at least one timeline clip is selected — gates `Clip › Split/Delete`. */
	hasSelection: boolean;
	scopesPanelVisible: boolean;
	scopesPanelAvailable: boolean;
}

/**
 * Build the menu-bar groups for the given toolbar state. Pure: no Solid
 * reactivity, no DOM — the component wraps this in a `createMemo`.
 *
 * `Clip › Split at playhead` / `Delete selected` invoke the real timeline
 * handlers (the same ones bound to the `S` / `⌫` shortcuts) and are disabled
 * when nothing is selected — so selecting them acts on the timeline instead of
 * dead-ending in the command palette.
 */
export function buildMenuBarGroups(options: MenuBarBuildOptions): MenuBarGroup[] {
	const { glyphs } = options;
	const copy = studioCopy(options.locale);
	return [
		{
			id: 'project',
			label: copy.project,
			items: [
				{ kind: 'item', id: 'import', label: copy.importMediaMenu, disabled: options.importBlocked },
				{
					kind: 'item',
					id: 'convert',
					label: copy.convertMediaMenu,
					detail: copy.convertMediaDetail
				},
				{ kind: 'item', id: 'render-queue', label: copy.renderQueue }
			]
		},
		{
			id: 'edit',
			label: copy.edit,
			items: [
				{
					kind: 'item',
					id: 'undo',
					label: copy.undo,
					kbd: `${glyphs.mod}+Z`,
					disabled: !options.canUndo
				},
				{
					kind: 'item',
					id: 'redo',
					label: copy.redo,
					kbd: `${glyphs.mod}+${glyphs.shift}+Z`,
					disabled: !options.canRedo
				}
			]
		},
		{
			id: 'view',
			label: copy.view,
			items: [
				{
					kind: 'item',
					id: 'scopes',
					label: options.scopesPanelVisible ? copy.hideScopes : copy.showScopes,
					disabled: !options.scopesPanelAvailable
				}
			]
		},
		{
			id: 'clip',
			label: copy.clip,
			items: [
				// Real timeline actions (wired to onSplit/onDelete in the component),
				// disabled when nothing is selected so selecting them never dead-ends in
				// the palette. No `detail`: the template renders `kbd ?? detail`, so the
				// kbd hint already wins (a bare `detail` would have been dead).
				{
					kind: 'item',
					id: 'split',
					label: copy.splitAtPlayhead,
					kbd: 'S',
					disabled: !options.hasSelection
				},
				{
					kind: 'item',
					id: 'delete',
					label: copy.deleteSelected,
					kbd: glyphs.del,
					disabled: !options.hasSelection
				}
			]
		},
		{
			id: 'timeline',
			label: copy.timeline,
			items: [
				{
					kind: 'item',
					id: 'snap',
					label: options.timelineSnapEnabled ? copy.disableSnap : copy.enableSnap
				},
				{
					kind: 'item',
					id: 'beat-snap',
					label: options.timelineSnapToBeats
						? copy.disableBeatSnap
						: copy.enableBeatSnap,
					disabled: !options.timelineSnapEnabled
				}
			]
		},
		{
			id: 'help',
			label: copy.help,
			items: [
				{ kind: 'item', id: 'user-guide', label: copy.userGuide },
				{ kind: 'item', id: 'capabilities', label: copy.browserCapabilities }
			]
		}
	];
}

export interface CommandAction {
	label: string;
	detail: string;
	disabled?: boolean;
	onSelect: () => void | Promise<void>;
}

export interface CommandActionsBuildOptions {
	/** Current UI locale — resolves all labels/details through the copy dict. */
	locale: StudioLocale;
	importHint?: string | null;
	importBlocked: boolean;
	playing: boolean;
	transportDisabled: boolean;
	/** True when an audio clip is selected — gates the Audio Cleanup action. */
	audioCleanupAvailable: boolean;
	/** True only when the on-device language tools are supported/visible. */
	languageToolsAvailable: boolean;
	onImport: () => void | Promise<void>;
	onConvert: () => void;
	/** Resolved to play or pause by the caller per the current `playing` state. */
	onPlayPause: () => void;
	onAudioCleanup: () => void;
	onAutoCaptions: () => void;
	onLanguageTools: () => void;
	onSmartReframe: () => void;
	onSilenceReview: () => void;
	onPublish: () => void;
	onCapabilities: () => void;
	onHelp: () => void;
	onOpenRecord: () => void;
	onOpenCaptions: () => void;
	onToggleScopes: () => void;
	onOpenRenderQueue: () => void;
	scopesPanelAvailable: boolean;
}

/**
 * Build the command-palette (⌘K) action list. Pure — no Solid reactivity, no
 * DOM — so the IA routing/gating invariants (D13: infrequent launchers live in
 * the palette; D12: Audio Cleanup is clip-gated) are unit-testable without
 * opening the Ark `Popover`.
 *
 * The launcher strip was collapsed (IA-T1.4), so Audio Cleanup, Auto captions,
 * Translate, Smart reframe, and Remove silences are reachable here.
 */
export function buildCommandActions(options: CommandActionsBuildOptions): CommandAction[] {
	const copy = studioCopy(options.locale);
	return [
		{
			label: copy.importMedia,
			detail: options.importHint ?? copy.importMediaDetail,
			disabled: options.importBlocked,
			onSelect: options.onImport
		},
		{
			// Index 1 stays the play/pause entry (asserted by tests); keep this after it.
			label: options.playing ? copy.pauseTransport : copy.playTransport,
			detail: copy.previewPlayback,
			disabled: options.transportDisabled,
			onSelect: options.onPlayPause
		},
		{
			label: copy.convertMedia,
			detail: copy.convertMediaCommandDetail,
			onSelect: options.onConvert
		},
		{
			label: copy.audioCleanup,
			detail: options.audioCleanupAvailable
				? copy.audioCleanupDetail
				: copy.selectAudioClipFirst,
			disabled: !options.audioCleanupAvailable,
			onSelect: options.onAudioCleanup
		},
		{
			label: copy.autoCaptions,
			detail: copy.autoCaptionsDetail,
			onSelect: options.onAutoCaptions
		},
		...(options.languageToolsAvailable
			? [
					{
						// Broader than "Translate" so the Draft titles/hashtags flow in the
						// same panel stays discoverable — this is its only launcher.
						label: copy.languageTools,
						detail: copy.languageToolsDetail,
						onSelect: options.onLanguageTools
					}
				]
			: []),
		{
			label: copy.smartReframe,
			detail: copy.smartReframeDetail,
			onSelect: options.onSmartReframe
		},
		{
			label: copy.removeSilences,
			detail: copy.removeSilencesDetail,
			onSelect: options.onSilenceReview
		},
		{
			label: copy.record,
			detail: copy.recordDetail,
			onSelect: options.onOpenRecord
		},
		{
			label: copy.captionsCommand,
			detail: copy.captionsDetail,
			onSelect: options.onOpenCaptions
		},
		{
			label: copy.viewScopes,
			detail: options.scopesPanelAvailable
				? copy.viewScopesDetail
				: copy.scopesRequireWebGpu,
			disabled: !options.scopesPanelAvailable,
			onSelect: options.onToggleScopes
		},
		{
			label: copy.renderQueue,
			detail: copy.renderQueueDetail,
			onSelect: options.onOpenRenderQueue
		},
		{
			label: copy.goLiveCommand,
			detail: copy.goLiveDetail,
			onSelect: options.onPublish
		},
		{
			label: copy.browserCapabilities,
			detail: copy.browserCapabilitiesDetail,
			onSelect: options.onCapabilities
		},
		{
			label: copy.userGuide,
			detail: copy.userGuideDetail,
			onSelect: options.onHelp
		}
	];
}
