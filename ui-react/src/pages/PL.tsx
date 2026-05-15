import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getPL, type PLRow } from '../api/client'

const ENTITIES = ['All', 'US', 'EMEA', 'APAC']
const ATLAS = {
  brand:  '#0b66e4',
  ok:     '#1a8754',
  violet: '#6c4ad9',
  warn:   '#e07a3a',
}

function fmt(n: number, style: 'currency' | 'percent' = 'currency') {
  if (style === 'percent') return `${n.toFixed(1)}%`
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-atlas-card rounded-2xl border border-atlas-rule px-5 py-4 flex flex-col gap-1">
      <span className="text-[12px] text-atlas-inkDim">{label}</span>
      <span className="text-[28px] font-semibold text-atlas-ink leading-none">{value}</span>
      {sub && <span className="text-[11px] text-atlas-inkMute">{sub}</span>}
    </div>
  )
}

type QuarterRow = {
  label: string
  revenue: number
  grossMarginPct: number
  opMarginPct: number
  grossProfit: number
  operatingIncome: number
}

export default function PL() {
  const [rows, setRows] = useState<PLRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entity, setEntity] = useState('All')

  useEffect(() => {
    setLoading(true)
    setError(null)
    getPL(2024, entity === 'All' ? undefined : entity)
      .then(setRows)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [entity])

  const quarters = useMemo<QuarterRow[]>(() => {
    // Group by fiscal_quarter, sum revenue and compute weighted margins
    const map = new Map<number, { revenue: number; grossProfit: number; opIncome: number }>()
    for (const r of rows) {
      const q = r.fiscal_quarter
      const existing = map.get(q) ?? { revenue: 0, grossProfit: 0, opIncome: 0 }
      map.set(q, {
        revenue: existing.revenue + r.total_revenue,
        grossProfit: existing.grossProfit + r.gross_profit,
        opIncome: existing.opIncome + r.operating_income,
      })
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([q, v]) => ({
        label: `Q${q} FY24`,
        revenue: v.revenue,
        grossMarginPct: v.revenue > 0 ? (v.grossProfit / v.revenue) * 100 : 0,
        opMarginPct: v.revenue > 0 ? (v.opIncome / v.revenue) * 100 : 0,
        grossProfit: v.grossProfit,
        operatingIncome: v.opIncome,
      }))
  }, [rows])

  const totalRevenue = useMemo(() => quarters.reduce((s, q) => s + q.revenue, 0), [quarters])
  const avgGrossMargin = useMemo(() => {
    const totRev = quarters.reduce((s, q) => s + q.revenue, 0)
    const totGP = quarters.reduce((s, q) => s + q.grossProfit, 0)
    return totRev > 0 ? (totGP / totRev) * 100 : 0
  }, [quarters])
  const avgOpMargin = useMemo(() => {
    const totRev = quarters.reduce((s, q) => s + q.revenue, 0)
    const totOI = quarters.reduce((s, q) => s + q.operatingIncome, 0)
    return totRev > 0 ? (totOI / totRev) * 100 : 0
  }, [quarters])

  // Detailed rows table (monthly)
  const tableRows = useMemo(() => {
    return [...rows].sort((a, b) => a.period_yyyymm - b.period_yyyymm)
  }, [rows])

  return (
    <div className="px-8 py-7 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-atlas-ink mb-1">Profit & Loss</h1>
          <p className="text-[12px] text-atlas-inkDim">FY2024 · Quarterly trend analysis</p>
        </div>
        <div className="flex items-center gap-1 bg-atlas-bgSunken rounded-lg p-1">
          {ENTITIES.map(e => (
            <button
              key={e}
              onClick={() => setEntity(e)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                entity === e
                  ? 'bg-atlas-card shadow-sm text-atlas-ink border border-atlas-rule'
                  : 'text-atlas-inkDim hover:text-atlas-ink'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-atlas-inkDim text-[13px]">
          Loading financial data…
        </div>
      )}
      {error && (
        <div className="bg-atlas-redSoft border border-atlas-red/20 rounded-xl px-4 py-3 text-[13px] text-atlas-red mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPICard label="Total Revenue" value={fmt(totalRevenue)} sub="FY2024" />
            <KPICard label="Gross Margin" value={`${avgGrossMargin.toFixed(1)}%`} sub="Weighted avg" />
            <KPICard label="Operating Margin" value={`${avgOpMargin.toFixed(1)}%`} sub="Weighted avg" />
          </div>

          {/* Chart */}
          <div className="bg-atlas-card rounded-2xl border border-atlas-rule p-5 mb-6">
            <h2 className="text-[13px] font-semibold text-atlas-ink mb-1">Quarterly Trend</h2>
            <p className="text-[11.5px] text-atlas-inkDim mb-4">Revenue, gross margin % and operating margin % by quarter</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quarters} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9aa3b2' }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#9aa3b2' }}
                    tickFormatter={v => fmt(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#9aa3b2' }}
                    tickFormatter={v => `${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e6e9ef' }}
                    formatter={(value, name) => {
                      const v = Number(value)
                      const n = String(name)
                      if (n.includes('Margin')) return [`${v.toFixed(1)}%`, n]
                      return [fmt(v), n]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue"
                    stroke={ATLAS.brand} strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="grossMarginPct" name="Gross Margin %"
                    stroke={ATLAS.ok} strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="opMarginPct" name="Op Margin %"
                    stroke={ATLAS.violet} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-atlas-card rounded-2xl border border-atlas-rule overflow-hidden">
            <div className="px-5 py-4 border-b border-atlas-rule">
              <h2 className="text-[13px] font-semibold text-atlas-ink">Monthly Detail</h2>
              <p className="text-[11.5px] text-atlas-inkDim">All periods · {entity} entities</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-atlas-bgSunken">
                    {['Period', 'Entity', 'Revenue', 'Gross Profit', 'Gross Margin', 'OpEx', 'Op Income', 'Op Margin'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-atlas-inkDim font-medium uppercase tracking-wide text-[10.5px] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={`${r.entity_id}-${r.period_yyyymm}`}
                      className={`border-t border-atlas-rule hover:bg-atlas-brandSoft/40 transition-colors ${i % 2 === 1 ? 'bg-atlas-bg' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-atlas-inkDim">{r.period_yyyymm}</td>
                      <td className="px-4 py-2.5 font-medium text-atlas-ink">{r.entity_id}</td>
                      <td className="px-4 py-2.5 text-atlas-inkSoft">{fmt(r.total_revenue)}</td>
                      <td className="px-4 py-2.5 text-atlas-inkSoft">{fmt(r.gross_profit)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-atlas-ok font-medium">{r.gross_margin_pct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-atlas-inkSoft">{fmt(r.total_opex)}</td>
                      <td className="px-4 py-2.5">
                        <span className={r.operating_income >= 0 ? 'text-atlas-ok' : 'text-atlas-red'}>
                          {fmt(r.operating_income)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={r.operating_margin_pct >= 0 ? 'text-atlas-ok font-medium' : 'text-atlas-red font-medium'}>
                          {r.operating_margin_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
