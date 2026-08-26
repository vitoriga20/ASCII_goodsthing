import { ErrorBoundary as SolidErrorBoundary, createMemo, type JSX } from 'solid-js';
import { RotateCcw } from 'lucide-solid';
import { Button } from './components/button';
import { studioCopy, studioLocale } from './locale';

interface ErrorBoundaryProps {
	children: JSX.Element;
}

function Fallback(props: { error: unknown; reset: () => void }) {
	const copy = () => studioCopy(studioLocale());
	const message = createMemo(() =>
		props.error instanceof Error
			? props.error.message
			: typeof props.error === 'string'
				? props.error
				: copy().unexpectedError
	);
	return (
		<div class="error-boundary-fallback" role="alert">
			<div class="error-boundary-content">
				<h2 class="error-boundary-title">{copy().errorTitle}</h2>
				<p class="error-boundary-message">{message()}</p>
				<Button variant="default" onClick={() => window.location.reload()}>
					<RotateCcw size={14} aria-hidden="true" />
					{copy().reload}
				</Button>
			</div>
		</div>
	);
}

export function AppErrorBoundary(props: ErrorBoundaryProps) {
	return (
		<SolidErrorBoundary
			fallback={(error: unknown, reset: () => void) => <Fallback error={error} reset={reset} />}
		>
			{props.children}
		</SolidErrorBoundary>
	);
}
