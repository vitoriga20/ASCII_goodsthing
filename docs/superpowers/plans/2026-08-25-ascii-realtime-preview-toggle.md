# ASCII 实时预览开关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一个 ASCII 风格的开关按钮取代 Inspector 顶部“启用”复选框，使用户可以主动开启或关闭右侧的实时 ASCII 预览，并在暂停时立即看到切换结果。

**Architecture:** 保留现有 `AsciiEffectParams.enabled` 和 `set-ascii-effect` worker 命令，UI 仅改变控制形态与默认状态。worker 在接收该命令后更新 `PreviewRenderer`，并通过既有 `PlaybackController.refresh()` 重绘暂停中的当前帧。首先修复阻断 GPU pass 的 WGSL 类型错误。

**Tech Stack:** SolidJS、TypeScript、WebGPU/WGSL、Vitest、现有 Playwright CLI 浏览器验证。

---

## 文件边界

| 文件 | 责任 |
| --- | --- |
| `vedio2ASCII/ascii-studio/src/engine/shaders/ascii.wgsl` | ASCII compute pass；修复向量 `clamp` 的 WGSL 签名。 |
| `vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts` | 防止非法向量 `clamp` 重新进入 shader 源码。 |
| `vedio2ASCII/ascii-studio/src/engine/ascii-effect.ts` | 将默认 ASCII 状态改为关闭。 |
| `vedio2ASCII/ascii-studio/src/engine/worker.ts` | 更新效果后刷新暂停中的当前帧。 |
| `vedio2ASCII/ascii-studio/src/ui/AsciiInspector.tsx` | 移除顶部复选框，添加可访问的实时预览按钮。 |
| `vedio2ASCII/ascii-studio/src/ui/App.tsx` | 将按钮状态和后端可用性传给 Inspector。 |
| `vedio2ASCII/ascii-studio/src/ui/ascii-studio.css` | 定义 ASCII 风格开关的关闭、开启、禁用和焦点状态。 |
| `vedio2ASCII/ascii-studio/src/ui/locale.ts`、`src/ui/locale.test.ts` | 补齐按钮、状态和禁用原因的中英文文案。 |
| `vedio2ASCII/ascii-studio/src/ui/AsciiInspector.test.tsx`（新建） | 验证按钮语义、状态切换与禁用态。 |

### Task 1: 修复并保护真实 ASCII GPU 渲染链

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/engine/shaders/ascii.wgsl:62`
- Modify: `vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts`
- Test: `vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts`

- [ ] **Step 1: 先写失败断言，锁定向量 clamp 的合法上下界**

```ts
it('uses vector clamp bounds when scaling glyph-local coordinates', () => {
  expect(shader).toContain(
    'let scaled = clamp((local - vec2f(0.5)) / u.glyphScale + vec2f(0.5), vec2f(0.0), vec2f(1.0));'
  );
});
```

- [ ] **Step 2: 运行测试，确认它因当前非法标量上下界而失败**

Run: `pnpm exec vp test run src/engine/ascii-shader.test.ts`

Expected: FAIL；失败信息指出期望 `vec2f(0.0)` 与 `vec2f(1.0)`。

- [ ] **Step 3: 只修复该 WGSL 表达式**

将第 62 行替换为：

```wgsl
let scaled = clamp((local - vec2f(0.5)) / u.glyphScale + vec2f(0.5), vec2f(0.0), vec2f(1.0));
```

- [ ] **Step 4: 验证 shader 合约和 ASCII 参数测试**

Run: `pnpm exec vp test run src/engine/ascii-shader.test.ts src/engine/ascii-effect.test.ts src/engine/ascii-pass.test.ts`

Expected: PASS。

- [ ] **Step 5: 在真实 Chromium WebGPU 中验证编译**

启动本地页面、导入短 H.264 样本并开启 ASCII；确认浏览器控制台没有 `Invalid ShaderModule "ascii"`、`Invalid ComputePipeline "ascii"` 或 `Invalid CommandBuffer`。

### Task 2: 将实时预览默认改为关闭，并保证暂停帧立即更新

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/engine/ascii-effect.ts:17-27`
- Modify: `vedio2ASCII/ascii-studio/src/engine/worker.ts:9051-9054`
- Modify: `vedio2ASCII/ascii-studio/src/engine/ascii-effect.test.ts`
- Test: `vedio2ASCII/ascii-studio/src/engine/ascii-effect.test.ts`

- [ ] **Step 1: 写失败测试，明确默认不自动启用效果**

```ts
it('starts with ASCII preview disabled until the user explicitly enables it', () => {
  expect(DEFAULT_ASCII_EFFECT.enabled).toBe(false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec vp test run src/engine/ascii-effect.test.ts`

Expected: FAIL；当前默认值为 `true`。

- [ ] **Step 3: 将默认值改为关闭，保持所有其他默认参数不变**

```ts
export const DEFAULT_ASCII_EFFECT: AsciiEffectParams = {
  enabled: false,
  density: 56,
  glyphScale: 1,
  brightness: 0,
  contrast: 1,
  threshold: 0,
  invert: false,
  edgeStrength: 0,
  colourMode: 'green'
};
```

- [ ] **Step 4: 在 worker 更新效果后刷新暂停中的当前帧**

将命令处理分支调整为：

```ts
case 'set-ascii-effect':
  asciiEffect = normalizeAsciiEffect({ ...asciiEffect, ...cmd.params });
  renderer?.setAsciiEffect(asciiEffect);
  playback?.refresh();
  break;
```

`refresh()` 在播放时是 no-op，在暂停时只重绘当前位置，因此不会建立第二条播放循环。

- [ ] **Step 5: 验证默认值和现有效果测试**

Run: `pnpm exec vp test run src/engine/ascii-effect.test.ts src/engine/ascii-pass.test.ts`

Expected: PASS。

### Task 3: 以 ASCII 风格按钮取代顶部“启用”复选框

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/ui/AsciiInspector.tsx:9-129`
- Create: `vedio2ASCII/ascii-studio/src/ui/AsciiInspector.test.tsx`
- Modify: `vedio2ASCII/ascii-studio/src/ui/locale.ts`
- Modify: `vedio2ASCII/ascii-studio/src/ui/locale.test.ts`

- [ ] **Step 1: 扩展 Inspector 属性并写出失败浏览器组件测试**

新增 `canEnableRealtimePreview` 与 `realtimePreviewUnavailableReason` accessor。测试应断言：按钮在关闭时有 `aria-pressed="false"`，点击发送 `{ enabled: true }`；开启时显示 `ON`；不可用时禁用且描述原因。

```tsx
render(() => <AsciiInspector value={() => ({ ...DEFAULT_ASCII_EFFECT, enabled: false })}
  onChange={onChange} locale={() => 'zh-CN'}
  canEnableRealtimePreview={() => true} realtimePreviewUnavailableReason={() => null} />);
await userEvent.click(screen.getByRole('button', { name: /实时 ASCII 预览.*OFF/i }));
expect(onChange).toHaveBeenCalledWith({ enabled: true });
```

- [ ] **Step 2: 运行新测试确认失败**

Run: `pnpm exec vp test run src/ui/AsciiInspector.test.tsx`

Expected: FAIL；按钮及新增 props 尚不存在。

- [ ] **Step 3: 修改 Inspector 结构**

移除 `.ascii-inspector-heading` 中的 `<label class="ascii-switch">…</label>`。在配色 `<label>` 后增加单一 button；按钮不切换 CSS 以外的局部状态，而是基于 `props.value().enabled` 调用 `props.onChange({ enabled: !enabled })`。

```tsx
<button type="button" class="ascii-realtime-toggle"
  aria-pressed={props.value().enabled}
  aria-label={`${copy().realtimeAsciiPreview}: ${props.value().enabled ? copy().on : copy().off}`}
  disabled={!props.canEnableRealtimePreview()}
  title={props.realtimePreviewUnavailableReason() ?? undefined}
  onClick={() => props.onChange({ enabled: !props.value().enabled })}>
  <span>{copy().realtimeAsciiPreview}</span>
  <span class="ascii-realtime-toggle-state">{props.value().enabled ? copy().on : copy().off}</span>
</button>
```

- [ ] **Step 4: 补齐中英文文案及其测试**

新增 `realtimeAsciiPreview`、`on`、`off`、`realtimePreviewUnavailable`。中文分别为“实时 ASCII 预览”“开启”“关闭”；英文为“Live ASCII preview”“ON”“OFF”。更新 locale 测试，使两种 locale 都具备这些非空字段。

- [ ] **Step 5: 运行 Inspector 与 locale 测试**

Run: `pnpm exec vp test run src/ui/AsciiInspector.test.tsx src/ui/locale.test.ts`

Expected: PASS。

### Task 4: 连接后端能力、视觉状态与应用入口

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/ui/App.tsx:1719-1740,1917-1920,5053`
- Modify: `vedio2ASCII/ascii-studio/src/ui/ascii-studio.css`
- Test: `vedio2ASCII/ascii-studio/src/ui/capabilities.test.ts`

- [ ] **Step 1: 定义开关可用性**

在 `App` 中以 `previewBackend() === 'core-webgpu' || previewBackend() === 'compat-webgpu'` 作为 GPU ASCII 可用条件，并要求已存在可播放视频。Canvas2D 后端不得显示为可用，因为 `CanvasCompatibilityRenderer` 没有 `AsciiPass`。

- [ ] **Step 2: 传递可用性和原因给 Inspector**

```tsx
<AsciiInspector value={asciiEffect} onChange={updateAsciiEffect} locale={studioLocale}
  canEnableRealtimePreview={() => Boolean(metadata()?.video) && asciiPreviewSupported()}
  realtimePreviewUnavailableReason={asciiPreviewUnavailableReason} />
```

`asciiPreviewUnavailableReason` 必须按优先级返回“导入视频后可开启实时 ASCII 预览”“正在初始化预览管线”或“当前浏览器的受限预览模式不支持实时 ASCII 效果”。

- [ ] **Step 3: 实现视觉样式**

为 `.ascii-realtime-toggle` 添加完整宽度、细网格边框、等宽字体、低圆角和 `justify-content: space-between`。为 `[aria-pressed='true']` 使用暖金/荧光绿高亮及右侧状态块；为 `false` 使用低亮深色；为 `:disabled` 降低不透明度并改用 `not-allowed` 光标；为 `:focus-visible` 使用高对比轮廓。禁止仅依靠背景颜色区分状态。

- [ ] **Step 4: 验证能力分级不回归**

Run: `pnpm exec vp test run src/ui/capabilities.test.ts src/ui/AsciiInspector.test.tsx`

Expected: PASS。

### Task 5: 端到端验证与交接

**Files:**
- No source changes expected.

- [ ] **Step 1: 在 Chromium Core WebGPU 路径验证用户流程**

使用 720p 和 1080p H.264 样本分别完成：导入 → 调参数 → 暂停 → 点击 ON → 截图确认右侧当前帧立即字符化 → 点击 OFF → 确认立刻恢复普通合成预览 → 播放并确认状态持续。

- [ ] **Step 2: 验证降级路径**

在 `limited-webcodecs` 夹具或 capability mock 下确认按钮禁用、文案说明 Canvas2D 不支持 ASCII GPU pass，且导入/普通预览不受影响。

- [ ] **Step 3: 检查控制台和诊断指标**

确认无 WGSL/`Invalid ComputePipeline` 错误；开启时 `gpu-submissions-per-frame` 保持 1；使用项目基准的阈值检查 `dropped-preview-frame-rate`，目标低于 5%。

- [ ] **Step 4: 执行质量门禁并隔离既有问题**

Run: `pnpm typecheck`

Run: `pnpm exec vp test run src/engine/ascii-shader.test.ts src/engine/ascii-effect.test.ts src/engine/ascii-pass.test.ts src/engine/gpu.test.ts src/ui/AsciiInspector.test.tsx src/ui/capabilities.test.ts src/ui/locale.test.ts`

Expected: 新增和相关测试全部 PASS。若 `pnpm typecheck` 仍仅报告已知的 Timeline locale props 与 Toolbar 浏览器夹具问题，将其列为独立的既有改动阻塞项，不混入本功能提交。

- [ ] **Step 5: 提交时保持变更边界**

```powershell
git add vedio2ASCII/ascii-studio/src/engine/shaders/ascii.wgsl vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts vedio2ASCII/ascii-studio/src/engine/ascii-effect.ts vedio2ASCII/ascii-studio/src/engine/ascii-effect.test.ts vedio2ASCII/ascii-studio/src/engine/worker.ts vedio2ASCII/ascii-studio/src/ui/AsciiInspector.tsx vedio2ASCII/ascii-studio/src/ui/AsciiInspector.test.tsx vedio2ASCII/ascii-studio/src/ui/App.tsx vedio2ASCII/ascii-studio/src/ui/ascii-studio.css vedio2ASCII/ascii-studio/src/ui/locale.ts vedio2ASCII/ascii-studio/src/ui/locale.test.ts
git commit -m "feat: add live ASCII preview toggle"
```

提交前排除当前工作区中与该功能无关的既有改动。

## 计划自检

- [x] 覆盖：shader 修复、默认关闭、暂停帧立即刷新、按钮语义、能力禁用、视觉状态、真实浏览器验证。
- [x] 无 TBD/TODO 或未定义的实现占位。
- [x] 未扩大到整段预转码或新的导出产品流程。
