import { expect, it } from 'vitest';
import { escapeHtml, formatRun } from '../src/demo/format';

it('escapes characters that are unsafe in HTML output', () => {
  expect(escapeHtml('<&>\'"')).toBe('&lt;&amp;&gt;&#39;&quot;');
});

it('formats land and water runs with their semantic color classes', () => {
  expect(formatRun(2, 3, '#', '-')).toBe('<span class="cell-2">###</span>');
  expect(formatRun(1, 2, '#', '<')).toBe('<span class="cell-1">&lt;&lt;</span>');
});
