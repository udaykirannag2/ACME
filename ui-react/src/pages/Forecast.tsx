import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { getForecast, type ForecastResponse } from '../api/client'

type Metric = 'revenue' | 'expense' | 'operating_income'
type Entity = 'All' | 'US' | 'EMEA' | 'APAC'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'operating_income', label: 'Op Income' },
]
const ENTITIES: Entity[] = ['All', 'US', 'EMEA', 'APAC']

function fmt(v: number | null | undefined) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
  return `${sign}$${abs.toLocaleString()}`
}

// Convert period_yyyymm integer to "MMM YY" label
function periodLabel(p: number): string {
  const s = String(p)
  const y = s.slice(2, 4)
  const m = parseInt(s.slice(4, 6))
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[m - 1]} '${y}`
}

export default function Forecast() {
  const [metric, setMetric] = useState<Metric>('revenue')
  const [entity, setEntity] = useState<Entity>('All')
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    setError(null)
    getForecast(metric, entity === 'All' ? undefined : entity, 6)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [metric, entity])

  // Merge history + projections into a single flat array for Recharts
  const chartData = useMemo(() => {
    if (!data) return []
    const histMap = new Map(data.history.map(h => [h.period_yyyymm, h.actual_amount]))
    const projMap = new Map(data.projections.map(p => [p.period_yyyymm, p]))
    const allPeriods = [...new Set([
      ...data.history.map(h => h.period_yyyymm),
      ...data.projections.map(p => p.period_yyyymm),
    ])].sort()

    return allPeriods.map(p => {
      const proj = projMap.get(p)
      return {
        period: p,
        label: periodLabel(p),
        actual:    histMap.has(p) ? histMap.get(p) : null,
        forecast:  proj ? proj.projected_amount : null,
        band_high: proj ? proj.confidence_high : null,
        band_low:  proj ? proj.confidence_low  : null,
      }
    })
  }, [data])

  // The period where forecast starts (first projection period)
  const forecastStartPeriod = data?.projections?.[0]?.period_yyyymm

  const projQ4 = useMemo(() => {
    if (!data?.projections?.length) return null
    const last3 = data.projections.slice(-3)
    return last3.reduce((s, p) => s + p.projected_amount, 0)
  }, [data])

  const ciRange = data ? data.residual_std * 1.96 : null

  const handleExplain = () => {
    if (!data) return
    const growth = data.growth_vs_recent != null ? `${data.growth_vs_recent > 0 ? '+' : ''}${data.growth_vs_recent.toFixed(1)}%` : 'unknown'
    const q = encodeURIComponent(
      `Explain the ${metric.replace('_', ' ')} forecast for ${entity === 'All' ? 'all entities' : entity}. ` +
      `Projected trend is ${growth} vs recent actuals. ` +
      `What are the key drivers and risks?`
    )
    navigate(`/chat?q=${q}`)
  }

  return (
    <div className="px-8 py-7 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-atlas-ink">Forecast</h1>
          <p className="text-[13px] text-atlas-inkDim mt-0.5">
            Linear trend · 12-month seasonality · 95% confidence band
          </p>
        </div>
        <button
          onClick={handleExplain}
          disabled={!data}
          className="flex items-center gap-1.5 text-[13px] text-atlas-brand border border-atlas-brand/30
                     px-3 py-2 rounded-xl hover:bg-atlas-brandSoft transition-all disabled:opacity-40"
        >
          <MessageSquare size={14} />
          Explain this forecast
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6 mb-6">
        {/* Metric selector */}
        <div className="flex items-center gap-1 bg-atlas-bgSunken rounded-xl p-1">
          {METRICS.map(m => (
            <button
              key={m.value}
              onClick={() => setMetric(m.value)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
                metric === m.value
                  ? 'bg-atlas-card text-atlas-brand shadow-sm'
                  : 'text-atlas-inkDim hover:text-atlas-ink'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {/* Entity toggle */}
        <div className="flex items-center gap-1 bg-atlas-bgSunken rounded-xl p-1">
          {ENTITIES.map(e => (
            <button
              key={e}
              onClick={() => setEntity(e)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
                entity === e
                  ? 'bg-atlas-card text-atlas-brand shadow-sm'
                  : 'text-atlas-inkDim hover:text-atlas-ink'
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      {data && !loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: 'Projected (next 3 periods)',
              value: projQ4 != null ? fmt(projQ4) : '—',
              sub: 'Sum of next 3 quarters',
            },
            {
              label: 'Growth vs Recent',
              value: data.growth_vs_recent != null
                ? `${data.growth_vs_recent > 0 ? '+' : ''}${data.growth_vs_recent.toFixed(1)}%`
                : '—',
              sub: 'vs last 4-period average',
              color: data.growth_vs_recent != null
                ? (data.growth_vs_recent >= 0 ? 'text-atlas-ok' : 'text-atlas-red')
                : '',
            },
            {
              label: '95% Confidence Range',
              value: ciRange != null ? `±${fmt(ciRange)}` : '—',
              sub: 'per period (1σ × 1.96)',
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-atlas-card rounded-2xl border border-atlas-rule px-5 py-4">
              <p className="text-[11px] text-atlas-inkDim uppercase tracking-wide mb-1">{label}</p>
              <p className={clsx('text-[26px] font-semibold text-atlas-ink leading-tight', color)}>{value}</p>
              <p className="text-[11px] text-atlas-inkMute mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-atlas-card rounded-2xl border border-atlas-rule px-6 pt-5 pb-4">
        <p className="text-[13px] font-medium text-atlas-ink mb-4">
          {metric === 'revenue' ? 'Revenue' : metric === 'expense' ? 'Expense' : 'Operating Income'} — Actuals & Forecast
        </p>

        {loading && (
          <div className="h-64 flex items-center justify-center text-atlas-inkDim text-[13px]">
            Loading forecast…
          </div>
        )}
        {error && (
          <div className="h-64 flex items-center justify-center text-atlas-red text-[13px]">
            {error}
          </div>
        )}
        {!loading && !error && data && (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7689' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => fmt(v as number)}
                tick={{ fontSize: 11, fill: '#6b7689' }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'band_high' || name === 'band_low') return undefined
                  return [fmt(value as number), name === 'actual' ? 'Actual' : 'Forecast']
                }}
                labelStyle={{ fontSize: 12, color: '#0b1220' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e6e9ef', fontSize: 12 }}
              />
              {forecastStartPeriod && (
                <ReferenceLine
                  x={periodLabel(forecastStartPeriod)}
                  stroke="#d3d8e0"
                  strokeDasharray="4 2"
                  label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 10, fill: '#9aa3b2' }}
                />
              )}
              {/* CI band — two areas stacked */}
              <Area dataKey="band_high" fill="#0b66e4" stroke="none" fillOpacity={0.12} connectNulls={false} legendType="none" />
              <Area dataKey="band_low"  fill="#ffffff" stroke="none" fillOpacity={1}    connectNulls={false} legendType="none" />
              {/* Actuals line */}
              <Line dataKey="actual"   stroke="#0b66e4" strokeWidth={2} dot={false} connectNulls={false} name="actual" />
              {/* Forecast line */}
              <Line dataKey="forecast" stroke="#0b66e4" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} name="forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Manual legend */}
        {!loading && !error && (
          <div className="flex items-center gap-5 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-atlas-brand inline-block" />
              <span className="text-[11px] text-atlas-inkDim">Actuals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 border-t-2 border-dashed border-atlas-brand inline-block" />
              <span className="text-[11px] text-atlas-inkDim">Forecast</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-3 bg-atlas-brand/15 rounded inline-block" />
              <span className="text-[11px] text-atlas-inkDim">95% CI</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
