import * as markdownShortcuts from '@/features/records/lib/markdown-shortcuts';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
import * as React from 'react';

import {
  LinkSimple,
  ListBullets,
  ListNumbers,
  TextB,
  TextItalic,
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
  {
    accessibilityLabel: 'Underline',
    icon: TextUnderline,
    shortcut: 'underline',
  },
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
];

export const MarkdownShortcutToolbar = ({
  disabled,
  onShortcut,
  onShortcutPressStart,
}: {
  disabled?: boolean;
  onShortcut: (shortcut: markdownShortcuts.MarkdownShortcut) => void;
  onShortcutPressStart?: (event: unknown) => void;
}) => (
  <React.Fragment>
    {MARKDOWN_SHORTCUTS.map((item) => (
      <Button
        key={item.shortcut}
        accessibilityLabel={item.accessibilityLabel}
        disabled={disabled}
        onPointerDown={onShortcutPressStart}
        onPress={() => onShortcut(item.shortcut)}
        onTouchStart={onShortcutPressStart}
        size="icon-xs"
        variant="secondary"
      >
        <Icon icon={item.icon} />
      </Button>
    ))}
  </React.Fragment>
);
