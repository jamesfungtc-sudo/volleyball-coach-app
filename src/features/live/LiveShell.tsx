import type { ReactNode } from 'react'

/**
 * Full-screen live tracking layout (no tab bar):
 * 48px score strip, flexible content, and a bottom action bar.
 */
export function LiveShell({ strip, actions, children }: { strip: ReactNode; actions: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center gap-2 border-b border-border bg-surface-elevated px-2 pt-[env(safe-area-inset-top)] sm:px-3">
        {strip}
      </header>
      <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
      <footer className="flex min-h-14 shrink-0 items-center gap-2 border-t border-border bg-surface-elevated px-2 pb-[env(safe-area-inset-bottom)] sm:px-3">
        {actions}
      </footer>
    </div>
  )
}
