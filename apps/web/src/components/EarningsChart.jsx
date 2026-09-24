// Zero-dependency bar chart (plain inline SVG) shared by the Dashboard
// earnings card's sparkline and the full Earnings screen's range chart -
// no charting library is worth adding to the bundle for a bar chart this
// simple. The SVG viewBox is normalized to a 0-100 x 0-100 box regardless
// of on-screen size, so the parent controls actual pixel dimensions via
// CSS (see `height` prop, applied as inline style on the wrapper).
export function EarningsChart({ data, height = 120, compact = false, formatLabel }) {
  const hasAmounts = data?.some((d) => d.amount > 0);

  if (!data || data.length === 0 || !hasAmounts) {
    return (
      <div
        className="flex items-center justify-center text-xs text-text-muted"
        style={{ height }}
      >
        No earnings yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.amount));
  const barSlot = 100 / data.length;
  const barWidth = barSlot * (compact ? 0.6 : 0.55);
  // Labels get crowded past ~8 bars (the 30-day view), so thin them out to
  // first/mid/last rather than one per bar.
  const labelIndexes = compact
    ? []
    : data.length <= 8
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const barHeightPct = max > 0 ? (d.amount / max) * 92 : 0;
          const x = i * barSlot + (barSlot - barWidth) / 2;
          return (
            <rect
              key={i}
              x={x}
              y={100 - barHeightPct}
              width={barWidth}
              height={Math.max(barHeightPct, d.amount > 0 ? 2 : 0)}
              rx={compact ? 1.5 : 2}
              fill="var(--color-brand-solid)"
              opacity={d.amount > 0 ? 1 : 0.15}
            />
          );
        })}
      </svg>
      {!compact && labelIndexes.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-text-muted">
          {labelIndexes.map((i) => (
            <span key={i}>{formatLabel ? formatLabel(data[i].period) : data[i].period}</span>
          ))}
        </div>
      )}
    </div>
  );
}
