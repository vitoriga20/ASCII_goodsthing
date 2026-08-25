# Asciify 视频 ASCII 导出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 使用 Asciify 将指定 MP4 渲染为 ASCII 画面，并将同目录配套 MP3 合成为 H.264/AAC 的 MP4。

**Architecture:** demo/video 在浏览器解码视频，用 requestVideoFrameCallback 逐帧调用 Asciify，并将 Canvas 录制成无声 WebM。Node 自动化脚本经 Playwright 选择源视频和保存 WebM，再调用 FFmpeg 合入配套 MP3。

**Tech Stack:** TypeScript、ES Modules、Asciify、Vitest Browser + Playwright、MediaRecorder、FFmpeg。

---

## 文件结构

- 新建 参考/asciify-main/utils/videoExport.ts：导出命名纯函数。
- 新建 参考/asciify-main/test/video-export.test.ts：命名和帧渲染测试。
- 新建 参考/asciify-main/demo/video/index.html：选择视频、预览、进度和导出页面。
- 新建 参考/asciify-main/demo/video/main.mjs：帧渲染与 WebM 录制。
- 新建 参考/asciify-main/scripts/export-asciify-video.mjs：自动化页面、FFmpeg 合成和 FFprobe 校验。
- 修改 参考/asciify-main/package.json：增加 export:video 命令。
- 修改 参考/asciify-main/.gitignore：忽略 artifacts/video-export/。

### Task 1: 定义输入、音频和输出命名规则

**Files:**
- Create: 参考/asciify-main/utils/videoExport.ts
- Test: 参考/asciify-main/test/video-export.test.ts

- [ ] **Step 1: 写失败测试**

在 test/video-export.test.ts 写入：

~~~ts
import { describe, expect, it } from "vitest"
import { deriveVideoExportNames, withTimestampSuffix } from "../utils/videoExport.ts"

describe("video export names", () => {
	it("pairs _video.mp4 with the matching audio and output names", () => {
		expect(deriveVideoExportNames("concert_video.mp4")).toEqual({
			audioFileName: "concert_audio.mp3",
			outputFileName: "concert_ascii.mp4",
		})
	})

	it("rejects a file without the _video.mp4 suffix", () => {
		expect(() => deriveVideoExportNames("concert.mp4")).toThrow(/_video\.mp4/)
	})

	it("keeps the extension after adding the collision suffix", () => {
		expect(withTimestampSuffix("concert_ascii.mp4", "20260825-120000")).toBe(
			"concert_ascii-20260825-120000.mp4"
		)
	})
})
~~~

- [ ] **Step 2: 运行测试，确认是功能缺失导致失败**

Run:

~~~powershell
yarn vitest run test/video-export.test.ts
~~~

Expected: FAIL，报错无法解析 ../utils/videoExport.ts；不是拼写或测试配置问题。

- [ ] **Step 3: 最小实现**

在 utils/videoExport.ts 写入：

~~~ts
export interface VideoExportNames {
	audioFileName: string
	outputFileName: string
}

const VIDEO_SUFFIX = "_video.mp4"

export function deriveVideoExportNames(videoFileName: string): VideoExportNames {
	if (!videoFileName.endsWith(VIDEO_SUFFIX)) {
		throw new Error("输入视频文件名必须以 _video.mp4 结尾：" + videoFileName)
	}

	const stem = videoFileName.slice(0, -VIDEO_SUFFIX.length)
	return {
		audioFileName: stem + "_audio.mp3",
		outputFileName: stem + "_ascii.mp4",
	}
}

export function withTimestampSuffix(fileName: string, timestamp: string): string {
	const extensionIndex = fileName.lastIndexOf(".")
	if (extensionIndex <= 0) return fileName + "-" + timestamp
	return fileName.slice(0, extensionIndex) + "-" + timestamp + fileName.slice(extensionIndex)
}
~~~

- [ ] **Step 4: 验证为绿色并提交**

Run:

~~~powershell
yarn vitest run test/video-export.test.ts
git add utils/videoExport.ts test/video-export.test.ts
git commit -m "feat: add video export naming helpers"
~~~

Expected: 3 个断言通过；提交仅含命名模块和测试。

### Task 2: 创建可录制的 ASCII 视频页面

**Files:**
- Create: 参考/asciify-main/demo/video/index.html
- Create: 参考/asciify-main/demo/video/main.mjs
- Modify: 参考/asciify-main/test/video-export.test.ts

- [ ] **Step 1: 添加并运行既有 API 契约测试**

在 test/video-export.test.ts 增加：

~~~ts
import { createAsciify } from "../createAsciify.ts"
import { createStage } from "./utils.ts"

it("rasterizes a CanvasImageSource into an ASCII canvas", async () => {
	const source = document.createElement("canvas")
	source.width = 32
	source.height = 18
	const context = source.getContext("2d")!
	context.fillStyle = "white"
	context.fillRect(0, 0, source.width, source.height)

	const asciify = createAsciify(createStage(320, 180), { pixelRatio: 1, fontSize: 10 })
	await asciify.rasterizeImage(source)

	expect(asciify.columnCount).toBeGreaterThan(0)
	expect(asciify.rowCount).toBeGreaterThan(0)
})
~~~

Run:

~~~powershell
yarn vitest run test/video-export.test.ts
~~~

Expected: PASS。测试确认视频帧所属的 CanvasImageSource 接口已被 Asciify 接受，因此演示页不需要修改核心渲染器。

- [ ] **Step 2: 实现页面标记和样式**

在 demo/video/index.html 写入：

~~~html
<!doctype html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Asciify 视频导出</title>
	<link rel="stylesheet" href="../common/styles.css" />
	<style>
		body { margin: 0; background: #101010; color: #f1f1f1; font-family: ui-monospace, Consolas, monospace; }
		main { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 1rem; min-height: 100vh; padding: 1rem; box-sizing: border-box; }
		canvas { width: 100%; max-width: 852px; aspect-ratio: 852 / 480; background: #000; }
		aside { display: grid; align-content: start; gap: .75rem; } video { display: none; }
		#status[data-state="error"] { color: #ff7b7b; }
		@media (max-width: 760px) { main { grid-template-columns: 1fr; } }
	</style>
	<script type="importmap">
		{ "imports": { "@sister.software/asciify": "https://esm.sh/@sister.software/asciify@4.3.0" } }
	</script>
	<script type="module" src="./main.mjs"></script>
</head>
<body>
	<main>
		<section><canvas id="ascii-output" width="852" height="480"></canvas><video id="source-video" playsinline muted></video></section>
		<aside>
			<label>视频文件 <input id="file-picker" type="file" accept="video/mp4" /></label>
			<button id="export-button" type="button" disabled>开始导出 WebM</button>
			<progress id="progress" max="1" value="0"></progress>
			<output id="status" aria-live="polite">请选择 MP4 文件。</output>
		</aside>
	</main>
</body>
</html>
~~~

- [ ] **Step 3: 实现加载、逐帧渲染、录制和下载**

在 demo/video/main.mjs 写入：

~~~js
const local = ["localhost", "127.0.0.1"].includes(location.hostname)
const { createAsciify } = await import(local ? "/out/index.js" : "@sister.software/asciify")
const canvas = document.querySelector("#ascii-output")
const video = document.querySelector("#source-video")
const picker = document.querySelector("#file-picker")
const button = document.querySelector("#export-button")
const progress = document.querySelector("#progress")
const status = document.querySelector("#status")
const asciify = createAsciify(canvas, { pixelRatio: 1, fontSize: 12, backgroundColor: "#000000" })
let sourceURL

function setStatus(message, state = "idle") { status.value = message; status.dataset.state = state }

function waitFor(target, eventName) {
	return new Promise((resolvePromise, rejectPromise) => {
		target.addEventListener(eventName, resolvePromise, { once: true })
		target.addEventListener("error", () => rejectPromise(target.error || new Error("视频处理失败")), { once: true })
	})
}

function mimeType() {
	return ["video/webm;codecs=vp9", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || ""
}

async function renderFrame() {
	await asciify.rasterizeImage(video)
	progress.value = video.duration ? video.currentTime / video.duration : 0
}

async function exportWebM() {
	if (!sourceURL) throw new Error("请先选择 MP4 文件")
	if (!window.MediaRecorder) throw new Error("当前浏览器不支持 MediaRecorder")
	button.disabled = true
	progress.value = 0
	setStatus("正在渲染 ASCII 视频…")
	video.currentTime = 0
	await waitFor(video, "seeked")
	asciify.setSize(852, 480)

	const chunks = []
	const recorder = new MediaRecorder(canvas.captureStream(24), { mimeType: mimeType(), videoBitsPerSecond: 8000000 })
	recorder.addEventListener("dataavailable", (event) => event.data.size && chunks.push(event.data))
	const stopped = new Promise((resolvePromise) => recorder.addEventListener("stop", resolvePromise, { once: true }))
	let rendering = false
	const onFrame = async () => {
		if (rendering || video.ended) return
		rendering = true
		await renderFrame()
		rendering = false
		video.requestVideoFrameCallback(onFrame)
	}
	video.addEventListener("ended", async () => { await renderFrame(); recorder.stop() }, { once: true })
	recorder.start(1000)
	video.requestVideoFrameCallback(onFrame)
	await video.play()
	await stopped

	const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" })
	const link = document.createElement("a")
	link.href = URL.createObjectURL(blob)
	link.download = picker.files[0].name.replace(/_video\.mp4$/i, "") + "_ascii-silent.webm"
	link.click()
	setStatus("无声 WebM 已下载，导出脚本将合入 MP3。")
	button.disabled = false
	return blob
}

picker.addEventListener("change", async () => {
	const file = picker.files && picker.files[0]
	if (!file) return
	if (sourceURL) URL.revokeObjectURL(sourceURL)
	sourceURL = URL.createObjectURL(file)
	video.src = sourceURL
	await waitFor(video, "loadedmetadata")
	canvas.width = 852
	canvas.height = 480
	asciify.setSize(852, 480)
	await renderFrame()
	button.disabled = false
	setStatus("已载入：" + file.name + "（" + video.duration.toFixed(1) + " 秒）")
})

button.addEventListener("click", () => exportWebM().catch((error) => {
	button.disabled = false
	setStatus(error instanceof Error ? error.message : String(error), "error")
}))
window.exportAsciifyWebM = exportWebM
~~~

- [ ] **Step 4: 编译、目视检查并提交**

Run:

~~~powershell
yarn compile
yarn demo
~~~

打开 http://127.0.0.1:8081/demo/video/，选择指定 _video.mp4。Expected: 显示 ASCII 首帧、状态显示约 212 秒、导出按钮可用。停止服务器后运行：

~~~powershell
git add demo/video/index.html demo/video/main.mjs test/video-export.test.ts
git commit -m "feat: add asciify video recording demo"
~~~

### Task 3: 自动化合成、验证和最终导出

**Files:**
- Create: 参考/asciify-main/scripts/export-asciify-video.mjs
- Modify: 参考/asciify-main/package.json
- Modify: 参考/asciify-main/.gitignore

- [ ] **Step 1: 验证新命令先失败**

Run:

~~~powershell
yarn export:video -- "..\..\音视频\示例_video.mp4"
~~~

Expected: FAIL，Yarn 表示 export:video 不存在。

- [ ] **Step 2: 增加命令及忽略规则**

在 package.json 的 scripts 加入：

~~~json
"export:video": "node ./scripts/export-asciify-video.mjs"
~~~

在 .gitignore 末尾加入：

~~~gitignore
# ASCII 视频导出中间文件
artifacts/video-export/
~~~

- [ ] **Step 3: 实现自动化脚本**

在 scripts/export-asciify-video.mjs 写入：

~~~js
import { access, mkdir, rm } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { chromium } from "playwright"
import { deriveVideoExportNames, withTimestampSuffix } from "../out/utils/videoExport.js"

const inputPath = process.argv[2]
if (!inputPath) throw new Error("用法：yarn export:video -- <输入_video.mp4>")
const absoluteInput = resolve(inputPath)
const sourceDirectory = dirname(absoluteInput)
const names = deriveVideoExportNames(basename(absoluteInput))
const audioPath = join(sourceDirectory, names.audioFileName)
await access(absoluteInput)
await access(audioPath)

const artifactDirectory = resolve("artifacts/video-export")
await rm(artifactDirectory, { recursive: true, force: true })
await mkdir(artifactDirectory, { recursive: true })
const silentPath = join(artifactDirectory, "ascii-silent.webm")
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)
let outputPath = join(sourceDirectory, names.outputFileName)
try { await access(outputPath); outputPath = join(sourceDirectory, withTimestampSuffix(names.outputFileName, timestamp)) } catch {}

function run(command, args) {
	return new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" })
		child.once("error", rejectPromise)
		child.once("exit", (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(command + " 退出码：" + code)))
	})
}

const server = spawn("yarn", ["demo"], { stdio: "inherit", shell: process.platform === "win32" })
try {
	await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000))
	const browser = await chromium.launch({ headless: true })
	try {
		const page = await browser.newPage({ viewport: { width: 1100, height: 720 } })
		await page.goto("http://127.0.0.1:8081/demo/video/", { waitUntil: "networkidle" })
		await page.setInputFiles("#file-picker", absoluteInput)
		const exportButton = page.getByRole("button", { name: "开始导出 WebM" })
		await exportButton.waitFor({ state: "visible" })
		const downloadPromise = page.waitForEvent("download")
		await exportButton.click()
		const download = await downloadPromise
		await download.saveAs(silentPath)
	} finally { await browser.close() }

	await run("ffmpeg", [
		"-y", "-i", silentPath, "-i", audioPath, "-map", "0:v:0", "-map", "1:a:0",
		"-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", outputPath,
	])
	await run("ffprobe", [
		"-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate",
		"-of", "json", outputPath,
	])
	console.log("导出完成：" + outputPath)
} finally { server.kill() }
~~~

- [ ] **Step 4: 编译并导出用户指定视频**

Run:

~~~powershell
yarn compile
yarn export:video -- "..\..\音视频\『𝟒𝐊·𝐇𝐢-𝐑𝐞𝐬』《超时空辉夜姬》「世界第一公主殿下(ワールドイズマイン)」、「Ex-Otogibanashi」Live片段_video.mp4"
~~~

Expected: 运行约 212 秒；音视频目录生成 *_ascii.mp4，如原目标已存在则生成带时间戳后缀的文件。

- [ ] **Step 5: 用 FFprobe 验证并提交**

Run:

~~~powershell
$output = Get-ChildItem "..\..\音视频" -Filter "*_ascii*.mp4" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of json -- $output.FullName
yarn check-types
yarn test
git add scripts/export-asciify-video.mjs package.json .gitignore
git commit -m "feat: export asciify videos with audio"
~~~

Expected: 最新输出含 h264 视频流（852×480、24 fps）与 aac 音频流；类型检查和全部测试均通过。

