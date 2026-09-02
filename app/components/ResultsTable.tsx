import type { ScreenerRow } from "~/types";

export type SortKey =
  | "market_cap_basic"
  | "close"
  | "price_earnings_ttm"
  | "turnover"
  | "dividend_yield_recent"
  | "carbon_intensity_revenue"
  | "carbon_change_yoy"
  | "total_emissions";

interface Props {
  rows: ScreenerRow[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  loading: boolean;
  onSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onRowClick: (symbol: string) => void;
  onExport: () => void;
  exporting: boolean;
}

function fmtMarketCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v}`;
}

function fmtNum(v: number | null, digits = 2): string {
  return v == null ? "—" : v.toFixed(digits);
}

function fmtEmissions(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M t`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K t`;
  return `${v} t`;
}

function YoYBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-400 dark:text-gray-500">—</span>;
  const down = value < 0; // 排放下降是好事
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
        down
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
          : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
      }`}
    >
      {down ? "▼" : "▲"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function ResultsTable({
  rows,
  total,
  page,
  pageSize,
  sortBy,
  sortOrder,
  loading,
  onSort,
  onPageChange,
  onRowClick,
  onExport,
  exporting,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: { key: SortKey | null; label: string; align?: string }[] = [
    { key: null, label: "Symbol" },
    { key: null, label: "Sector" },
    { key: "close", label: "Price" },
    { key: "market_cap_basic", label: "Mkt Cap" },
    { key: "price_earnings_ttm", label: "PE (TTM)" },
    { key: null, label: "PB" },
    { key: "dividend_yield_recent", label: "Yield" },
    { key: "carbon_intensity_revenue", label: "Intensity" },
    { key: "total_emissions", label: "Emissions" },
    { key: "carbon_change_yoy", label: "Carbon YoY" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-emerald-900/30 dark:bg-[#0f1c18]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-emerald-900/20">
        <span className="min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Results
          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
            {total} stocks
          </span>
        </span>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || total === 0}
          className="shrink-0 whitespace-nowrap rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500 dark:border-emerald-900/20 dark:bg-emerald-950/10 dark:text-gray-400">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={`whitespace-nowrap px-3 py-2.5 font-medium ${
                    col.key ? "cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100" : ""
                  } ${col.key === "close" || col.key === "market_cap_basic" ? "text-right" : "text-left"}`}
                  onClick={col.key ? () => onSort(col.key!) : undefined}
                >
                  {col.label}
                  {col.key && sortBy === col.key && (
                    <span className="ml-0.5 text-emerald-600 dark:text-emerald-400">
                      {sortOrder === "desc" ? "↓" : "↑"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-emerald-900/15">
                  {columns.map((c) => (
                    <td key={c.label} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-emerald-950/20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  No matching stocks. Try adjusting filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.symbol}
                  onClick={() => onRowClick(row.symbol)}
                  className="cursor-pointer border-b border-gray-50 hover:bg-emerald-50/40 dark:border-gray-800/60 dark:hover:bg-emerald-950/20"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{row.symbol}</div>
                    <div className="max-w-[180px] truncate text-xs text-gray-500 dark:text-gray-400">
                      {row.name}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-emerald-950/20 dark:text-gray-300">
                      {row.sector}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {fmtNum(row.close)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {fmtMarketCap(row.market_cap)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtNum(row.pe_ttm, 1)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{fmtNum(row.pb, 1)}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {row.dividend_yield == null ? "—" : `${row.dividend_yield.toFixed(2)}%`}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.has_carbon_data ? (
                      <span className="tabular-nums text-gray-800 dark:text-gray-200">
                        {fmtNum(row.carbon_intensity_revenue, 1)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-gray-600 dark:text-gray-300">
                    {fmtEmissions(row.total_emissions)}
                  </td>
                  <td className="px-3 py-2.5">
                    <YoYBadge value={row.carbon_change_yoy} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-emerald-900/20">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Page {page} / {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="whitespace-nowrap rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-emerald-900/30 dark:text-gray-300 dark:hover:bg-emerald-950/20"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="whitespace-nowrap rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-emerald-900/30 dark:text-gray-300 dark:hover:bg-emerald-950/20"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
