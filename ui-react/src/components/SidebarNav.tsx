import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  TrendingUp, BarChart3, CreditCard, MessageSquare,
  FileText, BookOpen, Zap, LineChart, AlertTriangle
} from 'lucide-react'
import { clsx } from 'clsx'
import { getAnomalies } from '../api/client'

interface NavItem {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  badge?: number
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV_STATIC: NavGroup[] = [
  { group: 'Analytics', items: [
    { to: '/pl',       icon: TrendingUp,  label: 'P&L' },
    { to: '/arr',      icon: BarChart3,   label: 'ARR' },
    { to: '/ar-aging', icon: CreditCard,  label: 'AR Aging' },
    { to: '/forecast', icon: LineChart,   label: 'Forecast' },
  ]},
  { group: 'AI Analyst', items: [
    { to: '/chat',        icon: MessageSquare, label: 'AI Analyst' },
    { to: '/commentary',  icon: FileText,      label: 'Commentary' },
    { to: '/board-pack',  icon: BookOpen,      label: 'Board Pack' },
  ]},
]

export default function SidebarNav() {
  const [highAnomalies, setHighAnomalies] = useState(0)
  useEffect(() => {
    getAnomalies(2024).then(d => setHighAnomalies(d.high_severity)).catch(() => {})
  }, [])

  const NAV: NavGroup[] = [
    ...NAV_STATIC,
    { group: 'Intelligence', items: [
      { to: '/anomalies', icon: AlertTriangle, label: 'Anomalies', badge: highAnomalies },
    ]},
  ]

  return (
    <nav className="hidden md:flex flex-col w-56 flex-shrink-0 bg-atlas-navBg h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-[18px] border-b border-white/8">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0b66e4, #6c4ad9)' }}
        >
          <Zap size={14} className="text-white" />
        </div>
        <div>
          <p className="text-white text-[13px] font-semibold leading-tight">ACME Finance</p>
          <p className="text-atlas-navMute text-[10px]">AI Analytics</p>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {NAV.map(({ group, items }) => (
          <div key={group} className="mb-4">
            <p className="px-2 mb-1 text-[10.5px] font-medium uppercase tracking-[0.10em] text-atlas-navMute">
              {group}
            </p>
            {items.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2.5 px-2 py-[6px] rounded-md text-[13px] mb-0.5 transition-colors',
                  isActive
                    ? 'bg-[rgba(11,102,228,0.18)] text-white font-medium'
                    : 'text-atlas-navIn hover:bg-white/8 hover:text-white'
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive
                      ? <span className="w-[5px] h-[5px] rounded-full bg-[#7eb1ff] flex-shrink-0" />
                      : <Icon size={14} className="flex-shrink-0 opacity-70" />
                    }
                    {label}
                    {badge != null && badge > 0 && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-atlas-red text-white leading-none">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-atlas-ok flex-shrink-0" />
        <span className="text-atlas-navMute text-[11px]">API connected</span>
      </div>
    </nav>
  )
}
