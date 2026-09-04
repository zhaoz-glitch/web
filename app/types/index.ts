/** Backend API types for the Low-Carbon Value Screener. */

/** Filter field metadata from GET /api/screener/fields */
export interface FieldMeta {
  key: string;
  label: string;
  type: "range" | "threshold";
  unit?: string;
  source?: string;
  update_frequency?: string;
  /** range fields */
  min?: number;
  max?: number;
  step?: number;
  /** threshold fields */
  ops?: string[];
}

export interface Dimension {
  key: "market" | "carbon";
  label: string;
  update_frequency: string;
  fields: FieldMeta[];
}

export interface FieldsResponse {
  dimensions: Dimension[];
}

/** Preset template from GET /api/screener/templates */
export interface Template {
  id: number;
  name: string;
  description: string;
  use_case: string;
  is_active: boolean;
  filters: Record<string, FilterCondition | string>;
}

export interface TemplatesResponse {
  templates: Template[];
}

/** A filter condition, e.g. { min: 0, max: 25 } */
export type FilterCondition = { min?: number; max?: number };
export type FilterValue =
  | { enabled: boolean; kind: "range"; min?: string; max?: string }
  | { enabled: boolean; kind: "threshold"; op: string; value?: string };
export type FilterState = Record<string, FilterValue>;

/** has_carbon_data: "true" | "false" | "all" */
export type CarbonDataMode = "true" | "false" | "all";

export interface ScreenerRequest {
  filters: Record<string, FilterCondition | string>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ScreenerRow {
  symbol: string;
  name: string;
  sector: string;
  market_date: string | null;
  close: number | null;
  pe_ttm: number | null;
  turnover: number | null;
  market_cap: number | null;
  pb: number | null;
  dividend_yield: number | null;
  volume: number | null;
  week_52_change: number | null;
  net_profit_margin: number | null;
  revenue_growth: number | null;
  carbon_intensity_revenue: number | null;
  total_emissions: number | null;
  carbon_change_yoy: number | null;
  carbon_report_year: number | null;
  scope1: number | null;
  scope2: number | null;
  has_carbon_data: boolean;
}

export interface ScreenerResponse {
  total: number;
  page: number;
  pageSize: number;
  data: ScreenerRow[];
}

/** Stock detail from GET /api/stock/{symbol} */
export interface Company {
  symbol: string;
  name: string;
  sector: string;
  country: string | null;
  description: string | null;
}

export interface Financials {
  symbol: string;
  date: string;
  close: number | null;
  volume: number | null;
  market_cap: number | null;
  pe_ttm: number | null;
  pb: number | null;
  dividend_yield: number | null;
  turnover: number | null;
  week_52_change: number | null;
  net_profit_margin: number | null;
  revenue_growth: number | null;
  data_source?: string;
}

export interface CarbonData {
  symbol: string;
  report_year: number;
  carbon_intensity_revenue: number | null;
  total_emissions: number | null;
  carbon_change_yoy: number | null;
  scope1: number | null;
  scope2: number | null;
  data_source?: string;
}

export interface CarbonTrendPoint {
  report_year: number;
  carbon_intensity_revenue: number | null;
  total_emissions: number | null;
  carbon_change_yoy: number | null;
  /** Cross-sectional baselines for the same report year (simple average,
   *  companies with NULL intensity excluded). Null = no peers that year. */
  us_avg_intensity?: number | null;
  us_peer_count?: number | null;
  sector_avg_intensity?: number | null;
  sector_peer_count?: number | null;
}

export interface StockDetail {
  company: Company;
  financials: Financials | null;
  carbon: CarbonData | null;
  carbon_history: CarbonTrendPoint[];
}
