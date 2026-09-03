/**
 * API client for the Low-Carbon Value Screener backend.
 *
 * Local dev: requests use relative paths (/api/...) which the Vite dev
 * server proxies to http://localhost:5000 — see vite.config.ts `server.proxy`.
 *
 * Static hosting (e.g. GitHub Pages): set `VITE_API_BASE` at build time to
 * the public URL of the deployed Flask backend; all requests are then
 * prefixed with it (CORS must be enabled on the backend).
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

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

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
  const url = `${API_BASE}${path}`;
  const options = withAuth(init);
  const isGet = !options.method || options.method === "GET";
  const maxRetries = isGet ? 3 : 0;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
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
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const isNetworkError =
        lastError.message === "Failed to fetch" ||
        lastError.message.includes("NetworkError") ||
        lastError.message.includes("network");
      if (attempt < maxRetries && isNetworkError) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error("Request failed");
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

/** Encode a stock symbol for URL paths.
 *
 * Some symbols contain a slash (e.g. "BML/PJ"). A single `encodeURIComponent`
 * produces `%2F`, but upstream proxies decode `%2F` back into a real `/`, which
 * then looks like a path separator to Flask and causes a 404. Double-encoding
 * keeps the slash encoded all the way into the Flask route, where the backend
 * decodes it once with `urllib.parse.unquote`.
 */
function encodeSymbol(symbol: string): string {
  return encodeURIComponent(encodeURIComponent(symbol));
}

export function getStockDetail(
  symbol: string,
  signal?: AbortSignal,
): Promise<StockDetail> {
  return request<StockDetail>(`/api/stock/${encodeSymbol(symbol)}`, {
    signal,
  });
}

export function getCarbonTrend(
  symbol: string,
): Promise<{ symbol: string; name: string; trend: CarbonTrendPoint[] }> {
  return request(`/api/stock/${encodeSymbol(symbol)}/carbon-trend`);
}

/** POST /api/screener/export and trigger a CSV file download. */
export async function exportCsv(body: ScreenerRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/api/screener/export`, withAuth({
    method: "POST",
    body: JSON.stringify(body),
  }));
  if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`);

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
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "Sign-in failed");
  }
  return body as LoginResponse;
}

/** POST /api/auth/register — creates a new account, returns token + user. */
export async function registerApi(
  email: string,
  password: string,
  name: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "Sign-up failed");
  }
  return body as LoginResponse;
}

export interface ForgotPasswordResponse {
  message: string;
  dev_code?: string;
}

/** POST /api/auth/forgot-password — send a 6-digit code to the given email. */
export function forgotPasswordApi(
  email: string,
): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** POST /api/auth/verify-reset-code */
export function verifyResetCodeApi(
  email: string,
  code: string,
): Promise<{ message: string }> {
  return request("/api/auth/verify-reset-code", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

/** POST /api/auth/reset-password */
export function resetPasswordApi(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  return request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });
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

export interface SyncJobResult {
  id?: number;
  job_name: string;
  status: string;
  source?: string | null;
  rows_upserted?: number;
  message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export function getJobStatus(): Promise<{
  market: SyncJobResult | null;
  carbon: SyncJobResult | null;
}> {
  return request("/api/jobs/status");
}

export function syncMarket(): Promise<SyncJobResult> {
  return request("/api/jobs/sync-market", { method: "POST", body: "{}" });
}

export function syncCarbon(): Promise<SyncJobResult> {
  return request("/api/jobs/sync-carbon", { method: "POST", body: "{}" });
}
