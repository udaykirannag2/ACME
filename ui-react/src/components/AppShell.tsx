import { Outlet } from 'react-router-dom'
import SidebarNav from './SidebarNav'

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-atlas-bg">
      <SidebarNav />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
