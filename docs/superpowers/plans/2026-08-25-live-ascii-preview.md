# 实时 ASCII 预览改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `ascii-studio` 的“实时渲染”开关建立一条不会因 ASCII 处理速度落后而阻塞视频播放的实时预览通道。

**Architecture:** 保留现有时间线的精确取帧/编辑渲染链路，不再用它承载实时预览。实时开关打开时，在主线程创建隐藏的 `HTMLVideoElement`，复用 `ascii-main` 的原生视频播放与 `requestVideoFrameCallback` 思路；帧通过有界、可丢帧的协议发送到 Worker/GPU。调度规则复用 `tplay-main`：播放时钟优先，只保留最新帧，转换落后时丢弃过时帧，并在 HUD 显示解码、渲染、丢帧状态。

**Tech Stack:** TypeScript, Solid/React-style UI in `src/ui`, Web Worker, WebGPU, WebCodecs `VideoFrame`, HTMLVideoElement `requestVideoFrameCallback`, Vitest/Vite browser tests.

---

## 现状与复用结论

- `参考/ascii-main/ASCII.js` 的核心可复用点：`<video>` 负责连续解码，动画循环只读取当前画面，不向解码器逐帧精确索取时间戳。
- `参考/tplay-main/src/pipeline/runner.rs` 的核心可复用点：以墙上时钟为准，落后时跳过帧；发送队列满时 `try_send` 丢帧，不能让慢转换反向堵住播放。
- `tplay-main` 依赖 Rust/FFmpeg，不能直接移植到浏览器；只能移植它的调度和背压原则。
- 现有 `PlaybackController` 和 `SequentialFrameSource` 继续服务时间线编辑、暂停、逐帧和精确 seek，不在本计划中重写。

## 文件边界

- Create: `vedio2ASCII/ascii-studio/src/engine/live-preview.ts` — 主线程实时视频元素、帧回调、单帧背压、统计和销毁。
- Create: `vedio2ASCII/ascii-studio/src/engine/live-preview.test.ts` — 实时帧调度的单元测试。
- Modify: `vedio2ASCII/ascii-studio/src/protocol.ts` — 主线程与 Worker 的实时帧、确认、状态消息。
- Modify: `vedio2ASCII/ascii-studio/src/engine/worker.ts` — 接收最新实时帧、关闭旧帧、提交 GPU、回传确认和统计。
- Modify: `vedio2ASCII/ascii-studio/src/engine/gpu.ts` — 复用现有 ASCII shader/render target，支持实时帧入口并保证帧资源关闭。
- Modify: `vedio2ASCII/ascii-studio/src/ui/App.tsx` — 将“实时渲染”开关接入当前媒体、播放/暂停、seek 和状态显示。
- Modify: `vedio2ASCII/ascii-studio/src/ui/ascii-studio.css` — HUD 的运行、落后、错误状态样式。
- Create: `vedio2ASCII/ascii-studio/src/ui/live-preview.browser.test.tsx` — 浏览器级开关、状态和关闭回收测试。
- Modify: `vedio2ASCII/ascii-studio/src/protocol.test.ts` — 新增消息可序列化和帧传输契约测试。

## Task 1: 固定基线并清理临时调试边界

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/engine/frame-source.ts`
- Modify: `vedio2ASCII/ascii-studio/src/engine/frame-source.test.ts`
- Inspect/remove temporary diagnostics only after the new path has its own HUD: `src/engine/gpu.ts`, `src/engine/worker.ts`, `src/protocol.ts`, `src/ui/App.tsx`, `src/ui/ascii-studio.css`

- [x] 运行现有 ASCII、协议、帧源、WebCodecs 测试，记录基线。
- [ ] 保留已验证的帧源回归测试；将临时的 `ascii-debug` 高频日志标记为迁移项，避免与正式实时状态重复输出。
- [ ] 确认当前默认 WebCodecs/Mediabunny 选择不被实时通道改写。
- [ ] 提交基线检查点：`test: capture realtime preview baseline`。

## Task 2: 定义实时帧协议和资源所有权

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/protocol.ts`
- Modify: `vedio2ASCII/ascii-studio/src/protocol.test.ts`

- [x] 增加 `live-preview-start`、`live-preview-frame`、`live-preview-frame-ack`、`live-preview-stop`、`live-preview-state` 消息。
- [ ] `live-preview-frame` 携带 `sourceId`、`sequence`、`mediaTimeS`、`VideoFrame`；发送时把 `VideoFrame` 放进 transfer list。
- [ ] 约定单向所有权：发送后主线程不得再次关闭该帧；Worker 在提交/丢弃后负责关闭；ACK 只确认消费完成，不转移所有权。
- [ ] 状态至少包含 `mode`、`sourceFps`、`renderFps`、`droppedFrames`、`inFlight`、`lastMediaTimeS`、`lastError`。
- [x] 测试消息类型守卫、序列号单调性和 stop 后迟到帧的安全处理。

## Task 3: 实现主线程实时视频驱动

**Files:**
- Create: `vedio2ASCII/ascii-studio/src/engine/live-preview.ts`
- Create: `vedio2ASCII/ascii-studio/src/engine/live-preview.test.ts`

- [x] 用当前导入 `File` 创建 Object URL 和隐藏 `HTMLVideoElement`，设置 `muted`, `playsInline`, `preload="auto"`。
- [ ] 打开实时开关时，把视频定位到当前时间线时间，等待 `loadedmetadata`/`seeked` 后播放。
- [x] 优先使用 `requestVideoFrameCallback`；不支持时使用 `requestAnimationFrame`，但每次都读取 `video.currentTime`，不自行推进时间。
- [ ] 每个回调最多保持 1 帧在 Worker 中：`inFlight >= 1` 时关闭新帧并递增 `droppedFrames`；ACK 到达后才发送下一帧。
- [ ] 用 `new VideoFrame(video, { timestamp })`；若浏览器不支持，则用 `createImageBitmap(video)` 后在 Worker 侧转换，并在两条路径上都明确关闭资源。
- [ ] 视频暂停、seek、切换源、关闭开关、组件卸载时取消回调、暂停元素、撤销 Object URL、清空 in-flight 状态。
- [x] 单元测试覆盖：单帧发送、忙时丢帧、ACK 解锁、seek 重置序号、stop 后不再发送。

## Task 4: 实现 Worker 端“只保留最新帧”消费器

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/engine/worker.ts`
- Modify: `vedio2ASCII/ascii-studio/src/engine/gpu.ts`

- [ ] 增加实时预览状态：当前帧、当前序列号、是否正在 render、累计丢帧和最后消费时间。
- [ ] 收到新帧时，如果已有待处理帧，关闭旧帧并替换为新帧；如果正在 GPU render，保留最新一帧，禁止形成无限队列。
- [ ] GPU render 完成后只消费最新帧，不回放过时帧；无帧时直接 ACK，避免主线程永久等待。
- [ ] render、丢弃、异常和 stop 分支均关闭 `VideoFrame`，并通过 ACK 解除主线程背压。
- [ ] 复用现有 ASCII shader 参数（密度、字形大小、对比度、配色），不修改 shader 的字符映射语义。
- [ ] 测试连续 100 个输入帧在 GPU 故意变慢时，内存中最多保留 1 个待处理帧，且最终显示序列号接近最新输入。

## Task 5: 接入 UI 开关、时间线和 HUD

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/ui/App.tsx`
- Modify: `vedio2ASCII/ascii-studio/src/ui/ascii-studio.css`
- Create: `vedio2ASCII/ascii-studio/src/ui/live-preview.browser.test.tsx`

- [ ] 开关关闭时保持现有时间线精确预览；打开时启动实时视频通道，标签仍显示“实时渲染”。
- [ ] 打开瞬间使用当前播放头；拖动时间线时暂停实时视频、设置 `currentTime`，等待 `seeked` 后恢复，避免把拖动事件堆积成多个 seek。
- [ ] 播放/暂停按钮同步 HTMLVideoElement；视频结束时停止实时帧回调并显示“已结束”，不把 Worker 卡在等待下一帧。
- [ ] HUD 显示：`实时渲染`、源 FPS、ASCII 实际 FPS、已丢帧数、当前帧时间、队列状态；无输出超过 500ms 时显示“等待视频帧”，超过 2s 显示可恢复错误。
- [ ] 开关关闭、重新导入视频和页面卸载时确认没有继续增长的 Object URL、回调或 VideoFrame。
- [ ] 浏览器测试覆盖开关两态、导入后启动、关闭回收、seek 后继续输出，以及模拟慢 GPU 时 HUD 显示丢帧而不是卡死。

## Task 6: 性能和兼容性验证

**Files:**
- Test: `vedio2ASCII/ascii-studio/src/engine/live-preview.test.ts`
- Test: `vedio2ASCII/ascii-studio/src/ui/live-preview.browser.test.tsx`
- Inspect: `vedio2ASCII/ascii-studio/src/engine/media-adapters/mediabunny-adapter.ts`

- [ ] 使用用户当前约 3 分 32 秒、24 FPS 的视频，连续播放至少 60 秒；验收标准是原片与 ASCII 都持续更新，不出现永久 `decode pending`。
- [ ] 人为降低 ASCII 密度/制造慢 GPU，确认视频播放时钟继续前进，丢帧数增加但界面不冻结。
- [ ] 连续拖动进度 10 次后继续播放，确认只处理最后一次 seek，实时通道能恢复。
- [ ] 测试 Chrome 当前版本；对不支持 `requestVideoFrameCallback` 的浏览器验证 rAF fallback；对不支持 `VideoFrame(video)` 的浏览器验证 ImageBitmap fallback 或明确显示能力提示。
- [ ] 运行定向测试、类型检查、生产构建，并检查 `git diff --check`。

## Task 7: 收尾、文档和交付

**Files:**
- Modify: `vedio2ASCII/ascii-studio/src/features/docs/content/performance.md`
- Modify: `vedio2ASCII/ascii-studio/src/features/docs/content/faq.md`
- Modify: `vedio2ASCII/ascii-studio/src/ui/ascii-studio.css` only if final copy needs adjustment

- [ ] 记录实时模式与精确时间线模式的区别：实时模式允许丢帧，时间线模式用于精确编辑。
- [ ] 记录 HUD 指标含义和“等待视频帧/丢帧/错误”的处理建议。
- [ ] 删除迁移完成后不再需要的高频临时调试日志，只保留可读的错误和状态事件。
- [ ] 按功能拆分提交：协议、主线程驱动、Worker 消费、UI/HUD、测试与文档。
- [ ] 最终交付前只报告已通过实测的结论，不把“测试通过”表述成“用户视频已验证”。

## 验收标准

- 实时开关打开后，视频按原生播放时钟继续走；ASCII 可以低于源视频帧率，但不得因转换落后永久卡住。
- ASCII 转换落后时，HUD 明确显示实际 FPS、丢帧数和等待状态。
- 开关关闭后，现有时间线精确预览行为不回退。
- 反复导入、seek、播放/暂停、开关切换后，没有持续增长的帧、回调或 Object URL 资源。
- 定向测试、类型检查和生产构建通过，并完成至少一次用户当前长视频的连续播放实测。
