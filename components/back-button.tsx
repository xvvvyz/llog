import { ChevronLeft } from '@/components/icons/chevron-left';
import { useNavigation } from 'expo-router';
import { Button } from './ui/button';

export function BackButton() {
  const navigation = useNavigation();

  return (
    <Button onPress={navigation.goBack} size="icon" variant="link">
      <ChevronLeft className="color-foreground" size={24} />
    </Button>
  );
}
