type SheetStackOptions = {
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

type SheetStackState = { isTopSheet: boolean };

export const useSheetStack = ({
  open,
}: SheetStackOptions): SheetStackState => ({ isTopSheet: open });
