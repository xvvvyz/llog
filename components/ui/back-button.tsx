import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { router } from 'expo-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react-native';
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
        icon={Platform.select({ default: ArrowLeft, ios: ChevronLeft })}
        size={Platform.select({ default: 24, ios: 30 })}
      />
    </Button>
  );
};
