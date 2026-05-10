import { describe, expect, mock, test } from 'bun:test';
import * as React from 'react';

type TestElementProps = {
  children?: React.ReactNode;
  style?: Record<string, unknown>;
};

const platform = { OS: 'web' };

mock.module('react-native', () => ({
  Linking: { openURL: mock(() => undefined) },
  Platform: platform,
}));

mock.module('@/ui/text', () => ({
  Text: ({ children, ...props }: TestElementProps) =>
    React.createElement('Text', props, children),
}));

const { renderRecordMarkdownText } =
  await import('@/features/records/components/record-markdown-text');

describe('renderRecordMarkdownText', () => {
  test('applies parsed list indentation on web', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: '- one\n  - two' });
    const parent = getElement(nodes[0]);
    const child = getElement(nodes[2]);

    const childMarker = getElement(
      React.Children.toArray(child.props.children)[0]
    );

    expect(parent.props.style).toMatchObject({ paddingLeft: '2.25ch' });
    expect(child.props.style).toMatchObject({ paddingLeft: '4.25ch' });
    expect(childMarker.props.style).toMatchObject({ left: '2ch' });
  });

  test('applies parsed list indentation on native', () => {
    platform.OS = 'ios';
    const nodes = renderRecordMarkdownText({ text: '- one\n  - two' });
    const child = getElement(nodes[2]);
    const children = React.Children.toArray(child.props.children);
    expect(children[0]).toBe('  ');
  });
});

function getElement(node: React.ReactNode) {
  if (!React.isValidElement<TestElementProps>(node)) {
    throw new Error('Expected React element');
  }

  return node;
}
