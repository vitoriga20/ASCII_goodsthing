# ASCII Studio — 踩坑记录

实时预览（右侧 ASCII 监视器）与导出的已知坑、根因与修法。每个条目：现象 → 根因 → 修复。适用于双监视器 ASCII 工作台。

## 1. 暂停后拖动时间线，右侧 ASCII 监视器不同步

- **现象**：播放时左右同步；暂停后拖动轨道，左边（原生 video）跟随、右边冻结；再点播放恢复。
- **根因**：`LivePreviewDriver.schedule()` 在隐藏视频 `paused` 时直接返回；暂停态 `seek()` 后不抓任何帧。左边是 DOM video（跳时间立刻渲染），右边驱动"暂停即罢工"，行为不对称。
- **修复**（`live-preview.ts`）：`seek()` 结束后暂停态也**强制补抓一帧**；强制抓帧不计入源 FPS 统计。

## 2. 实时渲染播放时极卡、无法同步

- **现象**：打开实时渲染点播放后卡顿，右侧跟不上。
- **根因**：SolidJS `createEffect` 里读 `clock.currentTime()`——这是**每动画帧更新**的响应式信号——导致播放时每帧触发一次完整 `seek()`（取消帧回调、重置背压与序号、重新排帧），实时通道变成自我打断循环。
- **修复**（`App.tsx`）：删除响应式 effect，改为**导出消息驱动**的精确动作：`export-progress` 时暂停驱动一次；`export-complete/download-ready/canceled/error` 与 `queue-complete` 时锚定到播放头一次。
- **教训**：SolidJS effect 内禁止读高频信号（SAB 时钟）；时机敏感动作走消息/事件，不做逐帧响应。

## 3. 换视频后右侧仍显示旧视频

- **现象**：删除原视频、导入新视频后，右侧 ASCII 监视器还是旧画面。
- **根因**：`LivePreviewDriver` 持有自己的隐藏 `<video>` + object URL；`importMedia` 只更新 `livePreviewFile` 和左监视器，驱动从不重载；worker 端 live 通道的 `sourceId` 是固定字符串，与媒体库增删无关。
- **修复**（`App.tsx importMedia`）：实时渲染开启时，导入新文件后 `stop()` 旧驱动并用新文件重新 `start()`（配合修复 1 的暂停补帧，换完立即可见新画面）。

## 4. 导出进度卡 0%、输出文件 0kb——硬件解码器楔死

- **现象**：导出 `output.start()` 成功、卡在第一帧解码，进度 0%、文件 0kb。仅 2560×1600 High@L5.1（`avc1.640033`）类 ShadowPlay 录像触发；1080p 正常。**音频是红鲱鱼**（去音频的 1600p 流拷贝照样卡）。
- **根因**：`WebCodecsVideoDecoder.samples()` 的 `waitForFrame()` 死等：硬件解码器接受满队列后既不输出也不报错（`decodeQueueSize` 满、无 output、无 error、packets 未耗尽）→ 永久挂起。
- **修复**（`webcodecs-decoder.ts`）：5 秒看门狗（`getKeyPacket` / packet feed / 等帧三处），判定 `VideoDecoderWedgeError` → 整条流用 `prefer-software` 重试一次；配置/格式错误仍立即抛出。控制台 `console.warn` 提示回退发生。

## 5. 导出闪烁 + 前段整屏绿幕——canvas 回读返回冻结快照

- **现象**：导出视频闪烁；前 ~35s 是一整块纯色（把亮场景 ASCII 饱和帧当冻结快照反复输出）。实时渲染开/关都闪；**预览监视器正常**。
- **根因**：`new VideoFrame(预览 canvas)` 读的是合成器"最近已呈现"的缓冲；对 DOM 中的 WebGPU canvas，呈现节奏由 vsync 决定，慢速导出时回读频繁命中旧/冻结快照。帧指纹证明：所有帧哈希相同、源帧 `srcTsUs` 正常前进、预览正常。**33ms vsync 等待无效**（不是时序差，是回读路径本身）。
- **修复**（`gpu.ts`）：导出改渲染到**独立 OffscreenCanvas**（worker 新建、不挂 DOM、仅导出使用）并从中回读；预览画布在导出期间完全不被触碰。
- **兜底**（`worker.ts`）：导出忙闸门——`exportAbort` / `queueJobAbort` 生效期间丢弃 `live-preview-frame`，实时帧永不写入共享纹理。
- **历史**：独立导出画布初版曾因"0% 导出"被误回退——真正的元凶是坑 4 的解码楔死，与画布无关；解码看门狗落地后才安全重启用。

## 调试方法备忘

- 跑测试用 `pnpm test run`（vp 包装器）；裸 `npx vitest` 会挂 vite-plus-test 运行器。
- 机器 ffmpeg/ffprobe 在 `C:\Users\vitoriga\Tools\ffmpeg\bin\`，用于音频剥离/重编码对照，定位"文件特性"类问题。
- 帧指纹法：对导出帧做粗哈希 + 记录源帧时间戳，一次区分"解码喂帧重复"还是"画布回读重复"。
- 用看门狗把"静默挂死"转成"带标题报错"，避免无限 0% 进度。