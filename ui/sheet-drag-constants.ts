export const SHEET_DISMISS_ACTIVE_OFFSET_Y = 10;

export const SHEET_DISMISS_FAIL_OFFSET_X = 24;

export const SHEET_DISMISS_THRESHOLD_MIN_PX = 72;

export const SHEET_DISMISS_THRESHOLD_MAX_PX = 160;

export const SHEET_DISMISS_THRESHOLD_RATIO = 0.14;

export const SHEET_DISMISS_VELOCITY_THRESHOLD = 900;

export const SHEET_EXIT_TRANSLATION_MIN_PX = 220;

export const SHEET_EXIT_TRANSLATION_RATIO = 0.38;

export const SHEET_CLOSE_ANIMATION_DURATION_MS = 180;

export const SHEET_SCROLL_TOP_TOLERANCE = 1;

export const SHEET_DRAG_HANDLE_HEIGHT = 20;

export const SHEET_RESET_SPRING_CONFIG = {
  damping: 28,
  mass: 1,
  stiffness: 280,
};

export const SHEET_SORTABLE_DRAG_HANDLE_TEST_ID = 'sheet-sortable-drag-handle';

export const SHEET_DRAG_SURFACE_TEST_ID = 'sheet-drag-surface';

export const SHEET_SORTABLE_DRAG_HANDLE_PROPS = {
  testID: SHEET_SORTABLE_DRAG_HANDLE_TEST_ID,
} as const;

export const SHEET_DRAG_SURFACE_PROPS = {
  testID: SHEET_DRAG_SURFACE_TEST_ID,
} as const;
