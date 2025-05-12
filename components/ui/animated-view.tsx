import { cssInterop } from 'nativewind';
import { Animated } from 'react-native';

export const AnimatedView = cssInterop(Animated.View, { className: 'style' });
