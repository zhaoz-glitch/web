/**
 * API client for the Low-Carbon Value Screener backend.
 *
 * All requests use relative paths (/api/...) which the Vite dev server
 * proxies to http://localhost:5000 — see vite.config.ts `server.proxy`.
 *
 * Every request automatically includes the ``Authorization`` header with
 * the stored token (if any), so protected endpoints just work.
 */

import { getAuthToken } from "~/lib/auth";
import type {
  FieldsResponse,
  ScreenerRequest,
  ScreenerResponse,
  StockDetail,
  TemplatesResponse,
  CarbonTrendPoint,
} from "~/types";

/** Merge the auth header into a fetch init object. */
function withAuth(init?: RequestInit): RequestInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = token;
  }
  return { ...init, headers };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, withAuth(init));
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (body?.error) message = body.error;
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
  const res = await fetch("/api/screener/export", withAuth({
    method: "POST",
    body: JSON.stringify(body),
  }));
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

// ----------------------------------------------------------------------- //
//  Auth API
// ----------------------------------------------------------------------- //

export interface LoginResponse {
  token: string;
  user: { id: number; email: string; name: string; created_at: string | null };
}

/** POST /api/auth/login — returns token + user, or throws with server message. */
export async function loginApi(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "登录失败");
  }
  return body as LoginResponse;
}

/** POST /api/auth/register — creates a new account, returns token + user. */
export async function registerApi(
  email: string,
  password: string,
  name: string,
): Promise<LoginResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "注册失败");
  }
  return body as LoginResponse;
}

// ----------------------------------------------------------------------- //
//  DB Workbench API
// ----------------------------------------------------------------------- //

export interface DbColumnMeta {
  cid: number;
  name: string;
  type: string;
  notnull: boolean;
  default: string | null;
  pk: boolean;
}

export interface DbTableMeta {
  name: string;
  row_count: number;
  columns: DbColumnMeta[];
}

/** GET /api/db/tables — all tables with column metadata & row counts. */
export function getDbTables(): Promise<{ tables: DbTableMeta[] }> {
  return request<{ tables: DbTableMeta[] }>("/api/db/tables");
}

export interface DbTableData {
  table: string;
  columns: string[];
  total: number;
  limit: number;
  offset: number;
  rows: Record<string, string | null>[];
}

/** GET /api/db/tables/<name> — paginated rows of a single table. */
export function getDbTableData(
  tableName: string,
  limit = 50,
  offset = 0,
): Promise<DbTableData> {
  return request<DbTableData>(
    `/api/db/tables/${encodeURIComponent(tableName)}?limit=${limit}&offset=${offset}`,
  );
}
