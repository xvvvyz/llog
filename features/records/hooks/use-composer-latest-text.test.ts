import { getNextComposerTextMirrorState } from '@/features/records/hooks/use-composer-latest-text';
import { describe, expect, test } from 'bun:test';

describe('useComposerLatestText', () => {
  test('keeps dirty local text', () => {
    expect(
      getNextComposerTextMirrorState({
        current: {
          displayText: 'Offline draft',
          lastExternalText: '',
          latestText: 'Offline draft',
          resetKey: 'record-a',
        },
        resetKey: 'record-a',
        text: '',
      })
    ).toEqual({
      displayText: 'Offline draft',
      lastExternalText: '',
      latestText: 'Offline draft',
      resetKey: 'record-a',
    });
  });

  test('accepts caught-up text', () => {
    expect(
      getNextComposerTextMirrorState({
        current: {
          displayText: 'Offline draft',
          lastExternalText: '',
          latestText: 'Offline draft',
          resetKey: 'record-a',
        },
        resetKey: 'record-a',
        text: 'Offline draft',
      })
    ).toEqual({
      displayText: 'Offline draft',
      lastExternalText: 'Offline draft',
      latestText: 'Offline draft',
      resetKey: 'record-a',
    });
  });

  test('resets on draft change', () => {
    expect(
      getNextComposerTextMirrorState({
        current: {
          displayText: 'Old draft',
          lastExternalText: '',
          latestText: 'Old draft',
          resetKey: 'record-a',
        },
        resetKey: 'record-b',
        text: '',
      })
    ).toEqual({
      displayText: '',
      lastExternalText: '',
      latestText: '',
      resetKey: 'record-b',
    });
  });

  test('resets without draft ids', () => {
    expect(
      getNextComposerTextMirrorState({
        current: {
          displayText: 'Edited existing record',
          lastExternalText: 'Existing record',
          latestText: 'Edited existing record',
          resetKey: 'edit:record-a',
        },
        resetKey: 'create:log-a',
        text: '',
      })
    ).toEqual({
      displayText: '',
      lastExternalText: '',
      latestText: '',
      resetKey: 'create:log-a',
    });
  });
});
