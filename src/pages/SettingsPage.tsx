import { useTheme } from '@/providers/ThemeProvider'
import { SegmentedControl } from '@/components/ui/segmented-control'

const themeOptions = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium mb-3">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">Choose light, dark, or match your system</p>
          </div>
          <SegmentedControl
            value={theme}
            onChange={setTheme}
            options={themeOptions}
          />
        </div>
      </section>
    </div>
  )
}
