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
  test('indents web lists', () => {
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

  test('indents native lists', () => {
    platform.OS = 'ios';
    const nodes = renderRecordMarkdownText({ text: '- one\n  - two' });
    const child = getElement(nodes[2]);
    const children = React.Children.toArray(child.props.children);
    expect(children[0]).toBe('  ');
  });

  test('flattens preview lists', () => {
    platform.OS = 'web';

    const nodes = renderRecordMarkdownText({
      flattenListItems: true,
      text: '- lorem\n- ...ipsum',
    });

    const first = getElement(nodes[0]);
    const second = getElement(nodes[2]);
    const firstChildren = React.Children.toArray(first.props.children);
    const secondChildren = React.Children.toArray(second.props.children);
    expect(first.type).toBe(React.Fragment);
    expect(firstChildren[0]).toBe('');

    expect(
      React.Children.toArray(getElement(firstChildren[1]).props.children)
    ).toEqual(['-', ' ']);

    expect(firstChildren[2]).toBe('lorem');
    expect(nodes[1]).toBe('\n');
    expect(second.type).toBe(React.Fragment);

    expect(
      React.Children.toArray(getElement(secondChildren[1]).props.children)
    ).toEqual(['-', ' ']);

    expect(secondChildren[2]).toBe('...ipsum');
  });
});

function getElement(node: React.ReactNode) {
  if (!React.isValidElement<TestElementProps>(node)) {
    throw new Error('Expected React element');
  }

  return node;
}
