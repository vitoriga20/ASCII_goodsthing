import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, applyControls, resetState } from '../src/demo/state';

describe('demo state', () => {
  it('clamps numeric controls to supported ranges', () => {
    const next = applyControls(DEFAULT_STATE, {
      size: 9,
      speed: -1,
      tilt: 120,
      rotationV: -200,
    });

    expect(next).toMatchObject({ size: 2, speed: 0, tilt: 90, rotationV: -90 });
  });

  it('falls back to default glyphs for blank or multi-character values', () => {
    const next = applyControls(DEFAULT_STATE, { land: '##', water: ' ' });

    expect(next).toMatchObject({ land: '#', water: '-' });
  });

  it('restores every default control', () => {
    const changed = applyControls(DEFAULT_STATE, {
      map: 'death-star',
      size: 1.8,
      playing: false,
    });

    expect(resetState(changed)).toEqual(DEFAULT_STATE);
  });
});
