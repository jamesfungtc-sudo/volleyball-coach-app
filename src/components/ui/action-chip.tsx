import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes } from 'react'

interface ActionChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'success' | 'destructive' | 'warning'
  active?: boolean
}

export function ActionChip({
  children,
  variant = 'default',
  active = false,
  className,
  ...props
}: ActionChipProps) {
  return (
    <button
      className={cn(
        'inline-flex h-11 min-w-[44px] items-center justify-center rounded-full px-4 text-sm font-medium transition-colors',
        'border border-border active:scale-95',
        variant === 'default' && [
          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-foreground hover:bg-muted',
        ],
        variant === 'success' && [
          active ? 'bg-success text-white border-success' : 'bg-surface text-success border-success/30 hover:bg-success/10',
        ],
        variant === 'destructive' && [
          active ? 'bg-destructive text-white border-destructive' : 'bg-surface text-destructive border-destructive/30 hover:bg-destructive/10',
        ],
        variant === 'warning' && [
          active ? 'bg-warning text-white border-warning' : 'bg-surface text-warning border-warning/30 hover:bg-warning/10',
        ],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
