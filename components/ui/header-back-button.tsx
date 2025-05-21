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
      className="size-12"
      onPress={() => navigation.goBack()}
      size="icon"
      variant="link"
      wrapperClassName="web:ml-4"
    >
      {Platform.OS === 'android' ? (
        <ArrowLeft className="color-foreground" />
      ) : (
        <ChevronLeft className="color-foreground" />
      )}
    </Button>
  );
}
