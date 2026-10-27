import { cn } from '@/lib/utils'
import { useMatchSync } from '../hooks/useMatchSync'
import type { SyncState } from '../services/liveSyncEngine'

const config: Record<SyncState, { label: string; dot: string; title: string }> = {
  synced: { label: 'Synced', dot: 'bg-success', title: 'All points saved to Google Sheets' },
  syncing: { label: 'Syncing', dot: 'bg-primary animate-pulse', title: 'Saving to Google Sheets' },
  offline: { label: 'Offline', dot: 'bg-warning', title: 'Saved on this device; will sync when back online' },
  error: { label: 'Retrying', dot: 'bg-destructive', title: 'Sync failed; retrying automatically' },
  local: { label: 'On device', dot: 'bg-muted-foreground', title: 'Google Sheets not configured; saved on this device only' },
}

/** `compact` collapses to a dot on phone widths. */
export function SyncBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { state, pending } = useMatchSync()
  const { label, dot, title } = config[state]
  return (
    <span
      role="status"
      title={title}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted-foreground',
        className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      <span className={cn(compact && 'max-sm:sr-only')}>{label}</span>
      {pending > 0 && state !== 'synced' && <span className="tabular-nums">· {pending}</span>}
    </span>
  )
}
