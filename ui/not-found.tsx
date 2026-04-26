import { cn } from '@/lib/cn';
import { Page } from '@/ui/page';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';

const NOT_FOUND_DELAY_MS = 2000;

export const NotFound = ({ className, ...props }: ViewProps) => {
  const [showNotFound, setShowNotFound] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowNotFound(true), NOT_FOUND_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className={cn('min-h-40 flex-1 items-center justify-center', className)}
      {...props}
    >
      {showNotFound ? <Text>404</Text> : <Spinner />}
    </View>
  );
};

export const NotFoundPage = () => (
  <Page>
    <NotFound />
  </Page>
);
