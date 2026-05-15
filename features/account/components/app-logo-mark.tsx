import { SPECTRUM } from '@/theme/spectrum';
import { UI } from '@/theme/ui';
import Svg, { Circle, Rect } from 'react-native-svg';

type AppLogoMarkProps = { framed?: boolean; size?: number };

export const AppLogoMark = ({
  framed = false,
  size = 48,
}: AppLogoMarkProps) => {
  const viewBox = framed ? '0 0 64 64' : '13 16 38 32';
  const height = framed ? size : (size * 32) / 38;

  return (
    <Svg fill="none" height={height} viewBox={viewBox} width={size}>
      {framed && (
        <Rect fill={UI.light.secondary} height={64} rx={16} width={64} />
      )}
      <Rect
        fill={SPECTRUM.light[6].lighter}
        height={8}
        rx={4}
        width={38}
        x={13}
        y={16}
      />
      <Circle cx={17} cy={20} fill={SPECTRUM.light[6].default} r={4} />
      <Rect
        fill={SPECTRUM.light[7].lighter}
        height={8}
        rx={4}
        width={32}
        x={13}
        y={28}
      />
      <Circle cx={17} cy={32} fill={SPECTRUM.light[7].default} r={4} />
      <Rect
        fill={SPECTRUM.light[8].lighter}
        height={8}
        rx={4}
        width={26}
        x={13}
        y={40}
      />
      <Circle cx={17} cy={44} fill={SPECTRUM.light[8].default} r={4} />
    </Svg>
  );
};
