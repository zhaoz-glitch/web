import { useEffect, useState } from "react";
import type { ScreenerRow } from "~/types";

export type SortKey =
  | "symbol"
  | "sector"
  | "close"
  | "market_cap_basic"
  | "price_earnings_ttm"
  | "price_book_value"
  | "dividend_yield_recent"
  | "turnover"
  | "volume"
  | "change_1_year"
  | "net_margin"
  | "carbon_intensity_revenue"
  | "total_emissions"
  | "carbon_change_yoy";

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
  selectedSymbols: string[];
  onToggleSelect: (symbol: string) => void;
  onSelectAll: () => void;
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

function fmtPercent(v: number | null, digits = 2): string {
  return v == null ? "—" : `${v.toFixed(digits)}%`;
}

function fmtVolume(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v}`;
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
  selectedSymbols,
  onToggleSelect,
  onSelectAll,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [jumpValue, setJumpValue] = useState(String(page));
  useEffect(() => setJumpValue(String(page)), [page]);

  const submitJump = () => {
    const n = parseInt(jumpValue, 10);
    if (!Number.isFinite(n)) { setJumpValue(String(page)); return; }
    const clamped = Math.min(Math.max(1, n), totalPages);
    if (clamped !== page) onPageChange(clamped);
    setJumpValue(String(clamped));
  };

  const allSelected = rows.length > 0 && rows.every((r) => selectedSymbols.includes(r.symbol));
  const someSelected = rows.some((r) => selectedSymbols.includes(r.symbol)) && !allSelected;

  const columns: { key: SortKey | "__check"; label: string; align: "left" | "right"; render: (row: ScreenerRow) => React.ReactNode }[] = [
    { key: "__check", label: "", align: "left", render: (row) => (
      <input
        type="checkbox"
        checked={selectedSymbols.includes(row.symbol)}
        onChange={(e) => {
          e.stopPropagation();
          onToggleSelect(row.symbol);
        }}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
      />
    )},
    { key: "symbol", label: "Symbol", align: "left", render: (row) => (
      <>
        <div className="font-medium text-gray-900 dark:text-gray-100">{row.symbol}</div>
        <div className="max-w-[180px] truncate text-xs text-gray-500 dark:text-gray-400">{row.name}</div>
      </>
    )},
    { key: "sector", label: "Sector", align: "left", render: (row) => (
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-emerald-950/20 dark:text-gray-300">
        {row.sector}
      </span>
    )},
    { key: "close", label: "Price", align: "right", render: (row) => <span className="tabular-nums">{fmtNum(row.close)}</span> },
    { key: "market_cap_basic", label: "Market Cap (USD)", align: "right", render: (row) => <span className="tabular-nums">{fmtMarketCap(row.market_cap)}</span> },
    { key: "price_earnings_ttm", label: "PE (TTM) (x)", align: "right", render: (row) => <span className="tabular-nums">{fmtNum(row.pe_ttm, 1)}</span> },
    { key: "price_book_value", label: "PB (x)", align: "right", render: (row) => <span className="tabular-nums">{fmtNum(row.pb, 1)}</span> },
    { key: "dividend_yield_recent", label: "Div. Yield (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.dividend_yield)}</span> },
    { key: "turnover", label: "Turnover (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.turnover)}</span> },
    { key: "volume", label: "Volume (shares)", align: "right", render: (row) => <span className="tabular-nums">{fmtVolume(row.volume)}</span> },
    { key: "change_1_year", label: "52W Change (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.week_52_change)}</span> },
    { key: "net_margin", label: "Net Margin (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.net_profit_margin)}</span> },
    { key: "carbon_intensity_revenue", label: "Carbon Intensity (tCO2e/$M)", align: "right", render: (row) => (
      row.has_carbon_data
        ? <span className="tabular-nums text-gray-800 dark:text-gray-200">{fmtNum(row.carbon_intensity_revenue, 1)}</span>
        : <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
    )},
    { key: "total_emissions", label: "Total Emissions (tCO2e)", align: "right", render: (row) => <span className="tabular-nums text-gray-600 dark:text-gray-300">{fmtEmissions(row.total_emissions)}</span> },
    { key: "carbon_change_yoy", label: "Carbon YoY (%)", align: "right", render: (row) => <YoYBadge value={row.carbon_change_yoy} /> },
  ];

  const numericKeys: SortKey[] = columns
    .filter((c) => c.align === "right" && c.key !== "__check")
    .map((c) => c.key as SortKey);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-emerald-900/30 dark:bg-[#0f1c18]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-emerald-900/20">
        <span className="min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Results
          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
            {total} stocks
            {selectedSymbols.length > 0 && (
              <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                ({selectedSymbols.length} selected)
              </span>
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || total === 0}
          className="shrink-0 whitespace-nowrap rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
        >
          {exporting ? "Exporting…" : "Export"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500 dark:border-emerald-900/20 dark:bg-emerald-950/10 dark:text-gray-400">
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={onSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
                />
              </th>
              {columns.filter((c) => c.key !== "__check").map((col) => {
                const colKey = col.key as SortKey;
                return (
                <th
                  key={col.label}
                  className={`whitespace-nowrap px-3 py-2.5 font-medium ${
                    colKey ? "cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100" : ""
                  } ${colKey && numericKeys.includes(colKey) ? "text-right" : "text-left"}`}
                  onClick={colKey ? () => onSort(colKey) : undefined}
                >
                  {col.label}
                  {col.key && sortBy === col.key && (
                    <span className="ml-0.5 text-emerald-600 dark:text-emerald-400">
                      {sortOrder === "desc" ? "↓" : "↑"}
                    </span>
                  )}
                </th>
              );
            })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-emerald-900/15">
                  <td className="px-3 py-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-100 dark:bg-emerald-950/20" />
                  </td>
                  {columns.filter((c) => c.key !== "__check").map((c) => (
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
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedSymbols.includes(row.symbol)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect(row.symbol);
                      }}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
                    />
                  </td>
                  {columns.filter((c) => c.key !== "__check").map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 ${col.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-emerald-900/20">
        <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          Page
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onBlur={submitJump}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submitJump(); (e.target as HTMLInputElement).blur(); }
              if (e.key === "Escape") { setJumpValue(String(page)); (e.target as HTMLInputElement).blur(); }
            }}
            disabled={totalPages <= 1}
            aria-label="Jump to page"
            className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-xs tabular-nums text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-gray-200"
          />
          / {totalPages}
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
