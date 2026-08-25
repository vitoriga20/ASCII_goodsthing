import Globe from '../index';
import deathStar from '../maps/death-star';
import { formatRun } from './format';
import {
  applyControls,
  DEFAULT_STATE,
  resetState,
  type DemoControls,
  type DemoState,
} from './state';
import './styles.css';

Globe.maps['death-star'] = deathStar;

const $ = <T extends Element>(selector: string): T => document.querySelector<T>(selector)!;
const globeElement = $<HTMLPreElement>('#globe');
const status = $<HTMLOutputElement>('#status');
const inputs = {
  map: $<HTMLSelectElement>('#map'),
  size: $<HTMLInputElement>('#size'),
  speed: $<HTMLInputElement>('#speed'),
  tilt: $<HTMLInputElement>('#tilt'),
  land: $<HTMLInputElement>('#land'),
  water: $<HTMLInputElement>('#water'),
};

let state: DemoState = { ...DEFAULT_STATE };
let globe = createGlobe(state);
let lastFrame = performance.now();
let pointer: { x: number; y: number } | null = null;

function createGlobe(next: DemoState): Globe {
  return new Globe({
    size: next.size,
    map: Globe.maps[next.map],
    tilt: next.tilt,
    format: (type, length) => formatRun(type, length, next.land, next.water),
  });
}

function render(): void {
  globeElement.innerHTML = globe.render([state.rotationH, state.rotationV]);
}

function sync(): void {
  inputs.map.value = state.map;
  inputs.size.value = String(state.size);
  inputs.speed.value = String(state.speed);
  inputs.tilt.value = String(state.tilt);
  inputs.land.value = state.land;
  inputs.water.value = state.water;
  $<HTMLOutputElement>('#speed-readout').value = state.speed.toFixed(2);
  $<HTMLButtonElement>('#toggle').textContent = state.playing ? 'PAUSE' : 'RESUME';
}

function update(controls: DemoControls): void {
  const next = applyControls(state, controls);
  const mustRebuild = ['map', 'size', 'tilt', 'land', 'water'].some(
    (key) => key in controls && next[key as keyof DemoState] !== state[key as keyof DemoState],
  );

  state = next;
  if (mustRebuild) globe = createGlobe(state);
  sync();
  render();
}

function bindControl<K extends keyof typeof inputs>(key: K): void {
  const input = inputs[key];
  input.addEventListener('change', () => {
    const attempted = input.value;
    update({ [key]: attempted });
    status.value = input.value === attempted ? 'PARAMETERS UPDATED' : 'INPUT NORMALIZED';
  });
}

function animate(now: number): void {
  const elapsed = Math.min(now - lastFrame, 100);
  lastFrame = now;

  if (state.playing) {
    state = applyControls(state, { rotationH: state.rotationH + state.speed * elapsed * 0.06 });
    render();
  }

  requestAnimationFrame(animate);
}

Object.keys(inputs).forEach((key) => bindControl(key as keyof typeof inputs));

$<HTMLButtonElement>('#toggle').addEventListener('click', () => {
  update({ playing: !state.playing });
  status.value = state.playing ? 'ROTATION ACTIVE' : 'ROTATION PAUSED';
});

$<HTMLButtonElement>('#reset').addEventListener('click', () => {
  state = resetState(state);
  globe = createGlobe(state);
  sync();
  render();
  status.value = 'DEFAULTS RESTORED';
});

globeElement.addEventListener('pointerdown', (event) => {
  pointer = { x: event.clientX, y: event.clientY };
  globeElement.setPointerCapture(event.pointerId);
});

globeElement.addEventListener('pointermove', (event) => {
  if (!pointer) return;

  state = applyControls(state, {
    rotationH: state.rotationH + (event.clientX - pointer.x) * 0.5,
    rotationV: state.rotationV + (event.clientY - pointer.y) * 0.5,
  });
  pointer = { x: event.clientX, y: event.clientY };
  render();
});

globeElement.addEventListener('pointerup', () => {
  pointer = null;
});

sync();
render();
requestAnimationFrame(animate);
