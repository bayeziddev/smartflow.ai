import React, { useState } from 'react';

// Illustrative sample data only — not real customer metrics. Shows the
// shape of what a growing account's routed-message volume might look
// like over two weeks.
const DATA = [12, 18, 16, 24, 31, 29, 38, 45, 41, 52, 61, 58, 70, 82];
const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 16 };

export default function LineChart() {
  const [hoverIdx, setHoverIdx] = useState(null);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const max = Math.max(...DATA);
  const min = 0;

  const x = (i) => PAD.left + (i / (DATA.length - 1)) * plotW;
  const y = (v) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const linePath = DATA.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const areaPath = `${linePath} L ${x(DATA.length - 1)} ${PAD.top + plotH} L ${x(0)} ${PAD.top + plotH} Z`;

  return (
    <div className="panel p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Messages routed, per day</h3>
        <span className="text-xs text-ink-faint">Illustrative example</span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Line chart showing an example upward trend in messages routed per day over two weeks"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* recessive gridlines */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={PAD.top + plotH * t}
            y2={PAD.top + plotH * t}
            stroke="#232B4A"
            strokeWidth={1}
          />
        ))}

        <path d={areaPath} fill="#2563EB" opacity={0.12} />
        <path d={linePath} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* rounded data-end anchored to the last point */}
        <circle cx={x(DATA.length - 1)} cy={y(DATA[DATA.length - 1])} r={4} fill="#2563EB" />

        {/* hover targets — bigger than the mark, per the interaction spec */}
        {DATA.map((v, i) => (
          <g key={i}>
            <rect
              x={x(i) - plotW / DATA.length / 2}
              y={PAD.top}
              width={plotW / DATA.length}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
            {hoverIdx === i && (
              <>
                <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={PAD.top + plotH} stroke="#565F82" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={x(i)} cy={y(v)} r={5} fill="#080B13" stroke="#2563EB" strokeWidth={2} />
              </>
            )}
          </g>
        ))}
      </svg>

      <div className="relative h-0">
        {hoverIdx !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-void-border bg-void-elevated px-2.5 py-1.5 text-xs text-ink shadow-card"
            style={{ left: `${(x(hoverIdx) / WIDTH) * 100}%`, top: `${(y(DATA[hoverIdx]) / HEIGHT) * 100 - 4}%` }}
          >
            Day {hoverIdx + 1}: <strong>{DATA[hoverIdx]}</strong> messages
          </div>
        )}
      </div>
    </div>
  );
}
