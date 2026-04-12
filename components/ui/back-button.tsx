import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { router } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native/lib/module/icons/ArrowLeft';
import { CaretLeft } from 'phosphor-react-native/lib/module/icons/CaretLeft';
import { Platform } from 'react-native';

export const BackButton = () => {
  if (!router.canGoBack()) return null;

  return (
    <Button
      className="size-11"
      onPress={() => router.back()}
      size="icon"
      variant="link"
      wrapperClassName="md:-ml-4 md:mr-4"
    >
      <Icon
        className="color-foreground"
        icon={Platform.select({ default: ArrowLeft, ios: CaretLeft })}
        size={Platform.select({ default: 24, ios: 30 })}
      />
    </Button>
  );
};
