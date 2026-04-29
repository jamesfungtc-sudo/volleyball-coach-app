import { cn } from '@/lib/utils'
import './PageLayout.css'

function PageLayout({
  title,
  subtitle,
  children,
  className = '',
  headerClassName = '',
  contentClassName = ''
}) {
  return (
    <div className={cn('p-4 md:p-6 lg:p-8 min-h-[calc(100vh-56px)] w-full', className)}>
      {title && (
        <header className={cn(
          'text-center mb-6 p-5 rounded-xl border border-border bg-card shadow-sm',
          headerClassName
        )}>
          <h1 className="m-0 mb-1 text-2xl md:text-3xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="m-0 text-muted-foreground text-sm md:text-base leading-relaxed">{subtitle}</p>
          )}
        </header>
      )}

      <main className={cn('flex flex-col gap-6 w-full', contentClassName)}>
        {children}
      </main>
    </div>
  )
}

export default PageLayout
