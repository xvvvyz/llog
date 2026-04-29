type SheetStackOptions = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type SheetStackState = { isTopSheet: boolean };

type SheetStackBackdropState = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

export const useSheetStack = ({
  open,
}: SheetStackOptions): SheetStackState => ({ isTopSheet: open });

export const useSheetStackBackdrop = (): SheetStackBackdropState => ({
  layer: 0,
  onDismiss: () => {},
  open: false,
});
