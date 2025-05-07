import { Container } from '@/components/container';
import { cn } from '@/lib/utils';
import { ActivityIndicator } from 'react-native';

interface LoadingProps {
  className?: string;
}

export function Loading({ className }: LoadingProps) {
  return (
    <Container className={cn('items-center justify-center', className)}>
      <ActivityIndicator />
    </Container>
  );
}
