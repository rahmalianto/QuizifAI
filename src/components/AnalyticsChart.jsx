import { useState, useRef } from 'react';

const CHART_W = 700;
const CHART_H = 180;
const PAD = { top: 16, right: 24, bottom: 40, left: 44 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function scaleX(i, total) {
  if (total <= 1) return 0;
  return (i / (total - 1)) * INNER_W;
}

function scaleY(value, max) {
  if (max === 0) return INNER_H;
  return INNER_H - (value / max) * INNER_H;
}

function buildPath(points) {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function buildArea(points) {
  if (points.length === 0) return '';
  const path = buildPath(points);
  return `${path} L ${points[points.length - 1].x.toFixed(1)} ${INNER_H} L ${points[0].x.toFixed(1)} ${INNER_H} Z`;
}

/**
 * AnalyticsChart
 * @param {Array<{date: string, practice_count: number, avg_score: number}>} data
 */
export default function AnalyticsChart({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  if (data.length === 0) {
    return (
      <div className="analytics-chart-empty">
        <p>No practice data yet. Start a practice session to see your trend!</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.practice_count), 1);

  // Score is already 0–100, count is normalised to 0–100 for dual-axis display
  const countPoints = data.map((d, i) => ({
    x: scaleX(i, data.length),
    y: scaleY((d.practice_count / maxCount) * 100, 100),
    raw: d.practice_count,
    date: d.date,
  }));

  const scorePoints = data.map((d, i) => ({
    x: scaleX(i, data.length),
    y: scaleY(d.avg_score ?? 0, 100),
    raw: d.avg_score,
    date: d.date,
  }));

  // Y gridlines at 0, 25, 50, 75, 100
  const gridLines = [0, 25, 50, 75, 100];

  // X-axis labels — show ~6 evenly spaced labels
  const labelStep = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data
    .map((d, i) => ({ i, label: formatDate(d.date) }))
    .filter((_, i) => i === 0 || i === data.length - 1 || i % labelStep === 0);

  function handleMouseMove(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * CHART_W - PAD.left;
    if (svgX < 0 || svgX > INNER_W) { setTooltip(null); return; }

    // Find nearest point
    let nearest = 0;
    let minDist = Infinity;
    countPoints.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });

    const d = data[nearest];
    const px = countPoints[nearest].x + PAD.left;
    setTooltip({ index: nearest, x: px, date: d.date, count: d.practice_count, score: d.avg_score });
  }

  return (
    <div className="analytics-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="analytics-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        aria-label="Daily practice chart"
      >
        <defs>
          <linearGradient id="grad-count" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grad-score" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7C5CFC" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid lines */}
          {gridLines.map(v => (
            <g key={v}>
              <line
                x1={0} y1={scaleY(v, 100)}
                x2={INNER_W} y2={scaleY(v, 100)}
                stroke="#E4E7EB" strokeWidth="1" strokeDasharray={v === 0 ? '0' : '4 4'}
              />
              <text
                x={-8} y={scaleY(v, 100)}
                textAnchor="end" dominantBaseline="middle"
                fontSize="10" fill="#9BA3AE"
              >
                {v}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => (
            <text
              key={i}
              x={scaleX(i, data.length)}
              y={INNER_H + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#9BA3AE"
            >
              {label}
            </text>
          ))}

          {/* Area fills */}
          <path d={buildArea(countPoints)} fill="url(#grad-count)" />
          <path d={buildArea(scorePoints)} fill="url(#grad-score)" />

          {/* Lines */}
          <path d={buildPath(countPoints)} fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d={buildPath(scorePoints)} fill="none" stroke="#7C5CFC" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots */}
          {countPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0EA5E9" stroke="#fff" strokeWidth="1.5" />
          ))}
          {scorePoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#7C5CFC" stroke="#fff" strokeWidth="1.5" />
          ))}

          {/* Tooltip vertical line */}
          {tooltip && (
            <line
              x1={tooltip.x - PAD.left} y1={0}
              x2={tooltip.x - PAD.left} y2={INNER_H}
              stroke="#CDD3DA" strokeWidth="1" strokeDasharray="4 3"
            />
          )}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="analytics-tooltip"
          style={{
            left: `calc(${((tooltip.x) / CHART_W) * 100}% + 8px)`,
          }}
        >
          <div className="analytics-tooltip-date">{formatDateLong(tooltip.date)}</div>
          <div className="analytics-tooltip-row">
            <span className="analytics-tooltip-dot" style={{ background: '#0EA5E9' }} />
            <span>Sessions</span>
            <strong>{tooltip.count}</strong>
          </div>
          <div className="analytics-tooltip-row">
            <span className="analytics-tooltip-dot" style={{ background: '#7C5CFC' }} />
            <span>Avg Score</span>
            <strong>{tooltip.score != null ? `${Math.round(tooltip.score)}%` : '—'}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
