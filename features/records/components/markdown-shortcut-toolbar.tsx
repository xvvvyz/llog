import * as markdownShortcuts from '@/features/records/lib/markdown-shortcuts';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import * as buttonGroup from '@/ui/button-group';
import { Icon } from '@/ui/icon';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import * as React from 'react';

import {
  CaretLeft,
  DotsThree,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
} from 'phosphor-react-native';

type MarkdownShortcutItem = {
  accessibilityLabel: string;
  icon: React.ComponentType<PhosphorIconProps>;
  shortcut: markdownShortcuts.MarkdownShortcut;
};

const MARKDOWN_SHORTCUTS: MarkdownShortcutItem[] = [
  { accessibilityLabel: 'Bold', icon: TextB, shortcut: 'bold' },
  { accessibilityLabel: 'Italic', icon: TextItalic, shortcut: 'italic' },
  { accessibilityLabel: 'Link', icon: LinkSimple, shortcut: 'link' },
  {
    accessibilityLabel: 'Bulleted list',
    icon: ListBullets,
    shortcut: 'unordered-list',
  },
  {
    accessibilityLabel: 'Numbered list',
    icon: ListNumbers,
    shortcut: 'ordered-list',
  },
  {
    accessibilityLabel: 'Underline',
    icon: TextUnderline,
    shortcut: 'underline',
  },
  {
    accessibilityLabel: 'Strikethrough',
    icon: TextStrikethrough,
    shortcut: 'strikethrough',
  },
  { accessibilityLabel: 'Quote', icon: Quotes, shortcut: 'blockquote' },
  { accessibilityLabel: 'Divider', icon: Minus, shortcut: 'horizontal-rule' },
];

const PRIMARY_MARKDOWN_SHORTCUTS = MARKDOWN_SHORTCUTS.slice(0, 5);
const OVERFLOW_MARKDOWN_SHORTCUTS = MARKDOWN_SHORTCUTS.slice(5);

export const MarkdownShortcutToolbar = ({
  disabled,
  onShortcut,
  onShortcutPressStart,
  showAllBreakpoint = 'sm',
}: {
  disabled?: boolean;
  onShortcut: (shortcut: markdownShortcuts.MarkdownShortcut) => void;
  onShortcutPressStart?: (event: unknown) => void;
  showAllBreakpoint?: 'xs' | 'sm';
}) => {
  const breakpoints = useBreakpoints();
  const [isOverflowOpen, setIsOverflowOpen] = React.useState(false);
  const showAllShortcuts = breakpoints[showAllBreakpoint];

  React.useEffect(() => {
    if (disabled || showAllShortcuts) setIsOverflowOpen(false);
  }, [disabled, showAllShortcuts]);

  const visibleShortcuts = showAllShortcuts
    ? MARKDOWN_SHORTCUTS
    : isOverflowOpen
      ? OVERFLOW_MARKDOWN_SHORTCUTS
      : PRIMARY_MARKDOWN_SHORTCUTS;

  const handleShortcut = React.useCallback(
    (shortcut: markdownShortcuts.MarkdownShortcut) => {
      onShortcut(shortcut);
    },
    [onShortcut]
  );

  const toggleOverflow = React.useCallback(
    () => setIsOverflowOpen((current) => !current),
    []
  );

  return (
    <buttonGroup.ButtonGroup>
      {visibleShortcuts.map((item, index) => (
        <buttonGroup.ButtonGroupButton
          key={item.shortcut}
          accessibilityLabel={item.accessibilityLabel}
          disabled={disabled}
          onPointerDown={onShortcutPressStart}
          onPress={() => handleShortcut(item.shortcut)}
          onTouchStart={onShortcutPressStart}
          showSeparator={index > 0}
        >
          <Icon icon={item.icon} />
        </buttonGroup.ButtonGroupButton>
      ))}
      {!showAllShortcuts && (
        <buttonGroup.ButtonGroupButton
          disabled={disabled}
          onPointerDown={onShortcutPressStart}
          onPress={toggleOverflow}
          onTouchStart={onShortcutPressStart}
          showSeparator={visibleShortcuts.length > 0}
          accessibilityLabel={
            isOverflowOpen
              ? 'Show primary markdown formatting'
              : 'Show more markdown formatting'
          }
        >
          <Icon icon={isOverflowOpen ? CaretLeft : DotsThree} />
        </buttonGroup.ButtonGroupButton>
      )}
    </buttonGroup.ButtonGroup>
  );
};
