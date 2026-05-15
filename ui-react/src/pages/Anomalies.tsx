import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { getAnomalies, type AnomalyFinding, type AnomalyScanResponse } from '../api/client'

type Entity = 'All' | 'US' | 'EMEA' | 'APAC'
const ENTITIES: Entity[] = ['All', 'US', 'EMEA', 'APAC']
const PERIODS = ['', '202401','202402','202403','202404','202405','202406',
                 '202407','202408','202409','202410','202411','202412']
const PERIOD_LABELS: Record<string, string> = {
  '': 'Full Year', '202401':'Jan 2024','202402':'Feb 2024','202403':'Mar 2024',
  '202404':'Apr 2024','202405':'May 2024','202406':'Jun 2024','202407':'Jul 2024',
  '202408':'Aug 2024','202409':'Sep 2024','202410':'Oct 2024','202411':'Nov 2024',
  '202412':'Dec 2024',
}

const TYPE_ICONS: Record<string, string> = {
  aged_ar: '⚠️', expense_spike: '📈', disposal_loss: '🗑️', forecast_variance: '📊',
}
const TYPE_LABELS: Record<string, string> = {
  aged_ar: 'Aged AR', expense_spike: 'Expense Spike',
  disposal_loss: 'Asset Disposal', forecast_variance: 'Forecast Variance',
}
const SEVERITY_CLASSES: Record<string, string> = {
  high:   'bg-atlas-redSoft text-atlas-red',
  medium: 'bg-atlas-warnSoft text-atlas-warn',
  low:    'bg-atlas-brandSoft text-atlas-brand',
}

function fmt(v: number) {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
  return `${sign}$${abs.toLocaleString()}`
}

function AnomalyCard({ finding, onInvestigate }: { finding: AnomalyFinding; onInvestigate: () => void }) {
  return (
    <div className="bg-atlas-card rounded-2xl border border-atlas-rule p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{TYPE_ICONS[finding.anomaly_type]}</span>
          <div>
            <p className="text-[12px] font-medium text-atlas-inkSoft">{TYPE_LABELS[finding.anomaly_type]}</p>
            <span className={clsx(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
              SEVERITY_CLASSES[finding.severity]
            )}>
              {finding.severity.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-atlas-inkDim font-mono">{finding.period}</p>
          <p className="text-[11px] text-atlas-inkDim">{finding.entity_id}</p>
        </div>
      </div>

      <p className="text-[12.5px] text-atlas-inkSoft leading-relaxed">{finding.description}</p>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-atlas-rule">
        <span className="text-[22px] font-semibold text-atlas-ink">{fmt(finding.amount)}</span>
        <button
          onClick={onInvestigate}
          className="flex items-center gap-1.5 text-[12px] text-atlas-brand hover:text-atlas-brandDeep
                     px-3 py-1.5 rounded-xl border border-atlas-brand/30 hover:bg-atlas-brandSoft transition-all"
        >
          <MessageSquare size={12} />
          Investigate with AI
        </button>
      </div>
    </div>
  )
}

export default function Anomalies() {
  const [entity, setEntity]   = useState<Entity>('All')
  const [period, setPeriod]   = useState('')
  const [data, setData]       = useState<AnomalyScanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true); setError(null)
    getAnomalies(2024, period || undefined, entity === 'All' ? undefined : entity)
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [entity, period])

  const handleInvestigate = (f: AnomalyFinding) => {
    const q = encodeURIComponent(
      `Investigate this anomaly: ${f.description}. ` +
      `Amount: ${fmt(f.amount)}. ` +
      `What is the root cause and what action should FP&A take?`
    )
    navigate(`/chat?q=${q}`)
  }

  return (
    <div className="px-8 py-7 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-atlas-ink flex items-center gap-2">
            <AlertTriangle size={20} className="text-atlas-warn" />
            Financial Anomalies
          </h1>
          <p className="text-[13px] text-atlas-inkDim mt-0.5">
            Automated detection: aged AR · expense spikes · disposal losses · forecast variance
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-atlas-bgSunken transition-colors">
          <RefreshCw size={16} className={clsx('text-atlas-inkDim', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1 bg-atlas-bgSunken rounded-xl p-1">
          {ENTITIES.map(e => (
            <button key={e} onClick={() => setEntity(e)}
              className={clsx('px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
                entity === e ? 'bg-atlas-card text-atlas-brand shadow-sm' : 'text-atlas-inkDim hover:text-atlas-ink'
              )}>
              {e}
            </button>
          ))}
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="text-[12.5px] border border-atlas-rule rounded-xl px-3 py-2 bg-atlas-card text-atlas-ink outline-none focus:ring-2 focus:ring-atlas-brand/20"
        >
          {PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
        </select>
      </div>

      {/* Severity summary */}
      {data && !loading && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[13px] text-atlas-inkDim font-medium">{data.total_count} findings</span>
          {data.high_severity > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-atlas-redSoft text-atlas-red">
              {data.high_severity} High
            </span>
          )}
          {data.medium_severity > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-atlas-warnSoft text-atlas-warn">
              {data.medium_severity} Medium
            </span>
          )}
          {data.low_severity > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-atlas-brandSoft text-atlas-brand">
              {data.low_severity} Low
            </span>
          )}
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-[13px] text-atlas-inkDim">
          Scanning for anomalies…
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-24 text-[13px] text-atlas-red">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data?.total_count === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-atlas-okSoft flex items-center justify-center">
            <CheckCircle2 size={22} className="text-atlas-ok" />
          </div>
          <p className="font-semibold text-atlas-ink">No anomalies detected</p>
          <p className="text-[13px] text-atlas-inkDim">All financial health checks passed for {data.scan_period}</p>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && data && data.total_count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.anomalies.map((f, i) => (
            <AnomalyCard key={i} finding={f} onInvestigate={() => handleInvestigate(f)} />
          ))}
        </div>
      )}
    </div>
  )
}
