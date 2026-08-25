# ASCII 字符预览与方块拉杆 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 让右侧预览以真实 ASCII 字符实时呈现视频，并把 Inspector 开关改为“实时渲染”左标签、右方块拉杆。

**Architecture:** 保留现有 AsciiEffectParams、set-ascii-effect 与 GPU compositing 链路。替换 WGSL 的抽象线条遮罩为 5×7 位图字符遮罩，避免高亮整格填充；UI 只重构现有开关，并用 worker 对命令应用的确认作为慢启动时的临时预览反馈。

**Tech Stack:** SolidJS、TypeScript、WebGPU/WGSL、Vite Plus/Vitest、Chromium WebGPU 验证。

---

## 文件边界

| 文件 | 责任 |
| --- | --- |
| vedio2ASCII/ascii-studio/src/engine/shaders/ascii.wgsl | 用 5×7 位图 ASCII 字符替换线条/圆环遮罩。 |
| vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts | 锁定字符图集、像素寻址与禁止整格亮部填充。 |
| vedio2ASCII/ascii-studio/src/protocol.ts | 增加 worker 对 ASCII 命令已应用的确认消息。 |
| vedio2ASCII/ascii-studio/src/protocol.test.ts | 保护确认消息的类型合约。 |
| vedio2ASCII/ascii-studio/src/engine/worker.ts | 应用参数、刷新暂停帧并发送确认。 |
| vedio2ASCII/ascii-studio/src/ui/App.tsx | 管理 350 ms 慢启动计时、接收确认、渲染临时覆盖层。 |
| vedio2ASCII/ascii-studio/src/ui/AsciiInspector.tsx | 把“标题 + 状态小按钮”改为左文字、右方块拉杆。 |
| vedio2ASCII/ascii-studio/src/ui/ascii-studio.css | 定义矩形槽、方块滑块和等待覆盖层。 |
| vedio2ASCII/ascii-studio/src/ui/locale.ts 和 src/ui/locale.test.ts | 提供中英文文案。 |
| vedio2ASCII/ascii-studio/src/__browser__/AsciiInspector.browser.test.tsx | 验证新开关的 DOM、可访问性和切换行为。 |

### Task 1: 先把 GPU 输出改成真正的字符遮罩

**Files:**
- Modify: vedio2ASCII/ascii-studio/src/engine/shaders/ascii.wgsl:20-38,63
- Modify: vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts
- Test: vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts

- [ ] **Step 1: 写失败测试，锁定 5×7 字符渲染而非抽象几何**

~~~ts
it('maps tone levels to 5x7 ASCII bitmap glyphs instead of filling bright cells', () => {
  expect(shader).toContain('fn glyphRow(glyph: u32, row: u32) -> u32');
  expect(shader).toContain('let pixel = min(vec2u(floor(scaled * vec2f(5.0, 7.0))), vec2u(4u, 6u));');
  expect(shader).toContain('let mask = glyphMask(scaled, min(7u, u32(floor(value * 8.0))));');
  expect(shader).not.toContain('return 1.0;');
});
~~~

- [ ] **Step 2: 运行测试确认当前 shader 不符合字符合同**

Run: pnpm exec vp test run src/engine/ascii-shader.test.ts

Expected: FAIL；当前源码没有 glyphRow，并且包含 return 1.0。

- [ ] **Step 3: 用固定 5×7 位图实现 8 级字符图集**

删除当前 glyphMask 中的 horizontal、vertical、diagonalA、diagonalB 和 ring 计算。写入以下调用结构，glyphRow 对 0–7 分别返回空格、点、冒号、星号、加号、井号、百分号、@ 的 5-bit 行掩码：

~~~wgsl
fn glyphMask(scaled: vec2f, glyph: u32) -> f32 {
  let pixel = min(vec2u(floor(scaled * vec2f(5.0, 7.0))), vec2u(4u, 6u));
  let row = glyphRow(glyph, pixel.y);
  let bit = 4u - pixel.x;
  return select(0.0, 1.0, (row & (1u << bit)) != 0u);
}
...
let mask = glyphMask(scaled, min(7u, u32(floor(value * 8.0))));
~~~

为 glyphRow 使用 switch (glyph) 和行号条件返回常量。第 7 级 @ 的行依次为 0x0e、0x11、0x17、0x15、0x17、0x10、0x0e，使最亮区域也保留字符孔洞。

- [ ] **Step 4: 运行 shader 合同与 ASCII pass 测试**

Run: pnpm exec vp test run src/engine/ascii-shader.test.ts src/engine/ascii-pass.test.ts src/engine/ascii-effect.test.ts

Expected: PASS。

- [ ] **Step 5: 提交字符 shader 的独立变更**

~~~powershell
git add vedio2ASCII/ascii-studio/src/engine/shaders/ascii.wgsl vedio2ASCII/ascii-studio/src/engine/ascii-shader.test.ts
git commit -m "fix: render ASCII preview with bitmap glyphs"
~~~

### Task 2: 将当前开关重构为“实时渲染 + 方块拉杆”

**Files:**
- Modify: vedio2ASCII/ascii-studio/src/ui/AsciiInspector.tsx:132-144
- Modify: vedio2ASCII/ascii-studio/src/ui/ascii-studio.css:216-275
- Modify: vedio2ASCII/ascii-studio/src/ui/locale.ts
- Modify: vedio2ASCII/ascii-studio/src/ui/locale.test.ts
- Modify: vedio2ASCII/ascii-studio/src/__browser__/AsciiInspector.browser.test.tsx
- Test: vedio2ASCII/ascii-studio/src/__browser__/AsciiInspector.browser.test.tsx

- [ ] **Step 1: 写失败浏览器测试，定义无文字方块拉杆的结构与语义**

~~~tsx
const toggle = container.querySelector<HTMLButtonElement>('[data-testid="ascii-live-preview-toggle"]');
expect(toggle?.textContent).toContain('Live rendering');
expect(toggle?.querySelector('.ascii-preview-toggle-rail')).not.toBeNull();
expect(toggle?.querySelector('.ascii-preview-toggle-state')).toBeNull();
expect(toggle?.getAttribute('aria-pressed')).toBe('false');
toggle!.click();
expect(value().enabled).toBe(true);
expect(toggle?.classList.contains('is-active')).toBe(true);
~~~

- [ ] **Step 2: 运行测试确认当前“Live ASCII Preview + OFF”结构不符合**

Run: pnpm exec vp test run src/__browser__/AsciiInspector.browser.test.tsx

Expected: FAIL；当前按钮包含 ascii-preview-toggle-state，且文案不是 Live rendering。

- [ ] **Step 3: 以标签和装饰性轨道替换两个当前 span**

在按钮中保留 aria-pressed 和现有 onClick，并精确使用下面的内容；轨道和滑块都设置 aria-hidden=true：

~~~tsx
<span class="ascii-preview-toggle-label">{copy().liveRendering}</span>
<span class="ascii-preview-toggle-rail" aria-hidden="true">
  <span class="ascii-preview-toggle-block" />
</span>
~~~

按钮的可访问名称来自可见标签，“开/关”状态由 aria-pressed 暴露；不渲染任何可见 ON/OFF 文案。

- [ ] **Step 4: 以方块拉杆 CSS 替换网格伪元素布局**

删除 ascii-preview-toggle::before 和 ascii-preview-toggle-state 的规则。让容器使用 display:flex、justify-content:space-between；轨道固定为 3.7rem × 1.95rem、border-radius:0，滑块固定为 1.25rem × 1.25rem。关闭态使用 #171c20 轨道与 #9ca3ac 滑块；is-active 采用 #f0ca52 滑块、#dec04b 描边，并把滑块推到右侧。焦点仅使用高对比 outline，禁用态不能改变滑块位置。

- [ ] **Step 5: 更新中英文可见文案与测试**

在两种语言对象中将 liveAsciiPreview 替换为 liveRendering。英文值为 Live rendering，中文值为 实时渲染。更新 locale.test.ts：

~~~ts
expect(studioCopy('zh-CN').liveRendering).toBe('实时渲染');
expect(studioCopy('en').liveRendering).toBe('Live rendering');
~~~

- [ ] **Step 6: 验证组件与文案**

Run: pnpm exec vp test run src/__browser__/AsciiInspector.browser.test.tsx src/ui/locale.test.ts

Expected: PASS。

- [ ] **Step 7: 提交控制外观的独立变更**

~~~powershell
git add vedio2ASCII/ascii-studio/src/ui/AsciiInspector.tsx vedio2ASCII/ascii-studio/src/ui/ascii-studio.css vedio2ASCII/ascii-studio/src/ui/locale.ts vedio2ASCII/ascii-studio/src/ui/locale.test.ts vedio2ASCII/ascii-studio/src/__browser__/AsciiInspector.browser.test.tsx
git commit -m "feat: use square rail for live ASCII rendering"
~~~

### Task 3: 仅在慢启动时在右侧预览给出真实反馈

**Files:**
- Modify: vedio2ASCII/ascii-studio/src/protocol.ts:2725
- Modify: vedio2ASCII/ascii-studio/src/protocol.test.ts
- Modify: vedio2ASCII/ascii-studio/src/engine/worker.ts:9051-9055
- Modify: vedio2ASCII/ascii-studio/src/ui/App.tsx:416,1918-1920,2417-2749,4686-4711
- Modify: vedio2ASCII/ascii-studio/src/ui/ascii-studio.css
- Modify: vedio2ASCII/ascii-studio/src/ui/locale.ts
- Test: vedio2ASCII/ascii-studio/src/protocol.test.ts

- [ ] **Step 1: 写失败协议测试，定义“命令已应用”而非伪进度**

~~~ts
it('represents an applied ASCII preview command', () => {
  const result: WorkerStateMessage = { type: 'ascii-preview-applied', enabled: true };
  expect(result).toEqual({ type: 'ascii-preview-applied', enabled: true });
});
~~~

- [ ] **Step 2: 运行协议测试确认新消息尚不存在**

Run: pnpm exec vp test run src/protocol.test.ts

Expected: FAIL；ascii-preview-applied 不属于 WorkerStateMessage。

- [ ] **Step 3: 在协议和 worker 中实现确认**

将下列联合成员加入 WorkerStateMessage：

~~~ts
| { type: 'ascii-preview-applied'; enabled: boolean }
~~~

并在 set-ascii-effect 分支中紧跟 playback?.refresh() 后发送：

~~~ts
post({ type: 'ascii-preview-applied', enabled: asciiEffect.enabled });
~~~

这表示 worker 已完成参数写入并已请求暂停帧刷新；它不声称整段视频已经处理完成。

- [ ] **Step 4: 在 App 中实现 350 ms 的慢启动覆盖层**

新增 asciiPreviewPending signal 和 asciiPreviewNoticeTimer。只有 params.enabled 为布尔值时才开始 350 ms 定时器；定时器到期后将 pending 置为 true。收到 ascii-preview-applied 时清除计时器并将 pending 置为 false。卸载时清除计时器。

在现有 ascii-monitor 的 canvas 容器内渲染：

~~~tsx
<Show when={asciiPreviewPending()}>
  <div class="ascii-preview-pending" role="status" aria-live="polite">
    {studioText().generatingAsciiFrame}
  </div>
</Show>
~~~

该元素绝不能位于 Inspector 或拉杆内部。

- [ ] **Step 5: 补齐提示文案和样式**

英文 generatingAsciiFrame 为 Generating ASCII frame…，中文为 正在生成 ASCII 帧…。覆盖层采用半透明深底、居中等宽字与小尺寸暖金指示，不遮住监视器标题；仅在 pending 为 true 时存在。

- [ ] **Step 6: 运行协议与相关组件测试**

Run: pnpm exec vp test run src/protocol.test.ts src/__browser__/AsciiInspector.browser.test.tsx src/ui/locale.test.ts

Expected: PASS。

- [ ] **Step 7: 提交反馈链路的独立变更**

~~~powershell
git add vedio2ASCII/ascii-studio/src/protocol.ts vedio2ASCII/ascii-studio/src/protocol.test.ts vedio2ASCII/ascii-studio/src/engine/worker.ts vedio2ASCII/ascii-studio/src/ui/App.tsx vedio2ASCII/ascii-studio/src/ui/ascii-studio.css vedio2ASCII/ascii-studio/src/ui/locale.ts
git commit -m "feat: acknowledge live ASCII preview updates"
~~~

### Task 4: 用真实视频完成回归验证

**Files:**
- No source changes expected.

- [ ] **Step 1: 运行类型检查和所有目标测试**

Run: pnpm typecheck

Run: pnpm exec vp test run src/engine/ascii-shader.test.ts src/engine/ascii-pass.test.ts src/engine/ascii-effect.test.ts src/protocol.test.ts src/__browser__/AsciiInspector.browser.test.tsx src/ui/locale.test.ts

Expected: 类型检查与所有列出的目标测试 PASS。

- [ ] **Step 2: 在 Chromium Core WebGPU 真实路径验证暂停与播放**

导入 720p H.264 样本，在暂停状态记录右侧画面；开启拉杆后确认右侧立刻从原片样式变为由 . : * + # % @ 构成的字符画，亮部仍含 @ 的空洞。关闭后确认同一帧恢复正常合成画面。播放后确认字符画随画面变化。

- [ ] **Step 3: 验证性能反馈与控制台**

正常机器上重复开启/关闭，确认 350 ms 内 worker 确认时覆盖层从不出现；人为延迟 worker 消息时覆盖层出现，确认后消失。浏览器控制台不得出现 Invalid ShaderModule、Invalid ComputePipeline、Invalid CommandBuffer 或未处理 worker 错误。

- [ ] **Step 4: 提交验证记录**

~~~powershell
git status --short
git log --oneline -3
~~~

Expected: 只含前三个任务的目标文件提交；不携带本地视频、Playwright 输出或 .superpowers 草图文件。

## 计划自检

- [x] 字符样式、左标签右方块拉杆、无常驻状态行和慢启动反馈均有对应任务。
- [x] 沿用现有 GPU pass 与 worker 命令，不引入预转码或第二条播放循环。
- [x] 每个源码步骤都有精确文件、测试、命令和可执行实现内容。
