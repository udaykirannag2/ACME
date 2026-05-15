import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getARR, type ARRRow } from '../api/client'

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function KPICard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-atlas-card rounded-2xl border border-atlas-rule px-5 py-4 flex flex-col gap-1">
      <span className="text-[12px] text-atlas-inkDim">{label}</span>
      <span className={`text-[28px] font-semibold leading-none ${positive === undefined ? 'text-atlas-ink' : positive ? 'text-atlas-ok' : 'text-atlas-red'}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-atlas-inkMute">{sub}</span>}
    </div>
  )
}

const MOVEMENT_COLORS: Record<string, string> = {
  'new_business':  '#1a8754',
  'expansion':     '#0b66e4',
  'contraction':   '#e07a3a',
  'churn':         '#dc2626',
  'reactivation':  '#6c4ad9',
}

const MOVEMENT_LABELS: Record<string, string> = {
  'new_business': 'New Business',
  'expansion':    'Expansion',
  'contraction':  'Contraction',
  'churn':        'Churn',
  'reactivation': 'Reactivation',
}

type ChartRow = Record<string, string | number> & { period: string }

export default function ARR() {
  const [rows, setRows] = useState<ARRRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getARR(2024)
      .then(setRows)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const movementTypes = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.movement_type)))
  }, [rows])

  const chartData = useMemo<ChartRow[]>(() => {
    const periods = Array.from(new Set(rows.map(r => r.period_yyyymm))).sort()
    return periods.map(period => {
      const entry: ChartRow = { period }
      for (const mt of movementTypes) {
        const match = rows.find(r => r.period_yyyymm === period && r.movement_type === mt)
        entry[mt] = match ? match.arr_change : 0
      }
      return entry
    })
  }, [rows, movementTypes])

  const totalNetNewARR = useMemo(() =>
    rows.reduce((s, r) => s + r.arr_change, 0), [rows])

  const positiveARR = useMemo(() =>
    rows.filter(r => r.arr_change > 0).reduce((s, r) => s + r.arr_change, 0), [rows])

  const churnARR = useMemo(() =>
    rows.filter(r => r.movement_type === 'churn').reduce((s, r) => s + r.arr_change, 0), [rows])

  const tableRows = useMemo(() =>
    [...rows].sort((a, b) => a.period_yyyymm.localeCompare(b.period_yyyymm)), [rows])

  return (
    <div className="px-8 py-7 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[15px] font-semibold text-atlas-ink mb-1">ARR Movements</h1>
        <p className="text-[12px] text-atlas-inkDim">FY2024 · Annual Recurring Revenue waterfall by period</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-atlas-inkDim text-[13px]">
          Loading ARR data…
        </div>
      )}
      {error && (
        <div className="bg-atlas-redSoft border border-atlas-red/20 rounded-xl px-4 py-3 text-[13px] text-atlas-red mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPICard label="Net New ARR" value={fmt(totalNetNewARR)} sub="FY2024" positive={totalNetNewARR >= 0} />
            <KPICard label="Gross New ARR" value={fmt(positiveARR)} sub="New + expansion + reactivation" />
            <KPICard label="Churned ARR" value={fmt(churnARR)} sub="Churn only" positive={false} />
          </div>

          {/* Stacked bar chart */}
          <div className="bg-atlas-card rounded-2xl border border-atlas-rule p-5 mb-6">
            <h2 className="text-[13px] font-semibold text-atlas-ink mb-1">ARR Waterfall by Period</h2>
            <p className="text-[11.5px] text-atlas-inkDim mb-4">Stacked movements: new, expansion, contraction, churn</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#9aa3b2' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9aa3b2' }} tickFormatter={v => fmt(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e6e9ef' }}
                    formatter={(value, name) => [fmt(Number(value)), MOVEMENT_LABELS[String(name)] ?? String(name)]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={name => MOVEMENT_LABELS[name] ?? name}
                  />
                  {movementTypes.map(mt => (
                    <Bar key={mt} dataKey={mt} stackId="a" fill={MOVEMENT_COLORS[mt] ?? '#9aa3b2'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-atlas-card rounded-2xl border border-atlas-rule overflow-hidden">
            <div className="px-5 py-4 border-b border-atlas-rule">
              <h2 className="text-[13px] font-semibold text-atlas-ink">Movement Detail</h2>
              <p className="text-[11.5px] text-atlas-inkDim">All periods · All movement types</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-atlas-bgSunken">
                    {['Period', 'Movement Type', 'ARR Change', 'Count'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-atlas-inkDim font-medium uppercase tracking-wide text-[10.5px]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={`${r.period_yyyymm}-${r.movement_type}`}
                      className={`border-t border-atlas-rule hover:bg-atlas-brandSoft/40 transition-colors ${i % 2 === 1 ? 'bg-atlas-bg' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-atlas-inkDim">{r.period_yyyymm}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor: `${MOVEMENT_COLORS[r.movement_type] ?? '#9aa3b2'}20`,
                            color: MOVEMENT_COLORS[r.movement_type] ?? '#9aa3b2',
                          }}
                        >
                          {MOVEMENT_LABELS[r.movement_type] ?? r.movement_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={r.arr_change >= 0 ? 'text-atlas-ok font-medium' : 'text-atlas-red font-medium'}>
                          {r.arr_change >= 0 ? '+' : ''}{fmt(r.arr_change)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-atlas-inkSoft">{r.movement_count}</td>
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
