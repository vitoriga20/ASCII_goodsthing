import { studioCopy, studioLocale } from './locale';
import { createSignal, For, Show } from 'solid-js';
import { X } from 'lucide-solid';
import type { CleanupAction, CleanupResult, StorageHealthReport } from '../engine/storage-cleanup';
import { runCleanup, requestPersistentStorage } from '../engine/storage-cleanup';
import { formatBytes } from '../lib/format';
import { Button } from './components/button';

interface StorageCleanupDialogProps {
	open: boolean;
	report: StorageHealthReport | null;
	onClose: () => void;
	onRefresh: () => void;
}

function pressureClass(pressure: StorageHealthReport['pressure']): string {
	switch (pressure) {
		case 'ok':
			return 'is-ok';
		case 'near-limit':
			return 'is-warn';
		case 'storage-pressure':
			return 'is-breach';
		case 'unknown':
			return 'is-muted';
	}
}

export function StorageCleanupDialog(props: StorageCleanupDialogProps) {
	const copy = () => studioCopy(studioLocale());
	const [results, setResults] = createSignal<CleanupResult[]>([]);
	const [running, setRunning] = createSignal<string | null>(null);
	const [persistStatus, setPersistStatus] = createSignal<string | null>(null);

	async function handleCleanup(action: CleanupAction) {
		setRunning(action.target);
		const result = await runCleanup(action.target);
		setResults((prev) => [...prev, result]);
		setRunning(null);
		props.onRefresh();
	}

	async function handleRequestPersist() {
		const granted = await requestPersistentStorage();
		setPersistStatus(granted ? copy().persistGranted : copy().persistDenied);
		props.onRefresh();
	}

	return (
		<Show when={props.open}>
			<div class="capability-backdrop" onClick={() => props.onClose()} aria-hidden="true" />
			<aside
				class="diagnostics-panel panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="storage-cleanup-title"
				tabIndex={-1}
				onKeyDown={(e) => {
					if (e.key === 'Escape') props.onClose();
				}}
			>
				<header class="capability-panel-header">
					<div>
<p class="panel-title" id="storage-cleanup-title">
								{copy().storageCleanup}
							</p>
						<Show when={props.report}>
							{(report) => (
								<p class={`capability-panel-tier ${pressureClass(report().pressure)}`}>
									{formatBytes(report().usageBytes)} / {formatBytes(report().quotaBytes)}
									{report().percentUsed !== null ? ` (${report().percentUsed!.toFixed(1)}%)` : ''}
									{' · '}
									{report().pressure}
								</p>
							)}
						</Show>
					</div>
<Button
							size="icon"
							variant="ghost"
							onClick={props.onClose}
							aria-label={copy().closeStorageCleanup}
							title={copy().closeStorageCleanup}
						>
						<X size={16} aria-hidden="true" />
					</Button>
				</header>

				<Show
					when={props.report}
					fallback={<p class="capability-panel-note">{copy().loadingStorageReport}</p>}
				>
					{(report) => (
						<>
							<section class="diagnostics-section">
								<h2>{copy().health}</h2>
								<dl class="diagnostics-grid">
									<div>
										<dt>{copy().healthIndexedDB}</dt>
										<dd>{report().indexedDbHealthy ? copy().healthHealthy : copy().healthError}</dd>
									</div>
									<div>
										<dt>{copy().healthOpfs}</dt>
										<dd>{report().opfsAvailable ? copy().healthAvailable : copy().healthUnavailable}</dd>
									</div>
									<div>
										<dt>{copy().healthPersistent}</dt>
										<dd>{report().persistentStorage}</dd>
									</div>
								</dl>
								<Show when={report().persistentStorage !== 'granted'}>
									<Button size="sm" variant="outline" onClick={handleRequestPersist}>
										{copy().requestPersistentStorage}
									</Button>
								</Show>
								<Show when={persistStatus()}>
									<p class="diagnostics-copy-status" aria-live="polite">
										{persistStatus()}
									</p>
								</Show>
							</section>

							<section class="diagnostics-section">
								<h2>{copy().cleanupActions}</h2>
								<ul class="diagnostics-list">
									<For each={report().availableCleanups}>
										{(action) => {
											const result = () => results().find((r) => r.target === action.target);
											return (
												<li class={`diagnostics-row ${result()?.ok ? 'is-ok' : 'is-muted'}`}>
													<span>{action.label}</span>
													<p>{action.description}</p>
													<Show when={!result()}>
														<Button
															size="sm"
															variant="outline"
															disabled={running() !== null}
															onClick={() => handleCleanup(action)}
														>
															{running() === action.target ? copy().cleaning : action.label}
														</Button>
													</Show>
<Show when={result()}>
															{(r) => (
																<p class={r().ok ? 'is-ok' : 'is-breach'}>
																	{r().ok
																		? copy()
																				.cleanupDoneFreed.replace('{n}', formatBytes(r().freedBytes))
																		: copy().cleanupError.replace('{x}', r().error ?? '')}
																</p>
															)}
														</Show>
												</li>
											);
										}}
									</For>
								</ul>
							</section>
						</>
					)}
				</Show>
			</aside>
		</Show>
	);
}
