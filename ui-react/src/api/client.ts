// VITE_API_URL can be absolute (https://...) or path-only (/api).
// Path-only values are resolved against the current page origin at runtime.
const _RAW_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
const API_BASE = /^https?:\/\//.test(_RAW_API_BASE)
  ? _RAW_API_BASE
  : (typeof window !== 'undefined' ? window.location.origin : '') + _RAW_API_BASE

// Returns Authorization header only when Cognito is configured at build time.
// Uses dynamic import so aws-amplify is excluded from the bundle otherwise.
async function getAuthHeader(): Promise<Record<string, string>> {
  if (!import.meta.env.VITE_COGNITO_USER_POOL_ID) return {}
  try {
    const mod = await import(/* @vite-ignore */ 'aws-amplify/auth')
    const session = await mod.fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export interface PLRow {
  entity_id: string; fiscal_year: number; fiscal_quarter: number;
  period_yyyymm: number; total_revenue: number; cogs: number;
  gross_profit: number; gross_margin_pct: number; sales_marketing: number;
  research_dev: number; general_admin: number; total_opex: number;
  operating_income: number; operating_margin_pct: number;
}
export interface ARRRow {
  period_yyyymm: string; fiscal_year: number; movement_type: string;
  arr_change: number; movement_count: number;
}
export interface ARAgingRow {
  ar_invoice_id: string; customer_id: string; customer_name: string;
  segment_tier: string; region: string; invoice_number: string;
  amount: number; days_overdue: number; aging_bucket: string; fiscal_year: number;
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T[]> {
  const url = new URL(`${API_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) url.searchParams.set(k, String(v)) })
  }
  const authHeader = await getAuthHeader()
  const res = await fetch(url.toString(), { headers: authHeader })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

export const getPL = (fiscalYear?: number, entityId?: string) =>
  get<PLRow>('/metrics/pl', { fiscal_year: fiscalYear, entity_id: entityId })

export const getARR = (fiscalYear?: number) =>
  get<ARRRow>('/metrics/arr', { fiscal_year: fiscalYear })

export const getARaging = (fiscalYear?: number) =>
  get<ARAgingRow>('/metrics/ar_aging', { fiscal_year: fiscalYear })

export async function* streamChat(
  question: string, sessionId: string, memoryId?: string
): AsyncGenerator<string> {
  const url = new URL(`${API_BASE}/chat/stream`)
  url.searchParams.set('question', question)
  url.searchParams.set('session_id', sessionId)
  if (memoryId) url.searchParams.set('memory_id', memoryId)

  const authHeader = await getAuthHeader()
  const res = await fetch(url.toString(), { headers: authHeader })
  if (!res.ok) throw new Error(`Chat API ${res.status}`)
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}

export async function generateCommentary(period: string, entityId?: string, sessionId?: string): Promise<string> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${API_BASE}/commentary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ period_yyyymm: period, entity_id: entityId, session_id: sessionId }),
  })
  if (!res.ok) throw new Error(`Commentary API ${res.status}`)
  const data = await res.json()
  return data.commentary ?? data.answer ?? ''
}

// ── Forecast ─────────────────────────────────────────────────────────────────

export interface ForecastHistoryPoint {
  period_yyyymm: number
  actual_amount: number
}

export interface ForecastProjectionPoint {
  period_yyyymm: number
  projected_amount: number
  confidence_low: number
  confidence_high: number
  trend_component: number
  seasonal_factor: number
}

export interface ForecastResponse {
  metric: string
  entity_id: string
  history: ForecastHistoryPoint[]
  projections: ForecastProjectionPoint[]
  residual_std: number
  confidence_level: number
  last_actual_period: number
  last_actual_amount: number
  last_4_period_avg: number
  projected_4_period_avg: number
  growth_vs_recent: number | null
  method: string
}

export async function getForecast(
  metric: 'revenue' | 'expense' | 'operating_income',
  entityId?: string,
  periodsAhead = 6,
): Promise<ForecastResponse> {
  const url = new URL(`${API_BASE}/metrics/forecast`)
  url.searchParams.set('metric', metric)
  url.searchParams.set('periods_ahead', String(periodsAhead))
  if (entityId) url.searchParams.set('entity_id', entityId)
  const authHeader = await getAuthHeader()
  const res = await fetch(url.toString(), { headers: authHeader })
  if (!res.ok) throw new Error(`Forecast API ${res.status}: ${res.statusText}`)
  return res.json()
}

// ── Anomaly Detection ─────────────────────────────────────────────────────────

export type AnomalyType = 'aged_ar' | 'expense_spike' | 'disposal_loss' | 'forecast_variance'
export type AnomalySeverity = 'high' | 'medium' | 'low'

export interface AnomalyFinding {
  anomaly_type: AnomalyType
  severity: AnomalySeverity
  entity_id: string
  amount: number
  description: string
  period: string
  customer_name?: string
  days_overdue?: number
  pnl_rollup?: string
  spike_ratio?: number
  account_name?: string
  variance_pct?: number
}

export interface AnomalyScanResponse {
  anomalies: AnomalyFinding[]
  scan_period: string
  entity_filter: string
  total_count: number
  high_severity: number
  medium_severity: number
  low_severity: number
}

export async function getAnomalies(
  fiscalYear = 2024,
  periodYyyymm?: string,
  entityId?: string,
): Promise<AnomalyScanResponse> {
  const url = new URL(`${API_BASE}/metrics/anomalies`)
  url.searchParams.set('fiscal_year', String(fiscalYear))
  if (periodYyyymm) url.searchParams.set('period_yyyymm', periodYyyymm)
  if (entityId) url.searchParams.set('entity_id', entityId)
  const authHeader = await getAuthHeader()
  const res = await fetch(url.toString(), { headers: authHeader })
  if (!res.ok) throw new Error(`Anomalies API ${res.status}: ${res.statusText}`)
  return res.json()
}
