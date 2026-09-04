import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "./+types/home";
import { exportCsv, getFields, getTemplates, runScreener } from "~/lib/api";
import type { ExportRequest } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { Header } from "~/components/Header";
import { TabsBar } from "~/components/TabsBar";
import { TemplateSelector } from "~/components/TemplateSelector";
import { FilterPanel, describeFilter } from "~/components/FilterPanel";
import { ResultsTable, type SortKey } from "~/components/ResultsTable";
import { StockDrawer } from "~/components/StockDrawer";
import { ExportDialog } from "~/components/ExportDialog";
import { displayFieldLabel } from "~/lib/labels";
import { parseNumericInput } from "~/lib/numbers";
import type {
  CarbonDataMode,
  Dimension,
  FieldMeta,
  FilterCondition,
  FilterState,
  FilterValue,
  ScreenerRow,
  Template,
} from "~/types";

/** Tiny inline KPI tile used in the top context strip. */
function KpiTile({
  icon,
  label,
  value,
  hint,
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  index?: number;
}) {
  return (
    <div
      className="liquid-glass spotlight-card rise-in flex items-center gap-3 px-3.5 py-3 sm:px-4"
      style={{ ["--i" as string]: index }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 ring-1 ring-emerald-200/70 dark:from-emerald-950/60 dark:to-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800/40">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {label}
        </div>
        <div className="mt-0.5 truncate text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {hint && (
          <div className="truncate text-[11px] text-gray-400 dark:text-gray-500">{hint}</div>
        )}
      </div>
    </div>
  );
}

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

interface ApiFiltersResult {
  filters: Record<string, FilterCondition | string>;
  errors: Record<string, string>;
}

/** Build a map from field key to its metadata. */
function buildFieldMeta(dimensions: Dimension[]): Record<string, FieldMeta> {
  const map: Record<string, FieldMeta> = {};
  for (const dim of dimensions) {
    for (const field of dim.fields) {
      map[field.key] = field;
    }
  }
  return map;
}

/** Convert UI filter state into the API request filter dict.
 *
 * Percentage inputs are normalized: "10%" -> 10, "0.1" -> 0.1.  Invalid
 * strings like "abc" are collected as errors instead of being silently
 * dropped.
 */
function toApiFilters(
  filterState: FilterState,
  carbonMode: CarbonDataMode,
  fieldMeta: Record<string, FieldMeta>,
): ApiFiltersResult {
  const result: Record<string, FilterCondition | string> = {};
  const errors: Record<string, string> = {};

  for (const [key, value] of Object.entries(filterState)) {
    if (!value.enabled) continue;
    const meta = fieldMeta[key];
    const unit = meta?.unit;

    if (value.kind === "range") {
      const cond: FilterCondition = {};
      if (value.min !== "" && value.min != null) {
        const parsed = parseNumericInput(value.min, unit);
        if (parsed.error) errors[key] = parsed.error;
        else cond.min = parsed.value ?? undefined;
      }
      if (value.max !== "" && value.max != null) {
        const parsed = parseNumericInput(value.max, unit);
        if (parsed.error) {
          errors[key] = errors[key] ? `${errors[key]}; ${parsed.error}` : parsed.error;
        } else {
          cond.max = parsed.value ?? undefined;
        }
      }
      if (cond.min != null || cond.max != null) result[key] = cond;
    } else {
      const parsed = parseNumericInput(value.value ?? "", unit);
      if (parsed.error) {
        errors[key] = parsed.error;
      } else if (parsed.value != null) {
        // 后端条件仅支持 min/max，将阈值运算符映射为闭区间边界
        if (value.op === ">" || value.op === ">=") result[key] = { min: parsed.value };
        else result[key] = { max: parsed.value };
      }
    }
  }
  result.has_carbon_data = carbonMode;
  return { filters: result, errors };
}

/** Apply a preset template's API-format filters back into UI state. */
function templateToState(
  template: Template,
  dimensions: Dimension[],
): { state: FilterState; carbonMode: CarbonDataMode } {
  return filtersToState(template.filters, dimensions);
}

/** Merge filters from multiple templates (intersection for ranges). */
function mergeTemplateFilters(templates: Template[]): Record<string, FilterCondition | string> {
  const merged: Record<string, FilterCondition | string> = {};
  for (const tpl of templates) {
    for (const [key, raw] of Object.entries(tpl.filters)) {
      if (key === "has_carbon_data") {
        merged[key] = raw;
        continue;
      }
      if (merged[key] == null) {
        merged[key] = raw;
      } else if (
        typeof merged[key] === "object" && merged[key] !== null &&
        typeof raw === "object" && raw !== null
      ) {
        const existing = merged[key] as FilterCondition;
        const incoming = raw as FilterCondition;
        const result: FilterCondition = {};
        if (existing.min != null || incoming.min != null) {
          result.min = existing.min != null && incoming.min != null
            ? Math.max(existing.min, incoming.min)
            : (existing.min ?? incoming.min);
        }
        if (existing.max != null || incoming.max != null) {
          result.max = existing.max != null && incoming.max != null
            ? Math.min(existing.max, incoming.max)
            : (existing.max ?? incoming.max);
        }
        merged[key] = result;
      }
    }
  }
  return merged;
}

/** Convert API-format filters into UI state. */
function filtersToState(
  filters: Record<string, FilterCondition | string>,
  dimensions: Dimension[],
): { state: FilterState; carbonMode: CarbonDataMode } {
  const state = buildInitialFilters(dimensions);
  let carbonMode: CarbonDataMode = "all";

  for (const [key, raw] of Object.entries(filters)) {
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
  const [activeTemplateIds, setActiveTemplateIds] = useState<number[]>([]);

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

  // Selection
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);

  // Export dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Load metadata (fields + templates) with auto-retry on network errors
  const loadMetadata = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      Promise.all([getFields(), getTemplates()])
        .then(([fieldsRes, templatesRes]) => {
          setDimensions(fieldsRes.dimensions);
          setFilterState(buildInitialFilters(fieldsRes.dimensions));
          setTemplates(templatesRes.templates);
          setError(null);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          const isNetwork =
            msg === "Failed to fetch" ||
            msg.includes("NetworkError") ||
            msg.includes("network");
          if (isNetwork && !opts?.silent) {
            // Auto-retry once after 3s without showing error
            setTimeout(() => loadMetadata({ silent: true }), 3000);
          }
          setError(`Failed to load filters: ${msg}`);
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const fieldMeta = useMemo(() => buildFieldMeta(dimensions), [dimensions]);

  const apiFilters = useMemo(
    () => toApiFilters(filterState, carbonMode, fieldMeta),
    [filterState, carbonMode, fieldMeta],
  );

  // Run screener whenever query params change
  const execute = useCallback(
    (opts?: { page?: number }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const targetPage = opts?.page ?? 1;
      if (opts?.page == null) setPage(1);

      const errorKeys = Object.keys(apiFilters.errors);
      if (errorKeys.length > 0) {
        const messages = errorKeys.map(
          (key) => `${displayFieldLabel(fieldMeta[key] ?? { key, label: key })}: ${apiFilters.errors[key]}`,
        );
        setError(`Invalid filter values: ${messages.join("; ")}`);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      runScreener(
        {
          filters: apiFilters.filters,
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
    setActiveTemplateIds([]);
    setSelectedSymbols([]);
  };

  const handleReset = () => {
    setFilterState(buildInitialFilters(dimensions));
    setCarbonMode("true");
    setActiveTemplateIds([]);
    setSelectedSymbols([]);
  };

  const handleTemplateToggle = (template: Template) => {
    setActiveTemplateIds((prev) => {
      const exists = prev.includes(template.id);
      const next = exists ? prev.filter((id) => id !== template.id) : [...prev, template.id];

      setSelectedSymbols([]);
      if (next.length === 0) {
        setFilterState(buildInitialFilters(dimensions));
        setCarbonMode("true");
      } else {
        const selectedTemplates = templates.filter((t) => next.includes(t.id));
        const mergedFilters = mergeTemplateFilters(selectedTemplates);
        const { state, carbonMode: mode } = filtersToState(mergedFilters, dimensions);
        setFilterState(state);
        setCarbonMode(mode);
      }

      return next;
    });
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
    setError(null);
    runScreener(
      {
        filters: apiFilters.filters,
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

  const handleToggleSelect = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  };

  const handleSelectAll = () => {
    const allSelected = rows.every((r) => selectedSymbols.includes(r.symbol));
    if (allSelected) {
      setSelectedSymbols((prev) => prev.filter((s) => !rows.find((r) => r.symbol === s)));
    } else {
      setSelectedSymbols((prev) => {
        const pageSymbols = rows.map((r) => r.symbol);
        return Array.from(new Set([...prev, ...pageSymbols]));
      });
    }
  };

  const handleExport = () => {
    const errorKeys = Object.keys(apiFilters.errors);
    if (errorKeys.length > 0) {
      const messages = errorKeys.map(
        (key) => `${displayFieldLabel(fieldMeta[key] ?? { key, label: key })}: ${apiFilters.errors[key]}`,
      );
      setError(`Invalid filter values: ${messages.join("; ")}`);
      return;
    }
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async (opts: { scope: "all" | "selected"; includeCharts: boolean }) => {
    const symbols = opts.scope === "selected" ? selectedSymbols : undefined;
    setExporting(true);
    try {
      await exportCsv({
        filters: apiFilters.filters,
        sortBy,
        sortOrder,
        symbols,
        includeCharts: opts.includeCharts,
      });
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
    <div className="relative min-h-screen bg-gray-50 dark:bg-[#0a1512]">
      {/* Ambient emerald mesh backdrop, two soft glows at corners. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] overflow-hidden"
      >
        <div className="absolute -left-32 top-[-140px] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-900/30" />
        <div className="absolute -right-40 top-[-100px] h-[380px] w-[380px] rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-900/20" />
      </div>

      <div className="relative z-10">
        <Header userName={user?.name} onLogout={logout} />
        <TabsBar />

        <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
          {/* KPI context strip */}
          <section
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            aria-label="Dataset overview"
          >
            <KpiTile
              index={0}
              label="Universe"
              value={
                <span className="text-gradient-emerald">
                  {dimensions.reduce((acc, d) => acc + d.fields.length, 0)}
                </span>
              }
              hint="filterable fields"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              }
            />
            <KpiTile
              index={1}
              label="Sectors"
              value={
                <span className="text-gradient-emerald">
                  {dimensions[0]?.fields.length
                    ? new Set(rows.map((r) => r.sector).filter(Boolean)).size || "—"
                  : "—"}
                </span>
              }
              hint="in current results"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 2 7l10 5 10-5-10-5Z" />
                  <path d="m2 17 10 5 10-5" />
                  <path d="m2 12 10 5 10-5" />
                </svg>
              }
            />
            <KpiTile
              index={2}
              label="Active Filters"
              value={
                <span className="text-gradient-emerald">{activeChips.length}</span>
              }
              hint={activeChips.length ? "applied to query" : "no filters set"}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              }
            />
            <KpiTile
              index={3}
              label="Results"
              value={
                <span className="text-gradient-emerald">{total.toLocaleString()}</span>
              }
              hint={`${selectedSymbols.length} selected`}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3h18v18H3z" />
                  <path d="m9 9 6 6M9 15l6-6" />
                </svg>
              }
            />
          </section>

          {error && (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
              <span>{error}</span>
              {error.includes("Failed to load filters") && (
                <button
                  type="button"
                  onClick={() => loadMetadata()}
                  className="tactile ml-3 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
                >
                  重试
                </button>
              )}
            </div>
          )}

          {/* Preset templates */}
          <div className="rise-in" style={{ ["--i" as string]: 4 }}>
            <TemplateSelector
              templates={templates}
              activeTemplateIds={activeTemplateIds}
              onToggle={handleTemplateToggle}
            />
          </div>

          {/* Custom filters */}
          <div className="rise-in" style={{ ["--i" as string]: 5 }}>
            <FilterPanel
              dimensions={dimensions}
              filterState={filterState}
              carbonMode={carbonMode}
              errors={apiFilters.errors}
              onFilterChange={handleFilterChange}
              onCarbonModeChange={(mode) => {
                setCarbonMode(mode);
                setActiveTemplateIds([]);
              }}
              onReset={handleReset}
              onRun={() => execute()}
              running={loading}
            />
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div
              className="rise-in flex flex-wrap items-center gap-1.5 px-1"
              style={{ ["--i" as string]: 6 }}
            >
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                Active:
              </span>
              {activeChips.map((chip, i) => (
                <span key={`${chip.key}-${i}`} className="chip-emerald">
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="rise-in" style={{ ["--i" as string]: 7 }}>
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
              selectedSymbols={selectedSymbols}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
            />
          </div>

          <ExportDialog
            open={exportDialogOpen}
            totalCount={total}
            selectedCount={selectedSymbols.length}
            onClose={() => setExportDialogOpen(false)}
            onConfirm={handleExportConfirm}
          />

          <footer className="pb-6 pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
            MVP · For research only, not investment advice
          </footer>
        </main>
      </div>

      {/* Detail drawer */}
      <StockDrawer symbol={drawerSymbol} onClose={() => setDrawerSymbol(null)} />
    </div>
  );
}
