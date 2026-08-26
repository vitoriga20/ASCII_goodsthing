# ASCII Globe Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 在 \`ascii-globe-design\` 交付可复用的 TypeScript ASCII 地球库，以及带 Instrument Deck 参数面板的浏览器演示页。

**Architecture:** 核心渲染器和地图数据按参考项目原样迁移；\`state.ts\` 负责输入规范化与重置；\`main.ts\` 将状态转换为 \`Globe\` 实例、动画帧和 DOM 更新。演示页不依赖前端框架。

**Tech Stack:** TypeScript、Vite、Vitest、原生 DOM/CSS。

---

## 文件边界

| 文件 | 职责 |
| --- | --- |
| \`package.json\`、\`tsconfig.json\`、\`vite.config.ts\` | 开发、测试与构建配置。 |
| \`src/index.ts\`、\`src/decode.ts\`、\`src/maps/*.ts\` | 可导入的渲染核心与内置纹理。 |
| \`src/demo/state.ts\` | 控件范围、字形回退、默认值、重置。 |
| \`src/demo/main.ts\` | 实例工厂、转义格式化、绘制、动画、拖拽和事件。 |
| \`src/demo/styles.css\` 与 \`index.html\` | Instrument Deck 结构、视觉和响应式布局。 |
| \`tests/*.test.ts\` | 核心渲染与状态转换回归测试。 |

### Task 1: 创建测试与构建骨架

**Files:**
- Create: \`ascii-globe-design/package.json\`
- Create: \`ascii-globe-design/tsconfig.json\`
- Create: \`ascii-globe-design/vite.config.ts\`
- Create: \`ascii-globe-design/tests/globe.test.ts\`

- [ ] **Step 1: 写出核心渲染的失败测试**

\`\`\`ts
import { describe, expect, it } from 'vitest';
import Globe from '../src/index';
import deathStar from '../src/maps/death-star';

describe('Globe', () => {
  it('renders a non-empty multi-line default Earth globe', () => {
    const output = new Globe({ size: 0.6 }).render(0);
    expect(output.split('\\n').length).toBeGreaterThan(5);
    expect(output).toContain('#');
  });

  it('renders the bundled Death Star map', () => {
    const output = new Globe({ size: 0.6, map: deathStar, land: '#', water: '.' }).render(45);
    expect(output).toContain('#');
    expect(output).toContain('.');
  });
});
\`\`\`

- [ ] **Step 2: 建立最小开发配置**

\`\`\`json
{
  "name": "ascii-globe-design",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc --noEmit && vite build", "test": "vitest run" },
  "devDependencies": { "typescript": "^5.7.3", "vite": "^6.1.0", "vitest": "^3.0.5" }
}
\`\`\`

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "noEmit": true, "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
\`\`\`

\`\`\`ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
\`\`\`

- [ ] **Step 3: 安装依赖并确认测试正确失败**

Run: \`npm install\`

Run: \`npm test -- --run tests/globe.test.ts\`

Expected: 依赖安装成功；测试因 \`../src/index\` 和地图模块尚不存在而失败，不能因测试语法失败。

- [ ] **Step 4: 提交骨架**

\`\`\`bash
git add ascii-globe-design/package.json ascii-globe-design/package-lock.json ascii-globe-design/tsconfig.json ascii-globe-design/vite.config.ts ascii-globe-design/tests/globe.test.ts
git commit -m "chore: set up ascii globe project"
\`\`\`

### Task 2: 迁移并验证渲染核心

**Files:**
- Create: \`ascii-globe-design/src/index.ts\`
- Create: \`ascii-globe-design/src/decode.ts\`
- Create: \`ascii-globe-design/src/maps/earth.ts\`
- Create: \`ascii-globe-design/src/maps/death-star.ts\`
- Modify: \`ascii-globe-design/tests/globe.test.ts\`

- [ ] **Step 1: 从参考项目复制已被 Task 1 覆盖的源码**

\`\`\`powershell
Copy-Item -LiteralPath '..\\参考\\ascii-globe-master\\src\\index.ts' -Destination '.\\src\\index.ts'
Copy-Item -LiteralPath '..\\参考\\ascii-globe-master\\src\\decode.ts' -Destination '.\\src\\decode.ts'
Copy-Item -LiteralPath '..\\参考\\ascii-globe-master\\src\\maps\\earth.ts' -Destination '.\\src\\maps\\earth.ts'
Copy-Item -LiteralPath '..\\参考\\ascii-globe-master\\src\\maps\\death-star.ts' -Destination '.\\src\\maps\\death-star.ts'
\`\`\`

- [ ] **Step 2: 运行测试，确认迁移使其通过**

Run: \`npm test -- --run tests/globe.test.ts\`

Expected: PASS，2 个用例通过。

- [ ] **Step 3: 增加旋转稳定性测试并确认通过**

\`\`\`ts
it('keeps a valid multi-line frame after horizontal and vertical rotation', () => {
  const output = new Globe({ size: 0.6, tilt: 23.5 }).render([135, -30]);
  expect(output.split('\\n').length).toBeGreaterThan(5);
  expect(output).toMatch(/[#-]/);
});
\`\`\`

Run: \`npm test -- --run tests/globe.test.ts\`

Expected: PASS。若失败，仅修复迁移中的导入或纹理损坏，不修改参考渲染算法。

- [ ] **Step 4: 提交渲染库**

\`\`\`bash
git add ascii-globe-design/src/index.ts ascii-globe-design/src/decode.ts ascii-globe-design/src/maps ascii-globe-design/tests/globe.test.ts
git commit -m "feat: migrate ascii globe renderer"
\`\`\`

### Task 3: 用测试先行实现参数状态

**Files:**
- Create: \`ascii-globe-design/src/demo/state.ts\`
- Create: \`ascii-globe-design/tests/state.test.ts\`

- [ ] **Step 1: 写出状态边界的失败测试**

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, applyControls, resetState } from '../src/demo/state';

describe('demo state', () => {
  it('clamps numeric controls to supported ranges', () => {
    const next = applyControls(DEFAULT_STATE, { size: 9, speed: -1, tilt: 120, rotationV: -200 });
    expect(next).toMatchObject({ size: 2, speed: 0, tilt: 90, rotationV: -90 });
  });
  it('falls back to default glyphs for blank or multi-character values', () => {
    expect(applyControls(DEFAULT_STATE, { land: '##', water: ' ' })).toMatchObject({ land: '#', water: '-' });
  });
  it('restores every default control', () => {
    expect(resetState(applyControls(DEFAULT_STATE, { map: 'death-star', size: 1.8, playing: false }))).toEqual(DEFAULT_STATE);
  });
});
\`\`\`

- [ ] **Step 2: 运行失败测试**

Run: \`npm test -- --run tests/state.test.ts\`

Expected: FAIL，错误仅为 \`../src/demo/state\` 不存在。

- [ ] **Step 3: 写出最小状态模块**

\`\`\`ts
export type MapName = 'earth' | 'death-star';
export interface DemoState {
  map: MapName; size: number; speed: number; tilt: number; land: string; water: string;
  rotationH: number; rotationV: number; playing: boolean;
}
export type DemoControls = Partial<Record<keyof DemoState, unknown>>;
export const DEFAULT_STATE: DemoState = {
  map: 'earth', size: 1.1, speed: 0.7, tilt: 23.5, land: '#', water: '-',
  rotationH: 0, rotationV: 0, playing: true,
};
const number = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const glyph = (value: unknown, fallback: string) =>
  typeof value === 'string' && [...value.trim()].length === 1 ? value.trim() : fallback;
export function applyControls(state: DemoState, controls: DemoControls): DemoState {
  return {
    map: controls.map === 'death-star' ? 'death-star' : controls.map === 'earth' ? 'earth' : state.map,
    size: number(controls.size, 0.6, 2, state.size), speed: number(controls.speed, 0, 3, state.speed),
    tilt: number(controls.tilt, -90, 90, state.tilt), land: glyph(controls.land, DEFAULT_STATE.land),
    water: glyph(controls.water, DEFAULT_STATE.water), rotationH: number(controls.rotationH, -360, 360, state.rotationH),
    rotationV: number(controls.rotationV, -90, 90, state.rotationV),
    playing: typeof controls.playing === 'boolean' ? controls.playing : state.playing,
  };
}
export const resetState = (_state: DemoState): DemoState => ({ ...DEFAULT_STATE });
\`\`\`

- [ ] **Step 4: 验证状态模块由红变绿并提交**

Run: \`npm test -- --run tests/state.test.ts\`

Expected: PASS，3 个用例通过。

\`\`\`bash
git add ascii-globe-design/src/demo/state.ts ascii-globe-design/tests/state.test.ts
git commit -m "feat: add globe demo control state"
\`\`\`

### Task 4: 实现 Instrument Deck 演示页

**Files:**
- Create: \`ascii-globe-design/index.html\`
- Create: \`ascii-globe-design/src/demo/main.ts\`
- Create: \`ascii-globe-design/src/demo/styles.css\`

- [ ] **Step 1: 创建语义化页面结构**

\`\`\`html
<main class="app-shell">
  <header class="masthead"><p>ASCII GLOBE / LIVE RENDERER</p><h1>PLANETARY SIGNAL</h1><output id="status" aria-live="polite">SYSTEM READY</output></header>
  <section class="globe-stage" aria-label="可拖拽的 ASCII 地球"><pre id="globe" tabindex="0"></pre></section>
  <section class="instrument-deck" aria-label="渲染参数">
    <label class="speed-dial">SPEED <output id="speed-readout">0.70</output><input id="speed" type="range" min="0" max="3" step="0.05" value="0.7"></label>
    <div class="readout-stack"><label>SCALE <input id="size" type="number" min="0.6" max="2" step="0.1" value="1.1"></label><label>TILT <input id="tilt" type="number" min="-90" max="90" step="0.5" value="23.5"></label><label>LAND <input id="land" maxlength="1" value="#"></label><label>WATER <input id="water" maxlength="1" value="-"></label></div>
    <div class="action-stack"><label>MAP <select id="map"><option value="earth">EARTH</option><option value="death-star">DEATH STAR</option></select></label><button id="toggle" type="button">PAUSE</button><button id="reset" type="button">RESET</button></div>
  </section>
</main>
<script type="module" src="/src/demo/main.ts"></script>
\`\`\`

- [ ] **Step 2: 实现渲染、动画、转义和控件绑定**

\`\`\`ts
import Globe from '../index';
import deathStar from '../maps/death-star';
import { applyControls, DEFAULT_STATE, resetState, type DemoControls, type DemoState } from './state';
import './styles.css';
Globe.maps['death-star'] = deathStar;
const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const pre = $<HTMLPreElement>('#globe');
const status = $<HTMLOutputElement>('#status');
const inputs = { map: $<HTMLSelectElement>('#map'), size: $<HTMLInputElement>('#size'), speed: $<HTMLInputElement>('#speed'), tilt: $<HTMLInputElement>('#tilt'), land: $<HTMLInputElement>('#land'), water: $<HTMLInputElement>('#water') };
let state: DemoState = { ...DEFAULT_STATE };
let globe = createGlobe(state);
let last = performance.now();
let point: { x: number; y: number } | null = null;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]!);
function createGlobe(next: DemoState) {
  return new Globe({ size: next.size, map: Globe.maps[next.map], tilt: next.tilt,
    format: (type, length) => \`<span class="cell-\${type}">\${escapeHtml(type === 2 ? next.land : type === 1 ? next.water : ' ')}</span>\`.repeat(length) });
}
function sync() {
  inputs.map.value = state.map; inputs.size.value = String(state.size); inputs.speed.value = String(state.speed); inputs.tilt.value = String(state.tilt); inputs.land.value = state.land; inputs.water.value = state.water;
  $<HTMLOutputElement>('#speed-readout').value = state.speed.toFixed(2); $<HTMLButtonElement>('#toggle').textContent = state.playing ? 'PAUSE' : 'RESUME';
}
function render() { pre.innerHTML = globe.render([state.rotationH, state.rotationV]); }
function update(controls: DemoControls) { state = applyControls(state, controls); globe = createGlobe(state); sync(); render(); }
function frame(now: number) { const elapsed = Math.min(now - last, 100); last = now; if (state.playing) update({ rotationH: state.rotationH + state.speed * elapsed * 0.06 }); requestAnimationFrame(frame); }
Object.entries(inputs).forEach(([key, input]) => input.addEventListener('change', () => update({ [key]: input.value })));
$<HTMLButtonElement>('#toggle').addEventListener('click', () => update({ playing: !state.playing }));
$<HTMLButtonElement>('#reset').addEventListener('click', () => { state = resetState(state); globe = createGlobe(state); status.value = 'DEFAULTS RESTORED'; sync(); render(); });
pre.addEventListener('pointerdown', event => { point = { x: event.clientX, y: event.clientY }; pre.setPointerCapture(event.pointerId); });
pre.addEventListener('pointermove', event => { if (!point) return; update({ rotationH: state.rotationH + (event.clientX - point.x) * .5, rotationV: state.rotationV + (event.clientY - point.y) * .5 }); point = { x: event.clientX, y: event.clientY }; });
pre.addEventListener('pointerup', () => { point = null; });
sync(); render(); requestAnimationFrame(frame);
\`\`\`

- [ ] **Step 3: 实现完整的终端仪表台视觉和窄屏规则**

\`\`\`css
:root{color-scheme:dark;font-family:ui-monospace,Consolas,monospace;background:#071008;color:#dcffd2}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 10%,#1d3824 0,#071008 55%)}.app-shell{width:min(1100px,calc(100% - 32px));margin:auto;padding:32px 0}.masthead{display:flex;align-items:end;gap:16px;border-bottom:1px solid #31553c}.masthead p,#status{color:#d5ff39;font-size:.72rem;letter-spacing:.12em}h1{margin:.4rem 0;font-size:clamp(2rem,8vw,5rem);letter-spacing:-.1em}.globe-stage{min-height:420px;display:grid;place-items:center;overflow:auto}#globe{cursor:grab;color:#bbffbb;font-weight:700;line-height:.86;text-shadow:0 0 10px #5aff89}#globe:active{cursor:grabbing}.cell-1{color:#72f6d5}.cell-2{color:#bbffbb}.instrument-deck{display:grid;grid-template-columns:120px 1fr 155px;gap:10px;border:1px solid #31553c;padding:12px;background:#0c160f;box-shadow:inset 0 0 32px #00ff2a0d}.speed-dial{aspect-ratio:1;border:1px solid #5c8d64;border-radius:50%;display:grid;place-items:center;padding:14px;color:#d5ff39}.speed-dial output{color:#72f6d5;font-size:1.45rem}.readout-stack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.readout-stack label,.action-stack label{color:#7fa987;font-size:.7rem;letter-spacing:.08em}input,select,button{width:100%;margin-top:4px;border:1px solid #426b4b;background:#081109;color:#dcffd2;font:inherit;padding:8px}button:first-of-type{background:#d5ff39;color:#071008;font-weight:800}.action-stack{display:grid;gap:8px;align-content:start}input:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid #72f6d5;outline-offset:2px}@media(max-width:700px){.instrument-deck{grid-template-columns:1fr}.speed-dial{width:120px}.action-stack{grid-template-columns:repeat(3,1fr);align-items:end}}
\`\`\`

- [ ] **Step 4: 构建并手工验收**

Run: \`npm run build\`

Expected: PASS，无 TypeScript 错误。

Run: \`npm run dev\`

Expected: 在浏览器验证 Earth/Death Star、尺寸、速度、倾角、字符、暂停、重置、鼠标拖拽、触摸拖拽与窄屏堆叠。

- [ ] **Step 5: 提交演示页**

\`\`\`bash
git add ascii-globe-design/index.html ascii-globe-design/src/demo/main.ts ascii-globe-design/src/demo/styles.css
git commit -m "feat: add ascii globe instrument deck demo"
\`\`\`

### Task 5: 全量验证

**Files:**
- Modify: \`ascii-globe-design/tests/globe.test.ts\`
- Modify: \`ascii-globe-design/tests/state.test.ts\`

- [ ] **Step 1: 运行全量测试**

Run: \`npm test\`

Expected: PASS，核心渲染和状态测试全部通过。

- [ ] **Step 2: 运行生产构建**

Run: \`npm run build\`

Expected: PASS，无 TypeScript 错误。

- [ ] **Step 3: 检查键盘可访问性**

在浏览器依次按 Tab 聚焦地图、速度、尺寸、倾角、字符、地图预设、暂停和重置。每一项必须有可见焦点，窄屏时控件不重叠、不被裁切。

- [ ] **Step 4: 仅在产生最终修正时提交**

\`\`\`bash
git add ascii-globe-design/tests ascii-globe-design/src/demo
git commit -m "test: verify ascii globe demo behavior"
\`\`\`

