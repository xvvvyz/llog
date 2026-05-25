import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { CaretLeft, CaretRight } from 'phosphor-react-native';

type CardPaginationButtonProps = {
  direction: 'next' | 'previous';
  disabled?: boolean;
  onPress: () => void;
};

export const CardPaginationButton = ({
  direction,
  disabled,
  onPress,
}: CardPaginationButtonProps) => (
  <Button
    className="size-10 rounded-full"
    disabled={disabled}
    onPress={onPress}
    size="icon-sm"
    variant="ghost"
    wrapperClassName="rounded-full"
    accessibilityLabel={
      direction === 'previous' ? 'Previous card' : 'Next card'
    }
  >
    <Icon
      className="text-foreground"
      icon={direction === 'previous' ? CaretLeft : CaretRight}
    />
  </Button>
);
