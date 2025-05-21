import { ArrowLeft } from '@/components/icons/arrow-left';
import { ChevronLeft } from '@/components/icons/chevron-left';
import { Button } from '@/components/ui/button';
import { useNavigation } from 'expo-router';
import { Platform } from 'react-native';

export function HeaderBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;

  return (
    <Button
      accessibilityHint="Navigates to the previous screen"
      accessibilityLabel="Go back"
      className="size-14"
      onPress={() => navigation.goBack()}
      size="icon"
      variant="link"
    >
      {Platform.OS === 'android' ? (
        <ArrowLeft aria-hidden className="color-foreground" />
      ) : (
        <ChevronLeft aria-hidden className="color-foreground" />
      )}
    </Button>
  );
}
