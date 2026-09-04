import { displayDimension, displayFieldLabel } from "~/lib/labels";
import type { Dimension, FilterState, FilterValue, CarbonDataMode } from "~/types";

interface Props {
  dimensions: Dimension[];
  filterState: FilterState;
  carbonMode: CarbonDataMode;
  errors?: Record<string, string>;
  onFilterChange: (key: string, value: FilterValue) => void;
  onCarbonModeChange: (mode: CarbonDataMode) => void;
  onReset: () => void;
  onRun: () => void;
  running: boolean;
}

function isRange(v: FilterValue): v is Extract<FilterValue, { kind: "range" }> {
  return v.kind === "range";
}

/** Human-readable label for a filter chip. */
export function describeFilter(key: string, value: FilterValue): string {
  if (isRange(value)) {
    const parts: string[] = [];
    if (value.min) parts.push(`≥ ${value.min}`);
    if (value.max) parts.push(`≤ ${value.max}`);
    return parts.join(" · ");
  }
  const opLabel: Record<string, string> = {
    ">": ">",
    "<": "<",
    ">=": "≥",
    "<=": "≤",
  };
  return `${opLabel[value.op] ?? value.op} ${value.value ?? ""}`;
}

const inputBaseClass =
  "block h-9 w-full rounded-lg border bg-white px-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-[#0d1714] dark:text-gray-100 dark:placeholder:text-gray-500";

const inputNormalClass =
  "border-ink-200/80 hover:border-emerald-300 focus:border-emerald-500 dark:border-emerald-900/40 dark:hover:border-emerald-700 dark:focus:border-emerald-400";

const inputErrorClass =
  "border-red-400 focus:border-red-500 dark:border-red-900/60 dark:focus:border-red-400";

function DimensionIcon({ k }: { k: string }) {
  if (k === "carbon") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 4 6-6" />
    </svg>
  );
}

export function FilterPanel({
  dimensions,
  filterState,
  carbonMode,
  errors = {},
  onFilterChange,
  onCarbonModeChange,
  onReset,
  onRun,
  running,
}: Props) {
  const errorCount = Object.keys(errors).length;

  return (
    <section aria-label="Custom filters" className="liquid-glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-200/60 px-5 py-3.5 dark:border-emerald-900/30">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Custom Filters
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Tick the boxes you want to constrain, then hit Run.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {errorCount > 0 && (
            <span className="chip-emerald !bg-red-50 !text-red-700 !border-red-200 dark:!bg-red-950/40 dark:!text-red-300 dark:!border-red-900/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorCount} invalid
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="tactile whitespace-nowrap rounded-lg border border-ink-200/80 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 dark:border-emerald-900/40 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="tactile inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-9-9" />
                </svg>
                Screening…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Screen
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {dimensions.map((dim, dimIdx) => {
          const meta = displayDimension(dim);
          const accent =
            dim.key === "carbon"
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-800/40"
              : "bg-sky-500/10 text-sky-700 ring-sky-200/60 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-800/40";
          const activeCount = dim.fields.filter((f) => {
            const v = filterState[f.key];
            if (!v?.enabled) return false;
            if (v.kind === "range") return !!(v.min || v.max);
            return !!v.value;
          }).length;

          return (
            <div key={dim.key}>
              {/* Dimension header */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md ring-1 ${accent}`}>
                    <DimensionIcon k={dim.key} />
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {meta.frequency}
                  </span>
                </div>
                {activeCount > 0 && (
                  <span className="chip-emerald text-[10px]">
                    {activeCount} active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {dim.fields.map((field, fieldIdx) => {
                  if (field.key === "has_carbon_data") return null;
                  const value = filterState[field.key];
                  if (!value) return null;
                  const checked = value.enabled;
                  const fieldError = errors[field.key];

                  const baseBorder = fieldError
                    ? "border-red-300 dark:border-red-900/60"
                    : checked
                      ? "border-emerald-300/80 dark:border-emerald-500/60"
                      : "border-ink-200/80 dark:border-emerald-900/25";

                  const baseBg = checked
                    ? fieldError
                      ? "bg-red-50/40 dark:bg-red-950/20"
                      : "bg-emerald-50/40 dark:bg-emerald-950/15"
                    : "bg-white/60 dark:bg-[#0d1714]/60";

                  return (
                    <div
                      key={field.key}
                      style={{ ["--i" as string]: dimIdx * 4 + fieldIdx }}
                      onMouseMove={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                      }}
                      className={[
                        "rise-in liquid-glass-bento spotlight-card",
                        "rounded-xl p-2.5",
                        "transition-colors",
                        baseBorder,
                        baseBg,
                      ].join(" ")}
                    >
                      <label className="flex items-center gap-2 text-xs">
                        <span className="relative inline-flex">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              onFilterChange(field.key, {
                                ...value,
                                enabled: e.target.checked,
                              })
                            }
                            className="peer h-3.5 w-3.5 cursor-pointer appearance-none border border-ink-200 bg-white accent-emerald-600 transition checked:border-emerald-500 checked:bg-emerald-500 dark:border-emerald-900/40 dark:bg-[#0d1714] dark:checked:border-emerald-400 dark:checked:bg-emerald-400"
                          />
                          <svg
                            aria-hidden
                            className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 dark:text-emerald-950"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-200">
                          {displayFieldLabel(field)}
                        </span>
                        {field.unit && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            ({field.unit})
                          </span>
                        )}
                      </label>

                      {checked && (
                        isRange(value) ? (
                          <div className="mt-2 grid grid-cols-[1fr_16px_1fr] items-center gap-1.5">
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder={
                                field.unit === "%"
                                  ? "Min · 0.1 = 10%"
                                  : field.unit
                                    ? `Min (${field.unit})`
                                    : "Min"
                              }
                              value={value.min ?? ""}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  min: e.target.value,
                                })
                              }
                              className={`${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`}
                            />
                            <span className="block text-center text-[10px] text-gray-400 dark:text-gray-500">
                              ~
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder={
                                field.unit === "%"
                                  ? "Max · 0.1 = 10%"
                                  : field.unit
                                    ? `Max (${field.unit})`
                                    : "Max"
                              }
                              value={value.max ?? ""}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  max: e.target.value,
                                })
                              }
                              className={`${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`}
                            />
                            {fieldError && (
                              <div className="col-span-3 flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {fieldError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 grid grid-cols-[3.75rem_1fr] items-center gap-1.5">
                            <select
                              value={value.op}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  op: e.target.value,
                                })
                              }
                              className={`${inputBaseClass} ${inputNormalClass} font-medium`}
                              aria-label="Operator"
                            >
                              {(field.ops ?? [">", "<", ">=", "<="]).map((op) => (
                                <option key={op} value={op}>
                                  {op === ">" ? ">" : op === "<" ? "<" : op === ">=" ? "≥" : "≤"}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder={
                                field.unit === "%"
                                  ? "Value · 0.1 = 10%"
                                  : field.unit
                                    ? `Value (${field.unit})`
                                    : "Value"
                              }
                              value={value.value ?? ""}
                              onChange={(e) =>
                                onFilterChange(field.key, {
                                  ...value,
                                  value: e.target.value,
                                })
                              }
                              className={`${inputBaseClass} ${fieldError ? inputErrorClass : inputNormalClass}`}
                            />
                            {fieldError && (
                              <div className="col-span-2 flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {fieldError}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Carbon data availability filter */}
        <div className="rounded-xl border border-ink-200/70 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-3 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-teal-950/10">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-300/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-700/40">
              <DimensionIcon k="carbon" />
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Carbon Disclosure
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              choose what to include
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {(
              [
                ["true", "With data", "Companies that disclose emissions"],
                ["false", "No data", "Companies without carbon data"],
                ["all", "All", "Include every stock regardless"],
              ] as const
            ).map(([mode, label, tip]) => (
              <label
                key={mode}
                className={[
                  "tactile group cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  carbonMode === mode
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-600/30"
                    : "border-ink-200/80 bg-white/70 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-[#0d1714]/70 dark:text-gray-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30",
                ].join(" ")}
                title={tip}
              >
                <input
                  type="radio"
                  name="carbon-mode"
                  checked={carbonMode === mode}
                  onChange={() => onCarbonModeChange(mode)}
                  className="sr-only"
                />
                <span className="inline-flex items-center gap-1.5">
                  {carbonMode === mode && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  )}
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}