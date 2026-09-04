import type { CarbonTrendPoint } from "~/types";

interface Props {
  data: CarbonTrendPoint[];
  /** Sector label of the selected company, used in the legend for the
   *  sector-average baseline (e.g. "Electronic Technology"). */
  sector?: string | null;
}

/**
 * Lightweight SVG line chart for the 5-year carbon trend.
 *
 * Left axis  — total emissions bars (tCO2e)
 * Right axis — carbon intensity (tCO2e / $M) with two reference lines:
 *              • US market average  (cross-sectional, whole covered universe)
 *              • Sector average     (peers within the company's sector 大类)
 * Baselines come pre-computed from the backend; a year with no peer values
 * leaves a gap instead of drawing a fake straight segment.
 */
export function CarbonTrendChart({ data, sector }: Props) {
  const valid = data.filter((d) => d.total_emissions != null);
  if (valid.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        No carbon history
      </div>
    );
  }

  const W = 480;
  const H = 210;
  const PAD = { top: 20, right: 46, bottom: 30, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const emissions = valid.map((d) => d.total_emissions as number);

  // Three intensity-scale series: company, US market avg, sector avg.
  const companyIntensity = valid.map((d) => d.carbon_intensity_revenue ?? null);
  const usAvg = valid.map((d) => d.us_avg_intensity ?? null);
  const sectorAvg = valid.map((d) => d.sector_avg_intensity ?? null);

  const allIntensity = [...companyIntensity, ...usAvg, ...sectorAvg].filter(
    (v): v is number => v != null,
  );

  const maxEmission = Math.max(...emissions);
  const minEmission = 0;
  const maxIntensity = allIntensity.length ? Math.max(...allIntensity) * 1.15 : 1;
  const minIntensity = 0;

  const x = (i: number) =>
    PAD.left + (valid.length === 1 ? plotW / 2 : (i / (valid.length - 1)) * plotW);
  const yEmission = (v: number) =>
    PAD.top + plotH - ((v - minEmission) / (maxEmission - minEmission || 1)) * plotH;
  const yIntensity = (v: number) =>
    PAD.top + plotH - ((v - minIntensity) / (maxIntensity - minIntensity || 1)) * plotH;

  const barW = Math.min(28, (plotW / valid.length) * 0.5);

  // Segmented path: each series is split at null points (real gaps).
  const lineSegments = (series: (number | null)[]): string => {
    let d = "";
    let active = false;
    series.forEach((v, i) => {
      if (v == null) {
        active = false;
        return;
      }
      d += `${active ? " L" : " M"} ${x(i).toFixed(1)},${yIntensity(v).toFixed(1)}`;
      active = true;
    });
    return d.trim();
  };

  const companyPath = lineSegments(companyIntensity);
  const usPath = lineSegments(usAvg);
  const sectorPath = lineSegments(sectorAvg);

  const lastPoint = (series: (number | null)[]): { i: number; v: number } | null => {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i] != null) return { i, v: series[i] as number };
    }
    return null;
  };
  const usEnd = lastPoint(usAvg);
  const sectorEnd = lastPoint(sectorAvg);

  const fmtEmission = (v: number) =>
    v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`;
  const fmtIntensity = (v: number) => `${v.toFixed(0)}`;

  const sectorEqualsCompany =
    sectorEnd != null &&
    companyIntensity[sectorEnd.i] != null &&
    Math.abs((sectorEnd.v - (companyIntensity[sectorEnd.i] as number)) / (sectorEnd.v || 1)) < 0.005;

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/60 dark:bg-emerald-400/50" />
          Total emissions (tCO2e)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-blue-600 dark:bg-blue-400" />
          Intensity
        </span>
        <span className="flex items-center gap-1" title="Simple average across all covered US stocks with intensity data that year">
          <span className="inline-block w-4 border-t-2 border-dashed border-amber-600 dark:border-amber-400" />
          US market avg
        </span>
        <span className="flex items-center gap-1" title="Simple average across peers in the same sector with intensity data that year">
          <span className="inline-block w-4 border-t-[2.5px] border-dotted border-violet-600 dark:border-violet-400" />
          {sector ? `${sector} avg` : "Sector avg"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Carbon trend chart with US market and sector average baselines">
        <defs>
          <filter id="sector-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#7c3aed" floodOpacity="0.45" />
          </filter>
        </defs>
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
                className="stroke-gray-200 dark:stroke-gray-800"
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af" className="fill-gray-400 dark:fill-gray-500">
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
            className="fill-emerald-500/55 dark:fill-emerald-400/45"
            rx="2"
          >
            <title>
              {d.report_year}: {fmtEmission(d.total_emissions as number)} tCO2e
            </title>
          </rect>
        ))}

        {/* US market baseline (drawn under company line) */}
        {usPath && (
          <path d={usPath} fill="none" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" className="stroke-amber-600 dark:stroke-amber-400" />
        )}
        {usEnd && (
          <text x={x(usEnd.i) + 4} y={yIntensity(usEnd.v) + 3} fontSize="9" fill="#b45309" className="fill-amber-700 dark:fill-amber-400">
            US {fmtIntensity(usEnd.v)}
          </text>
        )}

        {/* Company intensity line */}
        {companyPath && (
          <path d={companyPath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" className="stroke-blue-600 dark:stroke-blue-400" />
        )}
        {valid.map((d, i) =>
          d.carbon_intensity_revenue != null ? (
            <circle
              key={d.report_year}
              cx={x(i)}
              cy={yIntensity(d.carbon_intensity_revenue)}
              r="3"
              fill="#2563eb"
              className="fill-blue-600 dark:fill-blue-400"
            >
              <title>
                {d.report_year}: {d.carbon_intensity_revenue.toFixed(1)} t/$M
                {"\n"}US avg: {d.us_avg_intensity?.toFixed(1) ?? "n/a"} ({d.us_peer_count ?? 0} peers)
                {"\n"}Sector avg: {d.sector_avg_intensity?.toFixed(1) ?? "n/a"} ({d.sector_peer_count ?? 0} peers)
                {d.sector_avg_intensity != null && Math.abs(d.carbon_intensity_revenue - d.sector_avg_intensity) < 0.1 ? " — same as intensity" : ""}
              </title>
            </circle>
          ) : null,
        )}

        {/* Sector baseline (drawn ON TOP of company line so it is visible even when equal) */}
        {sectorPath && (
          <path
            d={sectorPath}
            fill="none"
            strokeWidth="2.5"
            strokeDasharray="2 3"
            strokeLinecap="round"
            filter="url(#sector-glow)"
            className="stroke-violet-600 dark:stroke-violet-400"
          />
        )}
        {sectorEnd && sectorPath && (
          <text
            x={x(sectorEnd.i) + 4}
            y={yIntensity(sectorEnd.v) + (sectorEqualsCompany ? 10 : -6)}
            fontSize="9"
            fill="#7c3aed"
            className="fill-violet-700 dark:fill-violet-400"
          >
            S {fmtIntensity(sectorEnd.v)}
            {sectorEqualsCompany ? " (same)" : ""}
          </text>
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
            className="fill-gray-500 dark:fill-gray-400"
          >
            {d.report_year}
          </text>
        ))}
      </svg>
      {sector && sectorEqualsCompany && (
        <p className="mt-1.5 text-[10px] leading-tight text-violet-600/90 dark:text-violet-400/90">
          The {sector} baseline overlaps the company line because carbon intensity is currently estimated at sector level. Peer-level dispersion will appear once per-company disclosed data is available.
        </p>
      )}
    </div>
  );
}
