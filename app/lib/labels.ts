/** Compact English labels for API-provided Chinese (or bilingual) copy. */

const FIELD_LABELS: Record<string, string> = {
  market_cap_basic: "Market Cap",
  turnover: "Turnover",
  price_earnings_ttm: "PE (TTM)",
  price_book_value: "PB",
  dividend_yield_recent: "Div. Yield",
  volume: "Volume",
  change_1_year: "52W Change",
  net_margin: "Net Margin",
  carbon_intensity_revenue: "Carbon Intensity",
  total_emissions: "Total Emissions",
  carbon_change_yoy: "Carbon YoY",
  has_carbon_data: "Disclosure",
};

const DIMENSION_META: Record<string, { label: string; frequency: string }> = {
  market: { label: "Market & Technicals", frequency: "Real-time / Daily" },
  carbon: { label: "Green / Carbon", frequency: "Annual" },
};

const FREQUENCY_EN: Record<string, string> = {
  "实时 / 日更": "Real-time / Daily",
  "年度更新": "Annual",
};

const TEMPLATE_EN: Record<string, { name: string; description: string; use_case: string }> = {
  低碳价值陷阱: {
    name: "Low-Carbon Value",
    description: "PE < 15 and carbon intensity down > 5% YoY",
    use_case: "Undervalued transition names",
  },
  绿色高成长: {
    name: "Green Growth",
    description: "Revenue growth > 20% and intensity below peer average",
    use_case: "Green-path growth stocks",
  },
  净零先锋: {
    name: "Net-Zero Leaders",
    description: "Intensity down > 15% YoY and emissions < 5 Mt",
    use_case: "Aggressive decarbonizers",
  },
  高股息绿色标的: {
    name: "Green High Yield",
    description: "Dividend yield > 3% and intensity < 200 tCO2e/$M",
    use_case: "Income-oriented green exposure",
  },
};

/** Prefer a known English label; otherwise take the "(English)" suffix. */
export function displayFieldLabel(field: { key: string; label: string }): string {
  if (FIELD_LABELS[field.key]) return FIELD_LABELS[field.key];
  const m = field.label.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : field.label;
}

export function displayDimension(dim: {
  key: string;
  label: string;
  update_frequency: string;
}): { label: string; frequency: string } {
  const known = DIMENSION_META[dim.key];
  if (known) return known;
  return {
    label: dim.label,
    frequency: FREQUENCY_EN[dim.update_frequency] ?? dim.update_frequency,
  };
}

export function displayTemplate(tpl: {
  name: string;
  description: string;
  use_case: string;
}): { name: string; description: string; use_case: string } {
  return TEMPLATE_EN[tpl.name] ?? tpl;
}
