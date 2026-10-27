import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-14">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
