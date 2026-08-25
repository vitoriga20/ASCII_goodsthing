import { createEffect, Show } from 'solid-js';

interface SourceMonitorProps {
	readonly src: () => string | null;
	readonly currentTime: () => number;
	readonly playing: () => boolean;
}

/**
 * A display-only monitor for the locally selected source. The editor worker remains
 * the timing authority; this element follows its clock to make the source/program
 * comparison immediate without adding a second media processing pipeline.
 */
export function SourceMonitor(props: SourceMonitorProps) {
	let video: HTMLVideoElement | undefined;

	createEffect(() => {
		const element = video;
		const src = props.src();
		if (!element || !src || !Number.isFinite(props.currentTime())) return;
		if (Math.abs(element.currentTime - props.currentTime()) > 0.16) {
			element.currentTime = props.currentTime();
		}
		if (props.playing()) {
			void element.play().catch(() => undefined);
		} else {
			element.pause();
		}
	});

	return (
		<section class="source-monitor" aria-label="Original source preview">
			<div class="monitor-label">
				<span>ORIGINAL</span>
				<span>LIVE</span>
			</div>
			<Show
				when={props.src()}
				fallback={<p class="monitor-empty">导入视频后在此查看原片</p>}
			>
				{(src) => (
					<video
						ref={video}
						class="source-monitor-video"
						src={src()}
						muted
						playsinline
						preload="metadata"
					/>
				)}
			</Show>
		</section>
	);
}
