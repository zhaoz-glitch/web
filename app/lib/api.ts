/**
 * API client for the Low-Carbon Value Screener backend.
 *
 * All requests use relative paths (/api/...) which the Vite dev server
 * proxies to http://localhost:5000 — see vite.config.ts `server.proxy`.
 */

import type {
  FieldsResponse,
  ScreenerRequest,
  ScreenerResponse,
  StockDetail,
  TemplatesResponse,
  CarbonTrendPoint,
} from "~/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function getFields(): Promise<FieldsResponse> {
  return request<FieldsResponse>("/api/screener/fields");
}

export function getTemplates(): Promise<TemplatesResponse> {
  return request<TemplatesResponse>("/api/screener/templates");
}

export function runScreener(
  body: ScreenerRequest,
  signal?: AbortSignal,
): Promise<ScreenerResponse> {
  return request<ScreenerResponse>("/api/screener/run", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export function getStockDetail(
  symbol: string,
  signal?: AbortSignal,
): Promise<StockDetail> {
  return request<StockDetail>(`/api/stock/${encodeURIComponent(symbol)}`, {
    signal,
  });
}

export function getCarbonTrend(
  symbol: string,
): Promise<{ symbol: string; name: string; trend: CarbonTrendPoint[] }> {
  return request(`/api/stock/${encodeURIComponent(symbol)}/carbon-trend`);
}

/** POST /api/screener/export and trigger a CSV file download. */
export async function exportCsv(body: ScreenerRequest): Promise<void> {
  const res = await fetch("/api/screener/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`导出失败 (HTTP ${res.status})`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "low_carbon_screener_export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
