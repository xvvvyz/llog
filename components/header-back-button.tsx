import { ChevronLeft } from '@/components/icons/chevron-left';
import { Button } from '@/components/ui/button';
import { useNavigation } from 'expo-router';

export function HeaderBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;

  return (
    <Button
      className="size-12"
      onPress={() => navigation.goBack()}
      size="icon"
      variant="link"
    >
      <ChevronLeft className="color-foreground" />
    </Button>
  );
}
