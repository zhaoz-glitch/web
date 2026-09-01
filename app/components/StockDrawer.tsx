import { useEffect, useState } from "react";
import { getStockDetail } from "~/lib/api";
import { CarbonTrendChart } from "./CarbonTrendChart";
import type { StockDetail } from "~/types";

interface Props {
  symbol: string | null;
  onClose: () => void;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</div>}
    </div>
  );
}

export function StockDrawer({ symbol, onClose }: Props) {
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setDetail(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getStockDetail(symbol, controller.signal)
      .then((d) => setDetail(d))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [symbol]);

  if (!symbol) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-gray-50 shadow-2xl dark:bg-gray-950">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{symbol}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {detail?.company.name ?? "加载中…"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="关闭"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading && (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">加载详情中…</div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              加载失败：{error}
            </div>
          )}
          {detail && (
            <>
              {/* Company info */}
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {detail.company.sector}
                </span>
                {detail.company.country && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{detail.company.country}</span>
                )}
              </div>

              {/* Financial metrics */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">财务概览</h3>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard
                    label="市值"
                    value={
                      detail.financials?.market_cap != null
                        ? `$${(detail.financials.market_cap / 1e9).toFixed(0)}B`
                        : "—"
                    }
                  />
                  <StatCard
                    label="PE (TTM)"
                    value={detail.financials?.pe_ttm?.toFixed(1) ?? "—"}
                  />
                  <StatCard
                    label="PB"
                    value={detail.financials?.pb?.toFixed(1) ?? "—"}
                  />
                  <StatCard
                    label="股息率"
                    value={
                      detail.financials?.dividend_yield != null
                        ? `${detail.financials.dividend_yield.toFixed(2)}%`
                        : "—"
                    }
                  />
                  <StatCard
                    label="净利润率"
                    value={
                      detail.financials?.net_profit_margin != null
                        ? `${detail.financials.net_profit_margin.toFixed(1)}%`
                        : "—"
                    }
                  />
                  <StatCard
                    label="营收增长"
                    value={
                      detail.financials?.revenue_growth != null
                        ? `${detail.financials.revenue_growth.toFixed(1)}%`
                        : "—"
                    }
                  />
                </div>
              </div>

              {/* Carbon data */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  碳排放数据
                  {detail.carbon && (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-normal text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {detail.carbon.report_year} 年报
                    </span>
                  )}
                </h3>
                {detail.carbon ? (
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard
                      label="碳强度"
                      value={`${detail.carbon.carbon_intensity_revenue?.toFixed(1) ?? "—"}`}
                      sub="tCO2e / $M 营收"
                    />
                    <StatCard
                      label="总排放量"
                      value={
                        detail.carbon.total_emissions != null
                          ? `${(detail.carbon.total_emissions / 1e4).toFixed(0)}万`
                          : "—"
                      }
                      sub="tCO2e (Scope 1+2)"
                    />
                    <StatCard
                      label="碳排同比"
                      value={
                        detail.carbon.carbon_change_yoy != null
                          ? `${detail.carbon.carbon_change_yoy > 0 ? "+" : ""}${detail.carbon.carbon_change_yoy.toFixed(1)}%`
                          : "—"
                      }
                      sub={detail.carbon.data_source ?? "Bavest"}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
                    该公司暂无碳排放披露数据
                  </div>
                )}
              </div>

              {/* 5-year trend */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  碳排放趋势（近 5 年）
                </h3>
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                  <CarbonTrendChart data={detail.carbon_history} />
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
