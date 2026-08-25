import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { DEFAULT_ASCII_EFFECT, type AsciiEffectParams } from '../engine/ascii-effect';
import { AsciiInspector } from '../ui/AsciiInspector';

const disposers: Array<() => void> = [];

afterEach(() => {
	for (const dispose of disposers) dispose();
	disposers.length = 0;
	document.body.innerHTML = '';
});

function renderAsciiInspector(initial: AsciiEffectParams = DEFAULT_ASCII_EFFECT) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const [value, setValue] = createSignal(initial);
	const onChange = vi.fn((params: Partial<AsciiEffectParams>) => {
		setValue((current) => ({ ...current, ...params }));
	});
	const dispose = render(
		() => <AsciiInspector value={value} onChange={onChange} locale={() => 'en'} />,
		container
	);
	disposers.push(dispose);
	return { container, onChange, value };
}

describe('ASCII live preview toggle', () => {
	it('replaces the old checkbox with a clearly stateful preview button', () => {
		const { container, value } = renderAsciiInspector();
		const toggle = container.querySelector<HTMLButtonElement>(
			'[data-testid="ascii-live-preview-toggle"]'
		);

		expect(container.querySelector('.ascii-switch')).toBeNull();
		expect(toggle).not.toBeNull();
		expect(toggle?.getAttribute('aria-pressed')).toBe('false');
		expect(toggle?.textContent).toContain('Live ASCII Preview');

		toggle!.click();
		expect(value().enabled).toBe(true);
		expect(toggle?.getAttribute('aria-pressed')).toBe('true');
	});

	it('keeps live preview enabled when a preset changes the tuning', () => {
		const { container, value } = renderAsciiInspector({ ...DEFAULT_ASCII_EFFECT, enabled: true });
		const preset = Array.from(container.querySelectorAll<HTMLButtonElement>('.ascii-preset')).find(
			(button) => button.textContent?.includes('Gold Dust')
		);

		preset!.click();
		expect(value()).toMatchObject({ enabled: true, colourMode: 'gold' });
	});
});
