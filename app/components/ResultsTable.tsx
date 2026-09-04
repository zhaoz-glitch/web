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
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${
        down
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800/40"
          : "bg-red-50 text-red-600 ring-1 ring-red-200/70 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-900/40"
      }`}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={down ? "" : "rotate-180"}>
        <path d="m6 9 6 6 6-6" />
      </svg>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/** Compact sortable header label with animated chevron. */
function SortHeader({
  active,
  order,
  align,
  label,
  onClick,
}: {
  active: boolean;
  order: "asc" | "desc";
  align: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group inline-flex items-center gap-1 font-medium transition-colors",
        align === "right" ? "ml-auto flex-row-reverse" : "",
        active
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={[
          "inline-flex h-3 w-3 items-center justify-center transition-all duration-300",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-50",
        ].join(" ")}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={order === "desc" ? "" : "rotate-180"}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </button>
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
    if (!Number.isFinite(n)) {
      setJumpValue(String(page));
      return;
    }
    const clamped = Math.min(Math.max(1, n), totalPages);
    if (clamped !== page) onPageChange(clamped);
    setJumpValue(String(clamped));
  };

  const allSelected = rows.length > 0 && rows.every((r) => selectedSymbols.includes(r.symbol));
  const someSelected = rows.some((r) => selectedSymbols.includes(r.symbol)) && !allSelected;

  // Compute compact page number list with ellipsis
  const pageNumbers = (() => {
    const window = 1;
    const set = new Set<number>([1, totalPages, page]);
    for (let i = Math.max(1, page - window); i <= Math.min(totalPages, page + window); i++) {
      set.add(i);
    }
    return Array.from(set).sort((a, b) => a - b);
  })();

  const columns: {
    key: SortKey | "__check";
    label: string;
    align: "left" | "right";
    render: (row: ScreenerRow) => React.ReactNode;
  }[] = [
    {
      key: "__check",
      label: "",
      align: "left",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedSymbols.includes(row.symbol)}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(row.symbol);
          }}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 dark:border-emerald-900/50 dark:bg-[#0d1714]"
        />
      ),
    },
    {
      key: "symbol",
      label: "Symbol",
      align: "left",
      render: (row) => (
        <>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{row.symbol}</div>
          <div className="max-w-[180px] truncate text-xs text-gray-500 dark:text-gray-400">
            {row.name}
          </div>
        </>
      ),
    },
    {
      key: "sector",
      label: "Sector",
      align: "left",
      render: (row) => (
        <span className="rounded-md bg-emerald-50/70 px-1.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800/30">
          {row.sector}
        </span>
      ),
    },
    { key: "close", label: "Price", align: "right", render: (row) => <span className="tabular-nums">{fmtNum(row.close)}</span> },
    { key: "market_cap_basic", label: "Market Cap (USD)", align: "right", render: (row) => <span className="tabular-nums">{fmtMarketCap(row.market_cap)}</span> },
    { key: "price_earnings_ttm", label: "PE (TTM) (x)", align: "right", render: (row) => <span className="tabular-nums">{fmtNum(row.pe_ttm, 1)}</span> },
    { key: "price_book_value", label: "PB (x)", align: "right", render: (row) => <span className="tabular-nums">{fmtNum(row.pb, 1)}</span> },
    { key: "dividend_yield_recent", label: "Div. Yield (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.dividend_yield)}</span> },
    { key: "turnover", label: "Turnover (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.turnover)}</span> },
    { key: "volume", label: "Volume (shares)", align: "right", render: (row) => <span className="tabular-nums">{fmtVolume(row.volume)}</span> },
    { key: "change_1_year", label: "52W Change (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.week_52_change)}</span> },
    { key: "net_margin", label: "Net Margin (%)", align: "right", render: (row) => <span className="tabular-nums">{fmtPercent(row.net_profit_margin)}</span> },
    {
      key: "carbon_intensity_revenue",
      label: "Carbon Intensity (tCO2e/$M)",
      align: "right",
      render: (row) =>
        row.has_carbon_data ? (
          <span className="tabular-nums text-gray-800 dark:text-gray-200">
            {fmtNum(row.carbon_intensity_revenue, 1)}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
        ),
    },
    { key: "total_emissions", label: "Total Emissions (tCO2e)", align: "right", render: (row) => <span className="tabular-nums text-gray-600 dark:text-gray-300">{fmtEmissions(row.total_emissions)}</span> },
    { key: "carbon_change_yoy", label: "Carbon YoY (%)", align: "right", render: (row) => <YoYBadge value={row.carbon_change_yoy} /> },
  ];

  const numericKeys: SortKey[] = columns
    .filter((c) => c.align === "right" && c.key !== "__check")
    .map((c) => c.key as SortKey);

  // Friendly names for the active sort badge
  const activeSortColumn = columns.find((c) => c.key === sortBy);

  return (
    <section aria-label="Results" className="liquid-glass overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-ink-200/60 px-5 py-3.5 dark:border-emerald-900/30">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Results
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                  {total.toLocaleString()}
                </span>{" "}
                {total === 1 ? "stock" : "stocks"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-gray-500">
              Sorted by{" "}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {activeSortColumn?.label ?? sortBy}
              </span>{" "}
              · {sortOrder === "desc" ? "descending" : "ascending"}
              {selectedSymbols.length > 0 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  · {selectedSymbols.length} selected
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || total === 0}
          className="tactile inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-300/70 bg-emerald-50/60 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/50"
        >
          {exporting ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-9-9" />
              </svg>
              Exporting…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="scrollbar-emerald overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="sticky top-[52px] z-10 bg-white/85 backdrop-blur dark:bg-[#0a1512]/85">
            <tr className="border-b border-ink-200/60 text-[11px] uppercase tracking-wider text-gray-500 dark:border-emerald-900/30 dark:text-gray-400">
              <th className="px-3 pt-3 pb-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 dark:border-emerald-900/50 dark:bg-[#0d1714]"
                />
              </th>
              {columns
                .filter((c) => c.key !== "__check")
                .map((col) => {
                  const colKey = col.key as SortKey;
                  const isActive = sortBy === col.key;
                  const isSortable = numericKeys.includes(colKey) || colKey === "symbol" || colKey === "sector";
                  return (
                    <th
                      key={col.label}
                      className={`px-3 pt-3 pb-3 ${col.align === "right" ? "text-right" : "text-left"}`}
                    >
                      {isSortable ? (
                        <SortHeader
                          label={col.label}
                          align={col.align}
                          active={isActive}
                          order={sortOrder}
                          onClick={() => onSort(colKey)}
                        />
                      ) : (
                        <span>{col.label}</span>
                      )}
                    </th>
                  );
                })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-ink-100/60 dark:border-emerald-900/15">
                  <td className="px-3 py-3">
                    <div className="skeleton h-4 w-4" />
                  </td>
                  {columns
                    .filter((c) => c.key !== "__check")
                    .map((c, j) => (
                      <td key={j} className="px-3 py-3">
                        <div
                          className="skeleton h-3.5"
                          style={{ width: `${50 + ((j * 17) % 35)}%` }}
                        />
                      </td>
                    ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 ring-1 ring-emerald-200/70 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-400 dark:ring-emerald-800/40">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      No matching stocks
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Try widening the ranges or switching carbon data to All.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => {
                const isSelected = selectedSymbols.includes(row.symbol);
                return (
                  <tr
                    key={row.symbol}
                    onClick={() => onRowClick(row.symbol)}
                    style={{ ["--i" as string]: rowIdx }}
                    onMouseMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                      e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                    }}
                    className={[
                      "rise-in spotlight-card tactile cursor-pointer",
                      "border-b border-ink-100/60 transition-colors duration-200",
                      isSelected
                        ? "row-selected"
                        : "hover:bg-emerald-50/40 dark:border-emerald-900/15 dark:hover:bg-emerald-950/20",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleSelect(row.symbol);
                        }}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 dark:border-emerald-900/50 dark:bg-[#0d1714]"
                      />
                    </td>
                    {columns
                      .filter((c) => c.key !== "__check")
                      .map((col) => (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 ${
                            col.align === "right" ? "text-right" : "text-left"
                          }`}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating bulk-action bar */}
      {selectedSymbols.length > 0 && (
        <div className="bulk-bar pointer-events-none sticky bottom-3 z-20 mx-3 mb-3 mt-3 flex justify-end">
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl border border-emerald-200/60 bg-white/95 px-3 py-2 shadow-lg shadow-emerald-900/10 backdrop-blur dark:border-emerald-700/40 dark:bg-[#0a1512]/95">
            <span className="chip-emerald">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {selectedSymbols.length} selected
            </span>
            <button
              type="button"
              onClick={() => {
                // Deselect all: toggle each selected item off
                for (const s of selectedSymbols) onToggleSelect(s);
              }}
              className="tactile text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onExport}
              className="tactile inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:from-emerald-600 hover:to-teal-700"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export selected
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-ink-200/60 px-5 py-3 dark:border-emerald-900/30">
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
              if (e.key === "Enter") {
                e.preventDefault();
                submitJump();
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                setJumpValue(String(page));
                (e.target as HTMLInputElement).blur();
              }
            }}
            disabled={totalPages <= 1}
            aria-label="Jump to page"
            className="w-14 rounded-lg border border-ink-200 bg-white px-2 py-1 text-center text-xs tabular-nums text-gray-700 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-40 dark:border-emerald-900/40 dark:bg-[#0d1714] dark:text-gray-200"
          />
          / <span className="tabular-nums">{totalPages}</span>
        </span>
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="tactile rounded-lg border border-ink-200 p-1.5 text-gray-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-emerald-900/40 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          {pageNumbers.map((p, idx) => {
            const prev = pageNumbers[idx - 1];
            const gap = prev !== undefined && p - prev > 1;
            return (
              <span key={p} className="flex items-center">
                {gap && (
                  <span className="px-1 text-xs text-gray-400 dark:text-gray-500">…</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={[
                    "tactile min-w-7 rounded-lg px-2 py-1 text-xs tabular-nums transition-colors",
                    p === page
                      ? "bg-emerald-500 font-semibold text-white shadow-sm shadow-emerald-600/30"
                      : "text-gray-600 hover:bg-emerald-50/70 hover:text-emerald-700 dark:text-gray-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300",
                  ].join(" ")}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              </span>
            );
          })}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="tactile rounded-lg border border-ink-200 p-1.5 text-gray-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-emerald-900/40 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </nav>
      </div>
    </section>
  );
}