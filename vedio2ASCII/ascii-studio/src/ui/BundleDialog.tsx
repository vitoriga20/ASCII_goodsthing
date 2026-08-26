import { studioCopy, studioLocale } from './locale';
import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Popover } from '@ark-ui/solid/popover';
import { FolderArchive, FolderInput, FolderOutput } from 'lucide-solid';
import { Button, buttonVariants } from './components/button';
import { isAbortError } from '../lib/abort-error';
import { errorMessage } from '../lib/error-message';
import type {
	BundleIntegrityItemSnapshot,
	BundleIntegrityReportSnapshot,
	BundleSourcePolicySnapshot
} from '../protocol';

interface BundleDialogProps {
	disabled?: boolean;
	directoryPickerAvailable: boolean;
	onExport: (policy: BundleSourcePolicySnapshot, outputDir: FileSystemDirectoryHandle) => void;
	onImport: (bundleDir: FileSystemDirectoryHandle) => void;
	onCollect: (relocate: boolean, outputDir: FileSystemDirectoryHandle) => void;
	onCancelJob: () => void;
	busy: boolean;
	progressPhase: string | null;
	integrityReport: BundleIntegrityReportSnapshot | null;
	lastMessage: string | null;
}

const DIRECTORY_PERMISSION_DENIED_MESSAGE = () =>
	studioCopy(studioLocale()).bundlePermissionDenied;

async function pickDirectory(
	mode: 'read' | 'readwrite'
): Promise<FileSystemDirectoryHandle | null> {
	const picker = (
		window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
	).showDirectoryPicker;
	if (!picker) return null;
	try {
		const handle = await picker();
		if (mode === 'readwrite' && handle.requestPermission) {
			const status = await handle.requestPermission({ mode: 'readwrite' });
			if (status !== 'granted') throw new Error(DIRECTORY_PERMISSION_DENIED_MESSAGE());
		}
		return handle;
	} catch (error) {
		if (isAbortError(error)) return null;
		throw error;
	}
}

export function BundleDialog(props: BundleDialogProps) {
	const copy = () => studioCopy(studioLocale());
	const [open, setOpen] = createSignal(false);
	const [relocate, setRelocate] = createSignal(false);
	const [pickerError, setPickerError] = createSignal<string | null>(null);

	async function requestDirectory(
		mode: 'read' | 'readwrite'
	): Promise<FileSystemDirectoryHandle | null> {
		setPickerError(null);
		try {
			return await pickDirectory(mode);
		} catch (error) {
			setPickerError(errorMessage(error));
			setOpen(true);
			return null;
		}
	}

	const runExport = async (policy: BundleSourcePolicySnapshot) => {
		const dir = await requestDirectory('readwrite');
		if (!dir) return;
		props.onExport(policy, dir);
		setOpen(true);
	};

	const runImport = async () => {
		const dir = await requestDirectory('read');
		if (!dir) return;
		props.onImport(dir);
		setOpen(true);
	};

	const runCollect = async () => {
		const dir = await requestDirectory('readwrite');
		if (!dir) return;
		props.onCollect(relocate(), dir);
		setOpen(true);
	};

	return (
		<Popover.Root
			open={open()}
			onOpenChange={(details) => setOpen(details.open)}
			positioning={{ placement: 'bottom-end', gutter: 8 }}
		>
			<Popover.Trigger
				class={buttonVariants({ variant: 'outline' })}
				disabled={props.disabled || !props.directoryPickerAvailable}
				title={
					props.directoryPickerAvailable
						? copy().bundleTriggerTitle
						: copy().bundlePickerTitle
				}
			>
				<FolderArchive size={14} aria-hidden="true" />
				{copy().project}
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content class="export-popover bundle-popover panel" aria-label={copy().projectBundle}>
						<div class="export-popover-header">
							<h2 class="export-popover-title">
								{copy().projectBundle}{' '}
								<span class="text-xs text-muted-foreground font-normal">({copy().experimental})</span>
							</h2>
							<p class="export-popover-subtitle">{copy().bundleSubtitle}</p>
						</div>
						<div class="bundle-actions">
							<Button
								variant="default"
								disabled={props.busy}
								onClick={() => void runExport({ mode: 'embed-media' })}
							>
<FolderOutput size={14} aria-hidden="true" />
									{copy().exportProject}
								</Button>
							<Button
								variant="outline"
								disabled={props.busy}
								onClick={() => void runExport({ mode: 'reference-only' })}
							>
{copy().exportReferencesOnly}
								</Button>
							<Button variant="outline" disabled={props.busy} onClick={() => void runImport()}>
<FolderInput size={14} aria-hidden="true" />
									{copy().importProject}
								</Button>
							<label class="bundle-collect-row">
								<input
									type="checkbox"
									checked={relocate()}
									onChange={(event) => setRelocate(event.currentTarget.checked)}
									disabled={props.busy}
								/>
{copy().relocatePaths}
								</label>
							<Button variant="outline" disabled={props.busy} onClick={() => void runCollect()}>
<FolderArchive size={14} aria-hidden="true" />
									{copy().collectMedia}
								</Button>
						</div>
						<Show
							when={
								props.busy ||
								props.progressPhase ||
								props.integrityReport ||
								props.lastMessage ||
								pickerError()
							}
						>
							<div class="bundle-status" aria-live="polite">
								<Show when={pickerError()}>
									<p class="is-warn">{pickerError()}</p>
								</Show>
<Show when={props.busy && props.progressPhase}>
										<p>{copy().workingPhase.replace('{phase}', props.progressPhase ?? '')}</p>
									</Show>
								<Show when={props.lastMessage}>
									<p>{props.lastMessage}</p>
								</Show>
								<Show when={props.integrityReport}>
									{(report) => (
										<div class="bundle-integrity">
<p class={report().ok ? 'is-ok' : 'is-warn'}>
													{report().ok ? copy().bundleIntegrityOk : copy().bundleIntegrityIssues}
												</p>
											<ul>
												<For
													each={report()
														.items.filter((item: BundleIntegrityItemSnapshot) => item.code !== 'ok')
														.slice(0, 8)}
												>
													{(item) => <li>{item.message}</li>}
												</For>
											</ul>
										</div>
									)}
								</Show>
<Show when={props.busy}>
										<Button variant="ghost" onClick={() => props.onCancelJob()}>
											{copy().cancel}
										</Button>
									</Show>
							</div>
						</Show>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	);
}
