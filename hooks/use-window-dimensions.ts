import {
  Platform,
  useWindowDimensions as useWindowDimensionsPrimitive,
} from 'react-native';

export const useWindowDimensions = () => {
  const dimensions = useWindowDimensionsPrimitive();

  return Platform.select({
    default: { width: dimensions.width, height: dimensions.height },
    web: { width: window.innerWidth, height: window.innerHeight },
  });
};
