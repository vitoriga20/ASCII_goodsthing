import { formatClock } from '../lib/format';
import { studioCopy, studioLocale } from './locale';

interface LimitedPreviewProps {
	thumbnailUrl: string;
	fileName: string;
	width: number;
	height: number;
	duration: number;
}

/** Reduced-resolution compatibility preview — separate from the accelerated WebGPU path. */
export function LimitedPreview(props: LimitedPreviewProps) {
	const copy = () => studioCopy(studioLocale());
	return (
		<div class="limited-preview" aria-label={copy().compatibilityPreview}>
			<img
				class="limited-preview-image"
				src={props.thumbnailUrl}
				alt={copy().compatibilityThumbnail.replace('{x}', props.fileName)}
				width={props.width}
				height={props.height}
			/>
			<div class="limited-preview-meta">
				<span class="limited-preview-badge">{copy().compatibilityPreview}</span>
				<span class="limited-preview-copy">
					{props.fileName} · {props.width}×{props.height} · {formatClock(props.duration)}
				</span>
			</div>
		</div>
	);
}
