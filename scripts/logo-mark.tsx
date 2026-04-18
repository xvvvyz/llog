import * as React from 'react';
import { SPECTRUM } from '../theme/spectrum';

const LOGO_COLOR_INDEXES = [1, 5, 2, 7] as const;

export const ICON_BACKGROUND = 'hsl(0 0% 100%)';

export const LOGO_COLORS = LOGO_COLOR_INDEXES.map(
  (index) => SPECTRUM.light[index].default
);

export const LOGO_COLORS_DARK = LOGO_COLOR_INDEXES.map(
  (index) => SPECTRUM.dark[index].default
);

export const ICON_COLORS = LOGO_COLOR_INDEXES.map(
  (index) => SPECTRUM.light[index].lighter
);

export const ICON_COLORS_DARK = LOGO_COLOR_INDEXES.map(
  (index) => SPECTRUM.dark[index].lighter
);

const getLogoColors = (colorScheme: 'light' | 'dark') =>
  colorScheme === 'dark' ? LOGO_COLORS_DARK : LOGO_COLORS;

const getContinuousRoundedSquarePath = ({
  exponent = 4.5,
  segments = 96,
  size,
  x,
  y,
}: {
  exponent?: number;
  segments?: number;
  size: number;
  x: number;
  y: number;
}) => {
  const half = size / 2;
  const centerX = x + half;
  const centerY = y + half;
  const points: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const absCos = Math.abs(cos);
    const absSin = Math.abs(sin);

    const scale =
      1 /
      Math.pow(
        Math.pow(absCos, exponent) + Math.pow(absSin, exponent),
        1 / exponent
      );

    const pointX = centerX + half * cos * scale;
    const pointY = centerY + half * sin * scale;
    points.push({ x: pointX, y: pointY });
  }

  if (points.length === 0) return '';
  const commands: string[] = [`M ${points[0]!.x} ${points[0]!.y}`];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length]!;
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    const afterNext = points[(index + 2) % points.length]!;
    const control1X = current.x + (next.x - previous.x) / 6;
    const control1Y = current.y + (next.y - previous.y) / 6;
    const control2X = next.x - (afterNext.x - current.x) / 6;
    const control2Y = next.y - (afterNext.y - current.y) / 6;

    commands.push(
      `C ${control1X} ${control1Y} ${control2X} ${control2Y} ${next.x} ${next.y}`
    );
  }

  return `${commands.join(' ')} Z`;
};

const getLogoGeometry = ({
  gapRatio = 0.06,
  paddingRatio = 0,
  radiusRatio = 0.2,
  size,
}: {
  gapRatio?: number;
  paddingRatio?: number;
  radiusRatio?: number;
  size: number;
}) => {
  const paddedSize = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const gap = Math.max(1, Math.round(paddedSize * gapRatio));
  const squareSize = Math.max(1, Math.floor((paddedSize - gap) / 2));
  const radius = Math.max(1, Math.round(squareSize * radiusRatio));
  const contentSize = squareSize * 2 + gap;
  const offset = Math.floor((size - contentSize) / 2);

  return {
    gap,
    offset,
    radius,
    squareSize,
  };
};

export const LogoMark = ({
  colorScheme = 'light',
  gapRatio = 0.06,
  radiusRatio = 0.31,
  size,
}: {
  colorScheme?: 'light' | 'dark';
  gapRatio?: number;
  radiusRatio?: number;
  size: number;
}) => {
  const colors = getLogoColors(colorScheme);

  const { gap, radius, squareSize } = getLogoGeometry({
    gapRatio,
    radiusRatio,
    size,
  });

  const createSquare = (color: string, key: string) =>
    React.createElement('div', {
      key,
      style: {
        width: squareSize,
        height: squareSize,
        borderRadius: radius,
        backgroundColor: color,
      },
    });

  return React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: size,
        height: size,
        gap,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap,
        },
      },
      createSquare(colors[0], 'top-left'),
      createSquare(colors[1], 'top-right')
    ),
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap,
        },
      },
      createSquare(colors[2], 'bottom-left'),
      createSquare(colors[3], 'bottom-right')
    )
  );
};

export const LogoSvg = ({
  backgroundColor = ICON_BACKGROUND,
  clip = false,
  colorScheme = 'light',
  colors: colorsProp,
  gapRatio = 0.06,
  paddingRatio = 0.185,
  radiusRatio = 0.31,
  size,
}: {
  backgroundColor?: string;
  clip?: boolean;
  colorScheme?: 'light' | 'dark';
  colors?: readonly string[];
  gapRatio?: number;
  paddingRatio?: number;
  radiusRatio?: number;
  size: number;
}) => {
  const colors = colorsProp ?? getLogoColors(colorScheme);

  // Use float arithmetic so the squares are perfectly centered in the SVG canvas.
  // getLogoGeometry rounds to integers (needed for React Native layout), but SVG
  // handles sub-pixel coordinates natively — skipping the rounding eliminates the
  // 1px left/right asymmetry that integer math introduces at certain sizes.
  const paddedSize = size * (1 - paddingRatio * 2);
  const gap = paddedSize * gapRatio;
  const squareSize = (paddedSize - gap) / 2;
  const offset = size * paddingRatio; // == (size - paddedSize) / 2, exactly symmetric

  const continuousExponent = 2.8 + (1 - radiusRatio) * 2.5;
  const x1 = offset;
  const x2 = offset + squareSize + gap;
  const y1 = offset;
  const y2 = offset + squareSize + gap;

  const pathProps = {
    shapeRendering: 'geometricPrecision' as const,
    stroke: 'none',
  };

  // Outer squircle clip — same superellipse exponent as the inner squares so the
  // curve style matches exactly. Applied via clipPath so the shape is a true squircle,
  // not just a circular-arc rounded rect (rx/ry).
  const clipId = 'icon-clip';

  const outerClipPath = clip
    ? getContinuousRoundedSquarePath({
        exponent: continuousExponent,
        size,
        x: 0,
        y: 0,
      })
    : null;

  const innerElements = [
    React.createElement('rect', {
      fill: backgroundColor,
      height: size,
      key: 'bg',
      shapeRendering: 'geometricPrecision',
      stroke: 'none',
      width: size,
      x: 0,
      y: 0,
    }),
    React.createElement('path', {
      d: getContinuousRoundedSquarePath({
        exponent: continuousExponent,
        size: squareSize,
        x: x1,
        y: y1,
      }),
      fill: colors[0],
      key: 'tl',
      ...pathProps,
    }),
    React.createElement('path', {
      d: getContinuousRoundedSquarePath({
        exponent: continuousExponent,
        size: squareSize,
        x: x2,
        y: y1,
      }),
      fill: colors[1],
      key: 'tr',
      ...pathProps,
    }),
    React.createElement('path', {
      d: getContinuousRoundedSquarePath({
        exponent: continuousExponent,
        size: squareSize,
        x: x1,
        y: y2,
      }),
      fill: colors[2],
      key: 'bl',
      ...pathProps,
    }),
    React.createElement('path', {
      d: getContinuousRoundedSquarePath({
        exponent: continuousExponent,
        size: squareSize,
        x: x2,
        y: y2,
      }),
      fill: colors[3],
      key: 'br',
      ...pathProps,
    }),
  ];

  return React.createElement(
    'svg',
    {
      fill: 'none',
      viewBox: `0 0 ${size} ${size}`,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    outerClipPath
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'defs',
            null,
            React.createElement(
              'clipPath',
              { id: clipId },
              React.createElement('path', {
                d: outerClipPath,
                shapeRendering: 'geometricPrecision',
              })
            )
          ),
          React.createElement(
            'g',
            { clipPath: `url(#${clipId})` },
            ...innerElements
          )
        )
      : innerElements
  );
};

const PILL_WIDTH_RATIOS = [0.8, 0.68, 0.56] as const;

const APP_ICON_BG = 'hsl(0 0% 100%)';

const getSquirclePillPath = ({
  exponent = 4.5,
  height,
  segments = 96,
  width,
  x,
  y,
}: {
  exponent?: number;
  height: number;
  segments?: number;
  width: number;
  x: number;
  y: number;
}): string => {
  const r = height / 2;
  const cx1 = x + width - r;
  const cx2 = x + r;
  const cy = y + r;

  const squirclePoint = (cx: number, angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const scale =
      1 /
      Math.pow(
        Math.pow(Math.abs(cos), exponent) + Math.pow(Math.abs(sin), exponent),
        1 / exponent
      );

    return { x: cx + r * cos * scale, y: cy + r * sin * scale };
  };

  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= segments; i++) {
    points.push(squirclePoint(cx1, -Math.PI / 2 + (Math.PI * i) / segments));
  }

  for (let i = 0; i <= segments; i++) {
    points.push(squirclePoint(cx2, Math.PI / 2 + (Math.PI * i) / segments));
  }

  const [first, ...rest] = points;
  return `M ${first!.x} ${first!.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`;
};

const PILL_COLORS = [
  SPECTRUM.light[6].lighter, // cyan
  SPECTRUM.light[7].lighter, // blue
  SPECTRUM.light[8].lighter, // lavender
] as const;

const PILL_DOT_COLORS = [
  SPECTRUM.light[6].default,
  SPECTRUM.light[7].default,
  SPECTRUM.light[8].default,
] as const;

const PILL_COLORS_DARK = [
  SPECTRUM.dark[6].lighter,
  SPECTRUM.dark[7].lighter,
  SPECTRUM.dark[8].lighter,
] as const;

const PILL_DOT_COLORS_DARK = [
  SPECTRUM.dark[6].default,
  SPECTRUM.dark[7].default,
  SPECTRUM.dark[8].default,
] as const;

export const AppIcon = ({
  backgroundColor = APP_ICON_BG,
  clip = false,
  colorScheme = 'light',
  colors,
  cropToContent = false,
  dotColors,
  size,
}: {
  backgroundColor?: string;
  clip?: boolean;
  colorScheme?: 'light' | 'dark';
  colors?: readonly string[];
  cropToContent?: boolean;
  dotColors?: readonly string[];
  paddingRatio?: number;
  radiusRatio?: number;
  size: number;
}) => {
  const resolvedColors =
    colors ?? (colorScheme === 'dark' ? PILL_COLORS_DARK : PILL_COLORS);

  const resolvedDotColors =
    dotColors ??
    (colorScheme === 'dark' ? PILL_DOT_COLORS_DARK : PILL_DOT_COLORS);

  const contentWidth = size * 0.72;
  const longestPillWidth = contentWidth * PILL_WIDTH_RATIOS[0];
  const squareSide = longestPillWidth;
  const gap = squareSide / 11; // 3 bars + 2 gaps, bars = 3× gap → 11 units total
  const pillHeight = gap * 3;
  const startY = (size - squareSide) / 2;
  const leftX = (size - longestPillWidth) / 2;

  const clipId = 'icon-clip';
  const continuousExponent = 4.5;

  const outerClipPath = clip
    ? getContinuousRoundedSquarePath({
        exponent: continuousExponent,
        size,
        x: 0,
        y: 0,
      })
    : null;

  const innerElements = [
    React.createElement('rect', {
      fill: backgroundColor,
      height: size,
      key: 'bg',
      shapeRendering: 'geometricPrecision',
      stroke: 'none',
      width: size,
      x: 0,
      y: 0,
    }),
    ...resolvedColors.flatMap((color, i) => {
      const y = startY + i * (pillHeight + gap);

      return [
        React.createElement('path', {
          d: getSquirclePillPath({
            exponent: 2.35,
            height: pillHeight,
            width: contentWidth * PILL_WIDTH_RATIOS[i]!,
            x: leftX,
            y,
          }),
          fill: color,
          key: `bar-${i}`,
          shapeRendering: 'geometricPrecision',
          stroke: 'none',
        }),
        React.createElement('path', {
          d: getContinuousRoundedSquarePath({
            exponent: 2.35,
            size: pillHeight,
            x: leftX,
            y,
          }),
          fill: resolvedDotColors[i],
          key: `dot-${i}`,
          shapeRendering: 'geometricPrecision',
          stroke: 'none',
        }),
      ];
    }),
  ];

  const cropPad = size * 0.02;
  const cropSide = squareSide + cropPad * 2;
  const cropOrigin = (size - cropSide) / 2;

  const viewBox = cropToContent
    ? `${cropOrigin} ${cropOrigin} ${cropSide} ${cropSide}`
    : `0 0 ${size} ${size}`;

  return React.createElement(
    'svg',
    { fill: 'none', viewBox, xmlns: 'http://www.w3.org/2000/svg' },
    outerClipPath
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'defs',
            null,
            React.createElement(
              'clipPath',
              { id: clipId },
              React.createElement('path', {
                d: outerClipPath,
                shapeRendering: 'geometricPrecision',
              })
            )
          ),
          React.createElement(
            'g',
            { clipPath: `url(#${clipId})` },
            ...innerElements
          )
        )
      : innerElements
  );
};
