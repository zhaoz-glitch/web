import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { exportCsv, getFields, getJobStatus, getTemplates, runScreener, syncMarket } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { TemplateSelector } from "~/components/TemplateSelector";
import { FilterPanel, describeFilter } from "~/components/FilterPanel";
import { ResultsTable, type SortKey } from "~/components/ResultsTable";
import { StockDrawer } from "~/components/StockDrawer";
import { displayFieldLabel } from "~/lib/labels";
import type {
  CarbonDataMode,
  Dimension,
  FilterCondition,
  FilterState,
  FilterValue,
  ScreenerRow,
  Template,
} from "~/types";

/** Build initial filter state from fields metadata. */
function buildInitialFilters(dimensions: Dimension[]): FilterState {
  const state: FilterState = {};
  for (const dim of dimensions) {
    for (const field of dim.fields) {
      if (field.type === "range") {
        state[field.key] = { enabled: false, kind: "range", min: "", max: "" };
      } else {
        state[field.key] = { enabled: false, kind: "threshold", op: "<", value: "" };
      }
    }
  }
  return state;
}

/** Convert UI filter state into the API request filter dict. */
function toApiFilters(
  filterState: FilterState,
  carbonMode: CarbonDataMode,
): Record<string, FilterCondition | string> {
  const result: Record<string, FilterCondition | string> = {};
  for (const [key, value] of Object.entries(filterState)) {
    if (!value.enabled) continue;
    if (value.kind === "range") {
      const cond: FilterCondition = {};
      if (value.min !== "" && value.min != null) cond.min = Number(value.min);
      if (value.max !== "" && value.max != null) cond.max = Number(value.max);
      if (cond.min != null || cond.max != null) result[key] = cond;
    } else {
      const num = Number(value.value);
      if (value.value !== "" && value.value != null && !Number.isNaN(num)) {
        // 后端条件仅支持 min/max，将阈值运算符映射为闭区间边界
        if (value.op === ">" || value.op === ">=") result[key] = { min: num };
        else result[key] = { max: num };
      }
    }
  }
  result.has_carbon_data = carbonMode;
  return result;
}

/** Apply a preset template's API-format filters back into UI state. */
function templateToState(
  template: Template,
  dimensions: Dimension[],
): { state: FilterState; carbonMode: CarbonDataMode } {
  const state = buildInitialFilters(dimensions);
  let carbonMode: CarbonDataMode = "all";

  for (const [key, raw] of Object.entries(template.filters)) {
    if (key === "has_carbon_data") {
      carbonMode = raw === "true" || raw === "false" ? raw : "all";
      continue;
    }
    const value = state[key];
    if (!value) continue;
    if (typeof raw !== "object" || raw === null) continue;

    if (value.kind === "range") {
      state[key] = {
        ...value,
        enabled: true,
        min: raw.min != null ? String(raw.min) : "",
        max: raw.max != null ? String(raw.max) : "",
      };
    } else {
      // 阈值字段：根据 min/max 反推运算符
      if (raw.min != null) {
        state[key] = { enabled: true, kind: "threshold", op: ">", value: String(raw.min) };
      } else if (raw.max != null) {
        state[key] = { enabled: true, kind: "threshold", op: "<", value: String(raw.max) };
      }
    }
  }
  return { state, carbonMode };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Low-Carbon Value Screener" },
    {
      name: "description",
      content: "Screen US equities with live market data and annual carbon emissions.",
    },
  ];
}

const PAGE_SIZE = 20;

export default function Home() {
  const { user, logout } = useAuth();

  // Metadata
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({});
  const [carbonMode, setCarbonMode] = useState<CarbonDataMode>("true");

  // Results
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("market_cap_basic");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drawer
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getJobStatus()
      .then((status) => {
        const finished = status.market?.finished_at;
        if (finished) setAsOf(finished.slice(0, 10));
      })
      .catch(() => {
        /* status is optional */
      });
  }, []);

  // Load metadata on mount
  useEffect(() => {
    Promise.all([getFields(), getTemplates()])
      .then(([fieldsRes, templatesRes]) => {
        setDimensions(fieldsRes.dimensions);
        setFilterState(buildInitialFilters(fieldsRes.dimensions));
        setTemplates(templatesRes.templates);
      })
      .catch((e) => setError(`Failed to load filters: ${e.message}`));
  }, []);

  const apiFilters = useMemo(
    () => toApiFilters(filterState, carbonMode),
    [filterState, carbonMode],
  );

  // Run screener whenever query params change
  const execute = useCallback(
    (opts?: { page?: number }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const targetPage = opts?.page ?? 1;
      if (opts?.page == null) setPage(1);

      setLoading(true);
      setError(null);
      runScreener(
        {
          filters: apiFilters,
          page: targetPage,
          pageSize: PAGE_SIZE,
          sortBy,
          sortOrder,
        },
        controller.signal,
      )
        .then((res) => {
          setRows(res.data);
          setTotal(res.total);
          setAsOf(res.data.find((row) => row.market_date)?.market_date ?? null);
          setLoading(false);
        })
        .catch((e) => {
          if (e.name === "AbortError") return;
          setError(e.message);
          setLoading(false);
        });
    },
    [apiFilters, sortBy, sortOrder],
  );

  // Auto-run once metadata loads
  const didInitialRun = useRef(false);
  useEffect(() => {
    if (!didInitialRun.current && Object.keys(filterState).length > 0) {
      didInitialRun.current = true;
      execute({ page: 1 });
    }
  }, [filterState, execute]);

  const handleFilterChange = (key: string, value: FilterValue) => {
    setFilterState((prev) => ({ ...prev, [key]: value }));
    setActiveTemplateId(null);
  };

  const handleReset = () => {
    setFilterState(buildInitialFilters(dimensions));
    setCarbonMode("true");
    setActiveTemplateId(null);
  };

  const handleTemplateSelect = (template: Template) => {
    const { state, carbonMode: mode } = templateToState(template, dimensions);
    setFilterState(state);
    setCarbonMode(mode);
    setActiveTemplateId(template.id);
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  // Re-fetch when sort changes
  useEffect(() => {
    if (didInitialRun.current) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  const handlePageChange = (p: number) => {
    setPage(p);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    runScreener(
      {
        filters: apiFilters,
        page: p,
        pageSize: PAGE_SIZE,
        sortBy,
        sortOrder,
      },
      controller.signal,
    )
      .then((res) => {
        setRows(res.data);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoading(false);
      });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCsv({ filters: apiFilters, sortBy, sortOrder });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    for (const [key, value] of Object.entries(filterState)) {
      if (!value.enabled) continue;
      if (value.kind === "range" && !value.min && !value.max) continue;
      if (value.kind === "threshold" && !value.value) continue;
      const field = dimensions.flatMap((d) => d.fields).find((f) => f.key === key);
      const name = field ? displayFieldLabel(field) : key;
      chips.push({ key, label: `${name} ${describeFilter(key, value)}` });
    }
    if (carbonMode === "true") chips.push({ key: "carbon", label: "With carbon data" });
    if (carbonMode === "false") chips.push({ key: "carbon", label: "Without carbon data" });
    return chips;
  }, [filterState, carbonMode, dimensions]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 dark:bg-emerald-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Low-Carbon Screener</h1>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  US equities × carbon emissions
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="hidden text-right text-[11px] leading-snug text-gray-400 lg:block dark:text-gray-500">
                <div>Market: TradingView (price / vol / TTM)</div>
                <div>Carbon: Clarity AI SFDR{asOf ? ` · ${asOf}` : ""}</div>
              </div>
              <button
                type="button"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const result = await syncMarket();
                    if (result.status === "success") {
                      execute({ page });
                    } else {
                      setError(result.message || "Market sync incomplete (using stored snapshot)");
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Market sync failed");
                  } finally {
                    setSyncing(false);
                  }
                }}
                className="shrink-0 whitespace-nowrap rounded-md border border-emerald-600 px-2.5 py-1 text-xs text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950"
              >
                {syncing ? "Syncing…" : "Sync"}
              </button>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3 dark:border-gray-700 sm:pl-4">
                <Link
                  to="/db"
                  className="shrink-0 whitespace-nowrap rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Tables
                </Link>
                <span className="max-w-[8rem] truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {user?.name}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="shrink-0 whitespace-nowrap rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Preset templates */}
        <TemplateSelector
          templates={templates}
          activeTemplateId={activeTemplateId}
          onSelect={handleTemplateSelect}
        />

        {/* Custom filters */}
        <FilterPanel
          dimensions={dimensions}
          filterState={filterState}
          carbonMode={carbonMode}
          onFilterChange={handleFilterChange}
          onCarbonModeChange={(mode) => {
            setCarbonMode(mode);
            setActiveTemplateId(null);
          }}
          onReset={handleReset}
          onRun={() => execute()}
          running={loading}
        />

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">Filters:</span>
            {activeChips.map((chip, i) => (
              <span
                key={`${chip.key}-${i}`}
                className="rounded-full bg-white px-2.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200 dark:bg-gray-900 dark:text-emerald-400 dark:ring-emerald-900"
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        <ResultsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          sortBy={sortBy}
          sortOrder={sortOrder}
          loading={loading}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onRowClick={setDrawerSymbol}
          onExport={handleExport}
          exporting={exporting}
        />

        <footer className="pb-6 pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          MVP · For research only, not investment advice
        </footer>
      </main>

      {/* Detail drawer */}
      <StockDrawer symbol={drawerSymbol} onClose={() => setDrawerSymbol(null)} />
    </div>
  );
}
