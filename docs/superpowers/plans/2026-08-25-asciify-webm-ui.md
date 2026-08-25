# Asciify WebM 单页界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 做出无需命令行、可实时预览并下载带原音频 WebM 的 Asciify 中文页面。

**Architecture:** 浏览器将 HTMLVideoElement 的可用帧交给 Asciify，Canvas 视频轨与 video.captureStream 的音频轨合并录制。导出按钮只在视频首帧可用后启用；下载等待时间不设 30 秒上限。

**Tech Stack:** HTML、JavaScript ES Modules、Asciify、MediaRecorder、Chrome、Node test。

---

### Task 1: 录制轨道与等待策略

**Files:**
- Create: vedio2ASCII/webmExport.mjs
- Create: vedio2ASCII/webmExport.test.mjs

- [ ] **Step 1: 写失败测试**

~~~js
import test from "node:test"
import assert from "node:assert/strict"
import { getDownloadTimeout, createRecordingTrackKinds } from "./webmExport.mjs"

test("WebM 下载等待不使用默认 30 秒上限", () => {
	assert.equal(getDownloadTimeout(), 0)
})

test("录制流始终包含画面且保留可用音频", () => {
	assert.deepEqual(createRecordingTrackKinds(true), ["video", "audio"])
	assert.deepEqual(createRecordingTrackKinds(false), ["video"])
})
~~~

- [ ] **Step 2: 运行失败测试**

Run:

~~~powershell
node --test .\webmExport.test.mjs
~~~

Expected: FAIL，模块 webmExport.mjs 尚不存在。

- [ ] **Step 3: 实现最小模块**

~~~js
export function getDownloadTimeout() {
	return 0
}

export function createRecordingTrackKinds(hasAudio) {
	return hasAudio ? ["video", "audio"] : ["video"]
}
~~~

- [ ] **Step 4: 验证并提交**

~~~powershell
node --test .\webmExport.test.mjs
git add webmExport.mjs webmExport.test.mjs
git commit -m "feat: define webm export settings"
~~~

Expected: 两项测试通过。

### Task 2: 单页实时预览和 WebM 下载

**Files:**
- Create: vedio2ASCII/webm.html
- Create: vedio2ASCII/webm.mjs

- [ ] **Step 1: 创建页面**

页面包含 id 为 file-picker、export-button、ascii-output、progress、status 的控件；初始状态提示“选择视频后自动预览”，按钮禁用。

- [ ] **Step 2: 实现帧与音轨处理**

在 webm.mjs 中实现以下核心逻辑：

~~~js
const canvasStream = canvas.captureStream(24)
const sourceStream = video.captureStream()
const recordingStream = new MediaStream([
	...canvasStream.getVideoTracks(),
	...sourceStream.getAudioTracks(),
])
const recorder = new MediaRecorder(recordingStream, {
	mimeType: "video/webm;codecs=vp9,opus",
	videoBitsPerSecond: 8_000_000,
})
~~~

视频选择后等待 loadeddata，不在 loadedmetadata 阶段调用 asciify.rasterizeImage。开始导出后用 requestVideoFrameCallback 调用 rasterizeImage(video)，每帧更新 progress.value 和 status 文本；ended 时停止 recorder，创建 a.download 并下载 filename_ascii.webm。

- [ ] **Step 3: 人工浏览器验证**

使用本地网页服务打开 webm.html，选择输入 MP4。Expected: 首帧出现 ASCII 效果、按钮可用；点击后进度持续增长；约 212 秒后触发 WebM 下载且状态提示完成。

- [ ] **Step 4: 提交**

~~~powershell
git add webm.html webm.mjs
git commit -m "feat: add realtime asciify webm page"
~~~

### Task 3: 更新自动化验证脚本

**Files:**
- Modify: vedio2ASCII/export2.mjs

- [ ] **Step 1: 用无限超时取代默认下载等待**

将下载等待改为：

~~~js
const downloadPromise = page.waitForEvent("download", { timeout: 0 })
await page.getByRole("button", { name: "导出 WebM" }).click()
await (await downloadPromise).saveAs(silent)
~~~

- [ ] **Step 2: 验证下载与媒体流**

运行指定视频的导出脚本，并用 FFprobe 检查下载的 WebM：

~~~powershell
ffprobe -v error -show_entries stream=codec_type,codec_name -of json .\artifacts\ascii.webm
node --test .\videoExport.test.mjs .\exportJob.test.mjs .\webmExport.test.mjs
~~~

Expected: WebM 含视频流；浏览器能捕获源音频时还含音频流；所有测试通过。

- [ ] **Step 3: 提交**

~~~powershell
git add export2.mjs
git commit -m "fix: wait for full webm download"
~~~

