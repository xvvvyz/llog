import { forwardRef } from 'react';
import { type ViewProps, View as ViewPrimitive } from 'react-native';

const View = forwardRef<ViewPrimitive, ViewProps>(
  ({ style, ...props }, ref) => {
    return (
      <ViewPrimitive
        ref={ref}
        style={[{ borderCurve: 'continuous' }, style]}
        {...props}
      />
    );
  }
);

View.displayName = 'View';

export { View };
