import { studioCopy, studioLocale } from './locale';

/**
 * Right-rail tab taxonomy. Tab constants carry stable ids (and capability
 * gating) only; human labels are resolved through the locale copy dict by
 * `sideRailTabLabel` (primary rail) and the `*SideRailTabLabel` resolvers
 * (secondary rails), which App.tsx maps into the SecondaryRailTabs props.
 */
export const SIDE_RAIL_TABS = [
	{ id: 'inspector' },
	{ id: 'text' },
	{ id: 'audio' },
	{ id: 'capture' }
] as const;

export type SideRailTab = (typeof SIDE_RAIL_TABS)[number]['id'];

export const TEXT_SIDE_RAIL_TABS = [
	{ id: 'captions' },
	{ id: 'language-tools', availability: 'language-tools-surface' }
] as const;

export type TextSideRailTabDefinition = (typeof TEXT_SIDE_RAIL_TABS)[number];
export type TextSideRailTab = (typeof TEXT_SIDE_RAIL_TABS)[number]['id'];

function textSideRailTabVisible(
	tab: TextSideRailTabDefinition,
	languageToolsVisible: boolean
): boolean {
	if ('availability' in tab && tab.availability === 'language-tools-surface') {
		return languageToolsVisible;
	}
	return true;
}

export function visibleTextSideRailTabs(
	languageToolsVisible: boolean
): readonly TextSideRailTabDefinition[] {
	return TEXT_SIDE_RAIL_TABS.filter((tab) => textSideRailTabVisible(tab, languageToolsVisible));
}

export const AUDIO_SIDE_RAIL_TABS = [
	{ id: 'live-chain' },
	{ id: 'voice-fx' }
] as const;

export type AudioSideRailTab = (typeof AUDIO_SIDE_RAIL_TABS)[number]['id'];

export const CAPTURE_SIDE_RAIL_TABS = [
	{ id: 'record' },
	{ id: 'program' },
	{ id: 'publish' }
] as const;

export type CaptureSideRailTab = (typeof CAPTURE_SIDE_RAIL_TABS)[number]['id'];

export const SIDE_RAIL_COLLAPSED_KEY = 'side-rail-collapsed';

export function isSideRailTab(value: string | null): value is SideRailTab {
	return SIDE_RAIL_TABS.some((tab) => tab.id === value);
}

/** Visible label for a primary rail destination (expand strip, aria, titles). */
export function sideRailTabLabel(tab: SideRailTab): string {
	const copy = studioCopy(studioLocale());
	switch (tab) {
		case 'inspector': return copy.inspector;
		case 'text': return copy.text;
		case 'audio': return copy.audio;
		case 'capture': return copy.capture;
	}
}

/** Visible label for a secondary Text rail destination. */
export function textSideRailTabLabel(tab: TextSideRailTab): string {
	const copy = studioCopy(studioLocale());
	switch (tab) {
		case 'captions': return copy.captionsTab;
		case 'language-tools': return copy.languageToolsTab;
	}
}

/** Visible label for a secondary Audio rail destination. */
export function audioSideRailTabLabel(tab: AudioSideRailTab): string {
	const copy = studioCopy(studioLocale());
	switch (tab) {
		case 'live-chain': return copy.liveChain;
		case 'voice-fx': return copy.voiceFx;
	}
}

/** Visible label for a secondary Capture rail destination. */
export function captureSideRailTabLabel(tab: CaptureSideRailTab): string {
	const copy = studioCopy(studioLocale());
	switch (tab) {
		case 'record': return copy.record;
		case 'program': return copy.program;
		case 'publish': return copy.goLive;
	}
}

export function sideRailTabTriggerId(tab: SideRailTab): string {
	return `tab-${tab}`;
}

export function sideRailTabPanelId(tab: SideRailTab): string {
	return `panel-${tab}`;
}

export function migrateLegacySideRailTab(value: string | null): SideRailTab | null {
	switch (value) {
		case 'inspector':
		case 'text':
		case 'audio':
		case 'capture':
			return value;
		case 'captions':
			return 'text';
		case 'live-audio':
		case 'voice-cleanup':
			return 'audio';
		case 'record':
		case 'program':
		case 'replay':
			return 'capture';
		default:
			return null;
	}
}