import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getARaging, type ARAgingRow } from '../api/client'

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

const BUCKET_ORDER = ['0-30 days', '31-60 days', '61-90 days', '90+ days']
const BUCKET_COLORS = ['#1a8754', '#e07a3a', '#dc2626', '#991b1b']

function KPICard({ label, value, sub, colorClass }: { label: string; value: string; sub?: string; colorClass?: string }) {
  return (
    <div className="bg-atlas-card rounded-2xl border border-atlas-rule px-5 py-4 flex flex-col gap-1">
      <span className="text-[12px] text-atlas-inkDim">{label}</span>
      <span className={`text-[28px] font-semibold leading-none ${colorClass ?? 'text-atlas-ink'}`}>{value}</span>
      {sub && <span className="text-[11px] text-atlas-inkMute">{sub}</span>}
    </div>
  )
}

export default function ARaging() {
  const [rows, setRows] = useState<ARAgingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getARaging(2024)
      .then(setRows)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const bucketTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      map.set(r.aging_bucket, (map.get(r.aging_bucket) ?? 0) + r.amount)
    }
    return BUCKET_ORDER.map(b => ({ bucket: b, amount: map.get(b) ?? 0 }))
  }, [rows])

  const totalAR = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows])

  const overdueAR = useMemo(() =>
    rows.filter(r => r.aging_bucket !== '0-30 days').reduce((s, r) => s + r.amount, 0), [rows])

  const critical = useMemo(() =>
    rows.filter(r => r.aging_bucket === '90+ days').reduce((s, r) => s + r.amount, 0), [rows])

  const tableRows = useMemo(() =>
    [...rows].sort((a, b) => b.days_overdue - a.days_overdue), [rows])

  return (
    <div className="px-8 py-7 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[15px] font-semibold text-atlas-ink mb-1">AR Aging</h1>
        <p className="text-[12px] text-atlas-inkDim">FY2024 · Accounts receivable aging analysis</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-atlas-inkDim text-[13px]">
          Loading AR data…
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
            <KPICard label="Total AR Outstanding" value={fmt(totalAR)} sub="All buckets" />
            <KPICard label="Overdue (31+ days)" value={fmt(overdueAR)} sub={`${((overdueAR / totalAR) * 100).toFixed(1)}% of total`} colorClass="text-atlas-warn" />
            <KPICard label="Critical (90+ days)" value={fmt(critical)} sub={`${((critical / totalAR) * 100).toFixed(1)}% of total`} colorClass="text-atlas-red" />
          </div>

          {/* Horizontal bar chart */}
          <div className="bg-atlas-card rounded-2xl border border-atlas-rule p-5 mb-6">
            <h2 className="text-[13px] font-semibold text-atlas-ink mb-1">Outstanding by Aging Bucket</h2>
            <p className="text-[11.5px] text-atlas-inkDim mb-4">Total invoice amount grouped by days overdue</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bucketTotals} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6e9ef" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9aa3b2' }} tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11, fill: '#6b7689' }} width={80} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e6e9ef' }}
                    formatter={(value) => [fmt(Number(value)), 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {bucketTotals.map((_, i) => (
                      <Cell key={i} fill={BUCKET_COLORS[i] ?? '#9aa3b2'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-atlas-card rounded-2xl border border-atlas-rule overflow-hidden">
            <div className="px-5 py-4 border-b border-atlas-rule">
              <h2 className="text-[13px] font-semibold text-atlas-ink">Invoice Detail</h2>
              <p className="text-[11.5px] text-atlas-inkDim">Sorted by days overdue descending</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-atlas-bgSunken">
                    {['Customer', 'Invoice #', 'Amount', 'Days Overdue', 'Bucket', 'Region', 'Segment'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-atlas-inkDim font-medium uppercase tracking-wide text-[10.5px] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => {
                    const bucketIdx = BUCKET_ORDER.indexOf(r.aging_bucket)
                    const bucketColor = BUCKET_COLORS[bucketIdx] ?? '#9aa3b2'
                    return (
                      <tr key={r.ar_invoice_id}
                        className={`border-t border-atlas-rule hover:bg-atlas-brandSoft/40 transition-colors ${i % 2 === 1 ? 'bg-atlas-bg' : ''}`}>
                        <td className="px-4 py-2.5 font-medium text-atlas-ink max-w-[180px] truncate">
                          {r.customer_name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11.5px] text-atlas-inkDim">{r.invoice_number}</td>
                        <td className="px-4 py-2.5 font-medium text-atlas-inkSoft">{fmt(r.amount)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-semibold ${r.days_overdue > 90 ? 'text-atlas-red' : r.days_overdue > 60 ? 'text-atlas-warn' : r.days_overdue > 30 ? 'text-amber-600' : 'text-atlas-ok'}`}>
                            {r.days_overdue}d
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ backgroundColor: `${bucketColor}18`, color: bucketColor }}
                          >
                            {r.aging_bucket}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-atlas-inkDim">{r.region}</td>
                        <td className="px-4 py-2.5 text-atlas-inkDim">{r.segment_tier}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
