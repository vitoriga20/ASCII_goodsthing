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
- 格式化用 `vp fmt`（如 `pnpm exec vp fmt <file>`）；**不要裸敲 `pnpm fmt`**——Git Bash 里会命中 GNU coreutils 的 `fmt`（GNU 版），参数语义完全不同。检查用 `vp fmt --check <file>` 或 `vp run check:format`。
- 无头浏览器/CI 里 `navigator.gpu.requestAdapter()` 通常是 null（SwiftShader、D3D11 各标志组合都拿不到）——WebGPU 校验错误只能靠「浏览器控制台 + `[ascii]`/uncapturederror 日志」或 `test:browser` 的 GPU 回归测试（无 GPU 自动跳过，有 GPU 机器/CI 真编译 shader 并读回像素）。
- `createComputePipeline` 的失败在 Dawn 里可能是**异步 invalid**（不抛同步异常、try/catch 抓不到），要拿真实首错必须用 `device.pushErrorScope('validation')` 包住创建并 pop 取消息；对象再被使用（如 getBindGroupLayout）只报"invalid due to a previous error"这种没有因果的二错。
## 6. 字符集功能（自定义填充字符）

- **能力**：右侧检查器新增「字符集」控件——5 个内置集（`01` 二进制、经典渐变、字母数字、矩阵风、纯符号）+ 自由输入框。字符集即填充码表：**首字符=最暗、尾字符=最亮**，任意字符都行（字母/数字/符号/空格/中文/emoji，系统等宽字体渲染）。
- **架构**：旧 `glyphMask()` 程序化几何字形（7 档）已删除，改为 **WGSL atlas 取样**——worker 里 `AsciiPass` 用 `OffscreenCanvas` 把字符集画成一行 32px 字形纹理（`r8unorm`），`charCount` 作为亮度档位数进 uniform（第 9 个 slot，缓冲扩到 48B/12 槽）。字符集变化才重建 atlas；预览 / 实时通道 / 导出同一条渲染链路自动生效。
- **参数**：`AsciiEffectParams.charset`（全局参数，协议 `set-ascii-effect` 自动透传，不涉及项目文档持久化）。上限 96 个码点（按 code point 计数，代理对不拆），atlas 宽 3072px 安全低于 8192 纹理上限。
- **注意**：切换观感预设（矩阵绿等）会顺带改字符集；输入框防抖 250ms 提交，失焦立即提交，空输入回退默认字符集。

## 7. 字符集上线即黑屏——atlas 上传被拒 + compute 阶段禁采样

- **现象**：字符集功能上线后右边 ASCII 监视器全黑，左边原片正常。导出同链路也会黑。
- **根因（两个叠加）**：
  1. **上传被拒**：`copyExternalImageToTexture` 的目标纹理 usage 必须同时含 `COPY_DST` + **`RENDER_ATTACHMENT`**，只给 `COPY_DST` 时上传被 Dawn 拒收，atlas 全黑 → mask=0 → 画面全黑。报错 `Destination texture needs to have CopyDst and RenderAttachment usage.`
  2. **管线创建即废**：`textureSample` 是 **@fragment 阶段专属内置函数，compute 管线禁用它**（`built-in cannot be used by compute pipeline stage`）。用 `textureSample` 采样 atlas 导致整个 ascii pipeline invalid，连锁 `GetBindGroupLayout → CreateBindGroup` 二次报错。
- **修复**：atlas `usage` 加 `RENDER_ATTACHMENT`；WGSL 改 **`textureLoad(atlas, texelPos, 0)`** 按整数 texel 取字形（删掉采样器绑定）——compute 阶段仅 `textureLoad`/`textureStore` 合法。
- **诊断链路**：worker 埋 `[ascii]` 日志——管线创建用 `pushErrorScope` 捕获真实首错（Dawn 的 async invalid 不抛同步异常，直接 try/catch 抓不到）；atlas 构建打字符数/尺寸/2d 上下文；上传用返回值错域打拒收原因。gpu.ts 全局 `uncapturederror` 打所有设备错误。
- **本地复现**：此环境无头 Chrome 拿不到 WebGPU adapter（swiftshader/d3d11 组合均失败）；留了 `src/__browser__/ascii-black-repro.browser.test.ts`——无 GPU 自动跳过，有 GPU 的机器/CI 真编译 shader + 完整 pass + 像素读回验证 atlas 与输出非黑。
