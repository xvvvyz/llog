type SheetStackOptions = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type SheetStackState = { isTopSheet: boolean; zIndex: number };

type SheetStackBackdropState = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

export const useSheetStack = ({
  layer,
  open,
}: SheetStackOptions): SheetStackState => ({ isTopSheet: open, zIndex: layer });

export const useSheetStackBackdrop = (): SheetStackBackdropState => ({
  layer: 0,
  onDismiss: () => {},
  open: false,
});
