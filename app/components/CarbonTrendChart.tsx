import type { CarbonTrendPoint } from "~/types";

interface Props {
  data: CarbonTrendPoint[];
}

/**
 * Lightweight SVG line chart for the 5-year carbon trend
 * (total emissions bars + carbon intensity line, dual scale).
 */
export function CarbonTrendChart({ data }: Props) {
  const valid = data.filter((d) => d.total_emissions != null);
  if (valid.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        暂无碳排放历史数据
      </div>
    );
  }

  const W = 480;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const emissions = valid.map((d) => d.total_emissions as number);
  const intensities = valid
    .filter((d) => d.carbon_intensity_revenue != null)
    .map((d) => d.carbon_intensity_revenue as number);

  const maxEmission = Math.max(...emissions);
  const minEmission = 0;
  const maxIntensity = intensities.length
    ? Math.max(...intensities) * 1.15
    : 1;
  const minIntensity = 0;

  const x = (i: number) =>
    PAD.left + (valid.length === 1 ? plotW / 2 : (i / (valid.length - 1)) * plotW);
  const yEmission = (v: number) =>
    PAD.top + plotH - ((v - minEmission) / (maxEmission - minEmission || 1)) * plotH;
  const yIntensity = (v: number) =>
    PAD.top + plotH - ((v - minIntensity) / (maxIntensity - minIntensity || 1)) * plotH;

  const barW = Math.min(28, (plotW / valid.length) * 0.5);

  // Carbon intensity line path
  const linePoints = valid
    .map((d, i) =>
      d.carbon_intensity_revenue != null
        ? `${x(i)},${yIntensity(d.carbon_intensity_revenue)}`
        : null,
    )
    .filter(Boolean) as string[];
  const linePath = linePoints.length > 1 ? `M ${linePoints.join(" L ")}` : "";

  const fmtEmission = (v: number) =>
    v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/60" />
          总排放量 (tCO2e)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-blue-600" />
          碳强度 (t/$M)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="碳排趋势图">
        {/* Y axis grid lines (emission scale) */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD.top + plotH - t * plotH;
          const val = minEmission + t * (maxEmission - minEmission);
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
                {fmtEmission(val)}
              </text>
            </g>
          );
        })}

        {/* Emission bars */}
        {valid.map((d, i) => (
          <rect
            key={d.report_year}
            x={x(i) - barW / 2}
            y={yEmission(d.total_emissions as number)}
            width={barW}
            height={PAD.top + plotH - yEmission(d.total_emissions as number)}
            fill="rgb(16 185 129 / 0.55)"
            rx="2"
          >
            <title>
              {d.report_year}: {fmtEmission(d.total_emissions as number)} tCO2e
            </title>
          </rect>
        ))}

        {/* Carbon intensity line */}
        {linePath && (
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
        )}
        {valid.map((d, i) =>
          d.carbon_intensity_revenue != null ? (
            <circle
              key={d.report_year}
              cx={x(i)}
              cy={yIntensity(d.carbon_intensity_revenue)}
              r="3"
              fill="#2563eb"
            >
              <title>
                {d.report_year}: {d.carbon_intensity_revenue.toFixed(1)} t/$M
              </title>
            </circle>
          ) : null,
        )}

        {/* X axis labels */}
        {valid.map((d, i) => (
          <text
            key={d.report_year}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {d.report_year}
          </text>
        ))}
      </svg>
    </div>
  );
}
