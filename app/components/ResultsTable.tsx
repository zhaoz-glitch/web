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
    { key: null, label: "代码 / 名称" },
    { key: null, label: "行业" },
    { key: "close", label: "股价" },
    { key: "market_cap_basic", label: "市值" },
    { key: "price_earnings_ttm", label: "PE (TTM)" },
    { key: null, label: "PB" },
    { key: "dividend_yield_recent", label: "股息率" },
    { key: "carbon_intensity_revenue", label: "碳强度 (t/$M)" },
    { key: "total_emissions", label: "总排放" },
    { key: "carbon_change_yoy", label: "碳排 YoY" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          筛选结果
          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
            共 {total} 只标的
          </span>
        </span>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || total === 0}
          className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        >
          {exporting ? "导出中…" : "导出 CSV"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={`px-3 py-2.5 font-medium ${
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
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/60">
                  {columns.map((c) => (
                    <td key={c.label} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
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
                  没有符合条件的标的，请调整筛选条件
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
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
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
                      <span className="text-xs text-gray-400 dark:text-gray-500">无数据</span>
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
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          第 {page} / {totalPages} 页
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
