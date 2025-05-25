import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useNavigation } from 'expo-router';
import { ArrowLeft, ChevronLeft } from 'lucide-react-native';
import { Platform } from 'react-native';

export function BackButton() {
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
        <Icon aria-hidden className="color-foreground" icon={ArrowLeft} />
      ) : (
        <Icon aria-hidden className="color-foreground" icon={ChevronLeft} />
      )}
    </Button>
  );
}
