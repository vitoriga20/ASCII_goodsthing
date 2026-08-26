import { Popover } from '@ark-ui/solid/popover';
import { Languages } from 'lucide-solid';
import { Portal } from 'solid-js/web';
import { cn } from '../lib/utils';
import { studioCopy, type StudioLocale } from './locale';

interface LocaleSettingsProps {
	readonly locale: () => StudioLocale;
	readonly onLocaleChange: (locale: StudioLocale) => void;
}

export function LocaleSettings(props: LocaleSettingsProps) {
	const copy = () => studioCopy(props.locale());
	return (
		<Popover.Root positioning={{ placement: 'bottom-end', gutter: 8 }}>
			<Popover.Trigger class="locale-settings-button" aria-label={copy().settings} title={copy().settings}>
				<Languages size={14} aria-hidden="true" />
				<span>{props.locale() === 'zh-CN' ? '中文' : 'EN'}</span>
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content class="locale-settings-popover panel" aria-label={copy().settings}>
						<p>{copy().language}</p>
						<div role="group" aria-label={copy().language}>
							<button
								type="button"
								class={cn('locale-option', props.locale() === 'zh-CN' && 'is-active')}
								onClick={() => props.onLocaleChange('zh-CN')}
							>
								简体中文
							</button>
<button
									type="button"
									class={cn('locale-option', props.locale() === 'en' && 'is-active')}
									onClick={() => props.onLocaleChange('en')}
								>
									{copy().localeEnglish}
								</button>
						</div>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	);
}
