import { describe, expect, mock, test } from 'bun:test';
import * as React from 'react';

type TestElementProps = {
  asChild?: boolean;
  children?: React.ReactNode;
  className?: string;
  onPress?: () => void;
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
    expect(child.props.style).toMatchObject({ paddingLeft: '4.5ch' });
    expect(childMarker.props.style).toMatchObject({ left: '2.25ch' });
  });

  test('indents native lists', () => {
    platform.OS = 'ios';
    const nodes = renderRecordMarkdownText({ text: '- one\n  - two' });
    const child = getElement(nodes[2]);
    const children = React.Children.toArray(child.props.children);
    expect(getElement(children[0]).props.children).toBe('  ');
  });

  test('omits ordered punctuation', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: '1. one' });
    const item = getElement(nodes[0]);
    const marker = getElement(React.Children.toArray(item.props.children)[0]);
    expect(React.Children.toArray(marker.props.children)).toEqual(['1']);
  });

  test('keeps task syntax', () => {
    platform.OS = 'web';

    const nodes = renderRecordMarkdownText({
      color: '#2255aa',
      text: '- [ ] one\n- [x] two',
    });

    const first = getElement(nodes[0]);
    const second = getElement(nodes[2]);
    const firstChildren = React.Children.toArray(first.props.children);
    const secondChildren = React.Children.toArray(second.props.children);
    expect(getElementTypeName(first)).toBe('Text');
    expect(firstChildren[1]).toBe('[ ] one');
    expect(secondChildren[1]).toBe('[x] two');
  });

  test('flattens preview lists', () => {
    platform.OS = 'web';

    const nodes = renderRecordMarkdownText({
      flattenListItems: true,
      text: '- first\n- ...second',
    });

    const first = getElement(nodes[0]);
    const second = getElement(nodes[2]);
    const firstChildren = React.Children.toArray(first.props.children);
    const secondChildren = React.Children.toArray(second.props.children);
    expect(first.type).toBe(React.Fragment);
    expect(firstChildren[0]).toBe('');

    expect(
      React.Children.toArray(getElement(firstChildren[1]).props.children)
    ).toEqual(['–', ' ']);

    expect(firstChildren[2]).toBe('first');
    expect(nodes[1]).toBe('\n');
    expect(second.type).toBe(React.Fragment);

    expect(
      React.Children.toArray(getElement(secondChildren[1]).props.children)
    ).toEqual(['–', ' ']);

    expect(secondChildren[2]).toBe('...second');
  });

  test('omits flattened punctuation', () => {
    platform.OS = 'web';

    const nodes = renderRecordMarkdownText({
      flattenListItems: true,
      text: '1. first',
    });

    const first = getElement(nodes[0]);
    const firstChildren = React.Children.toArray(first.props.children);

    expect(
      React.Children.toArray(getElement(firstChildren[1]).props.children)
    ).toEqual(['1', ' ']);
  });

  test('keeps heading syntax', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: '# Big\n### Small' });
    const big = getElement(nodes[0]);
    const small = getElement(nodes[2]);
    expect(React.Children.toArray(big.props.children)).toEqual(['# Big']);
    expect(React.Children.toArray(small.props.children)).toEqual(['### Small']);
  });

  test('keeps empty lines', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: 'one\n\ntwo' });

    expect(React.Children.toArray(getElement(nodes[0]).props.children)).toEqual(
      ['one']
    );

    expect(nodes[1]).toBe('\n');
    expect(nodes[2]).toBe('');
    expect(nodes[3]).toBe('\n');

    expect(React.Children.toArray(getElement(nodes[4]).props.children)).toEqual(
      ['two']
    );
  });

  test('renders horizontal rules', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: 'one\n---\ntwo' });
    const rule = getElement(nodes[2]);
    expect(rule.props.className).toContain('text-muted-foreground');

    expect(rule.props.style).toMatchObject({
      borderTop: '1px solid currentColor',
      display: 'block',
    });

    expect(nodes[3]).toBeNull();
  });

  test('renders multiline blockquotes', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: '> one\n> **two**' });
    const quote = getElement(nodes[0]);
    expect(quote.props.className).toContain('text-muted-foreground');
    expect(quote.props.style).toMatchObject({ display: 'block' });
    expect(nodes[1]).toBeNull();
  });

  test('separates blockquotes', () => {
    platform.OS = 'web';
    const nodes = renderRecordMarkdownText({ text: '> one\nnext' });
    expect(nodes[1]).toBeNull();

    expect(React.Children.toArray(getElement(nodes[2]).props.children)).toEqual(
      ['next']
    );
  });
});

function getElement(node: React.ReactNode) {
  if (!React.isValidElement<TestElementProps>(node)) {
    throw new Error('Expected React element');
  }

  return node;
}

function getElementTypeName(node: React.ReactElement) {
  return typeof node.type === 'function' ? node.type.name : node.type;
}
