import schema from '@/instant.schema';
import { describe, expect, test } from 'bun:test';

describe('schema', () => {
  test('cascades cards', () => {
    expect(schema.links.cardsAnalyses.forward).toMatchObject({
      has: 'many',
      label: 'analyses',
      on: 'cards',
    });

    expect(schema.links.cardsAnalyses.reverse).toMatchObject({
      has: 'one',
      label: 'card',
      on: 'analyses',
      onDelete: 'cascade',
      required: true,
    });

    expect(schema.links.cardsFacts.forward).toMatchObject({
      has: 'many',
      label: 'facts',
      on: 'cards',
    });

    expect(schema.links.cardsFacts.reverse).toMatchObject({
      has: 'one',
      label: 'card',
      on: 'facts',
      onDelete: 'cascade',
      required: true,
    });

    expect(schema.links.recordsFacts.forward).toMatchObject({
      has: 'many',
      label: 'facts',
      on: 'records',
    });

    expect(schema.links.recordsFacts.reverse).toMatchObject({
      has: 'one',
      label: 'record',
      on: 'facts',
      onDelete: 'cascade',
      required: true,
    });
  });
});
