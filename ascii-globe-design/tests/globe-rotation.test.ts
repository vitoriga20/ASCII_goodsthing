import { expect, it } from 'vitest';
import Globe from '../src/index';

it('keeps a valid multi-line frame after horizontal and vertical rotation', () => {
  const output = new Globe({ size: 0.6, tilt: 23.5 }).render([135, -30]);

  expect(output.split('\n').length).toBeGreaterThan(5);
  expect(output).toMatch(/[#-]/);
});
