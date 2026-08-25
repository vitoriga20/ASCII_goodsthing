export type MapName = 'earth' | 'death-star';

export interface DemoState {
  map: MapName;
  size: number;
  speed: number;
  tilt: number;
  land: string;
  water: string;
  rotationH: number;
  rotationV: number;
  playing: boolean;
}

export type DemoControls = Partial<Record<keyof DemoState, unknown>>;

export const DEFAULT_STATE: DemoState = {
  map: 'earth',
  size: 1.1,
  speed: 0.7,
  tilt: 23.5,
  land: '#',
  water: '-',
  rotationH: 0,
  rotationV: 0,
  playing: true,
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function glyph(value: unknown, fallback: string): string {
  return typeof value === 'string' && [...value.trim()].length === 1
    ? value.trim()
    : fallback;
}

export function applyControls(state: DemoState, controls: DemoControls): DemoState {
  return {
    map: controls.map === 'death-star'
      ? 'death-star'
      : controls.map === 'earth'
        ? 'earth'
        : state.map,
    size: clamp(controls.size, 0.6, 2, state.size),
    speed: clamp(controls.speed, 0, 3, state.speed),
    tilt: clamp(controls.tilt, -90, 90, state.tilt),
    land: glyph(controls.land, DEFAULT_STATE.land),
    water: glyph(controls.water, DEFAULT_STATE.water),
    rotationH: clamp(controls.rotationH, -360, 360, state.rotationH),
    rotationV: clamp(controls.rotationV, -90, 90, state.rotationV),
    playing: typeof controls.playing === 'boolean' ? controls.playing : state.playing,
  };
}

export function resetState(_state: DemoState): DemoState {
  return { ...DEFAULT_STATE };
}
