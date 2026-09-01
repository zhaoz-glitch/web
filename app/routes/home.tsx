import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { exportCsv, getFields, getTemplates, runScreener } from "~/lib/api";
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

  const abortRef = useRef<AbortController | null>(null);

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
      <header className="relative overflow-hidden border-b border-emerald-700/30 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:border-emerald-900/50 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-950">
        {/* Decorative leaf silhouettes */}
        <svg
          className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rotate-12 opacity-[0.12] dark:opacity-[0.08]"
          viewBox="0 0 24 24"
          fill="white"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        </svg>
        <svg
          className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 -rotate-45 opacity-[0.07] dark:opacity-[0.05]"
          viewBox="0 0 24 24"
          fill="white"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        </svg>
        {/* Soft glow */}
        <div className="pointer-events-none absolute -left-24 top-0 h-48 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 shadow-lg shadow-emerald-900/20 ring-1 ring-white/25 backdrop-blur-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Low-Carbon Screener
                </h1>
                <p className="text-xs font-medium text-emerald-50/80 dark:text-emerald-100/70">
                  US equities × carbon emissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden flex-col items-end gap-1.5 sm:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" />
                  Market · TradingView live
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-200" />
                  Carbon · Bavest annual
                </span>
              </div>
              <div className="flex items-center gap-2 border-l border-white/20 pl-4">
                <Link
                  to="/db"
                  className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/25 transition hover:bg-white/20 dark:hover:bg-white/15"
                >
                  Tables
                </Link>
                <span className="text-xs font-medium text-white/90">
                  {user?.name}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/25 transition hover:bg-white/20 dark:hover:bg-white/15"
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
