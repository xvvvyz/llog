'use client';

import { plot, PlotOptions } from '@observablehq/plot';
import { useEffect, useRef } from 'react';

const PlotFigure = ({
  options: { color, x, y, ...options },
}: {
  options: PlotOptions;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const p = plot({
      color: { scheme: 'spectral', ...color },
      grid: true,
      insetBottom: 5,
      insetLeft: 10,
      marginBottom: 60,
      marginLeft: 110,
      marginRight: 0,
      marginTop: 20,
      x: { padding: 0, tickSize: 0, ...x },
      y: { padding: 0, tickSize: 0, ...y },
      ...options,
    });

    containerRef.current.append(p);
    return () => p.remove();
  }, [color, options, x, y]);

  return <div ref={containerRef} />;
};

export default PlotFigure;
