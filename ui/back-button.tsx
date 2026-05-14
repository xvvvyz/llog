import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Href, router } from 'expo-router';
import { ArrowLeft, CaretLeft } from 'phosphor-react-native';
import { Platform } from 'react-native';

export const BackButton = ({ fallbackHref = '/' }: { fallbackHref?: Href }) => {
  const canGoBack = router.canGoBack();

  return (
    <Button
      className="size-11"
      size="icon"
      variant="link"
      wrapperClassName="md:-ml-4 md:mr-4"
      onPress={() => {
        if (canGoBack) {
          router.back();
          return;
        }

        router.replace(fallbackHref);
      }}
    >
      <Icon
        className="color-foreground"
        icon={Platform.select({ default: ArrowLeft, ios: CaretLeft })}
        size={Platform.select({ default: 24, ios: 30 })}
      />
    </Button>
  );
};
