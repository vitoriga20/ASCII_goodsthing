import { describe, expect, it } from 'vitest';
import Globe from '../src/index';
import deathStar from '../src/maps/death-star';

describe('Globe', () => {
  it('renders a non-empty multi-line default Earth globe', () => {
    const output = new Globe({ size: 0.6 }).render(0);

    expect(output.split('\n').length).toBeGreaterThan(5);
    expect(output).toContain('#');
  });

  it('renders the bundled Death Star map', () => {
    const output = new Globe({
      size: 0.6,
      map: deathStar,
      land: '#',
      water: '.',
    }).render(45);

    expect(output).toContain('#');
    expect(output).toContain('.');
  });
});
