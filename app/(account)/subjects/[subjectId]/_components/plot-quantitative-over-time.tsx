'use client';

import PlotFigure from '@/(account)/subjects/[subjectId]/_components/plot-figure';
import { axisY, dot, lineY, pointerX, tip } from '@observablehq/plot';

interface PlotQuantitativeOverTimeProps {
  channels: Record<string, string>;
  events?: Array<Record<string, unknown>>;
  inputKey: string;
  inputLabel?: string;
  width?: number;
}

const PlotQuantitativeOverTime = ({
  channels,
  events = [],
  inputKey,
  inputLabel,
  width,
}: PlotQuantitativeOverTimeProps) => {
  if (events.length < 2) return null;

  return (
    <PlotFigure
      options={{
        marginLeft: 40,
        marks: [
          axisY({
            label: null,
            lineWidth: 8,
            textOverflow: 'ellipsis',
            tickSize: 0,
          }),
          lineY(events, {
            x: (d) => new Date(d.Time),
            y: inputKey,
          }),
          dot(events, {
            fill: 'currentColor',
            x: (d) => new Date(d.Time),
            y: inputKey,
          }),
          tip(
            events,
            pointerX({
              channels,
              lineWidth: 50,
              x: (d) => new Date(d.Time),
              y: inputKey,
            }),
          ),
        ],
        title: `${inputLabel ?? inputKey} / time`,
        width,
        x: { label: 'Time', type: 'time' },
        y: { padding: 0.53 },
      }}
    />
  );
};

export default PlotQuantitativeOverTime;