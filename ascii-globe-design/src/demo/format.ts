const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => HTML_ENTITIES[character]);
}

export function formatRun(type: number, length: number, land: string, water: string): string {
  const glyph = type === 2 ? land : type === 1 ? water : ' ';

  return `<span class="cell-${type}">${escapeHtml(glyph).repeat(length)}</span>`;
}
