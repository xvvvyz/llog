type DismissStackOptions = {
  id?: string;
  layer: number;
  onDismiss: () => void;
  open: boolean;
};

export const useDismissStack = (_options: DismissStackOptions) => {};
