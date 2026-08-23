import React from 'react';

// Illustrative sample data only — a plausible onboarding funnel shape,
// not real conversion numbers. Single hue, light → dark = sequential
// magnitude, matching the "one hue, light-to-dark" rule for funnels.
const STAGES = [
  { label: 'Visits landing page', pct: 100, color: '#BFDBFE' },
  { label: 'Creates an account', pct: 42, color: '#60A5FA' },
  { label: 'Connects a channel', pct: 27, color: '#3B82F6' },
  { label: 'Sends first message', pct: 19, color: '#2563EB' },
];

export default function FunnelChart() {
  return (
    <div className="panel p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Example onboarding funnel</h3>
        <span className="text-xs text-ink-faint">Illustrative example</span>
      </div>

      <div className="mt-5 space-y-3" role="img" aria-label="Funnel chart showing an example onboarding drop-off across four stages">
        {STAGES.map((stage) => (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-ink-muted">{stage.label}</span>
              <span className="font-medium text-ink">{stage.pct}%</span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-md bg-void">
              <div
                className="h-full rounded-md transition-[width]"
                style={{ width: `${stage.pct}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
