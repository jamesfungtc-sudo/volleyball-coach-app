import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Rotations', icon: '🏐' },
  { path: '/teams', label: 'Teams', icon: '👥' },
  { path: '/statistics', label: 'Stats', icon: '📊' },
  { path: '/in-game-stats', label: 'In-Game Stats', icon: '⚡' },
  { path: '/opponent-analysis', label: 'Opponent Analysis', icon: '🎯' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
]

function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(prev => !prev)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <>
      {/* Main nav bar */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Brand */}
          <h1 className="text-white font-semibold text-xl m-0">🏐 Volleyball Coach</h1>

          {/* Burger button */}
          <button
            onClick={toggleMenu}
            aria-label="Toggle menu"
            className="flex flex-col justify-around w-6 h-6 bg-transparent border-none cursor-pointer p-0 z-[1001]"
          >
            <span className={cn(
              'block w-6 h-[3px] bg-white rounded-sm transition-all duration-300 origin-[1px]',
              isMenuOpen && 'rotate-45'
            )} />
            <span className={cn(
              'block w-6 h-[3px] bg-white rounded-sm transition-all duration-300',
              isMenuOpen && 'opacity-0'
            )} />
            <span className={cn(
              'block w-6 h-[3px] bg-white rounded-sm transition-all duration-300 origin-[1px]',
              isMenuOpen && '-rotate-45'
            )} />
          </button>
        </div>
      </nav>

      {/* Slide-in drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-72 z-[1000] pt-20 transition-transform duration-300 ease-in-out shadow-xl',
          'sm:w-80'
        )}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <nav className="flex flex-col gap-2 p-4">
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={closeMenu}
              className={({ isActive }) => cn(
                'flex items-center gap-4 px-6 py-4 rounded-xl text-white/90 no-underline transition-all duration-200',
                'hover:bg-white/10 hover:text-white hover:translate-x-1',
                isActive && 'bg-white/20 text-white shadow-md'
              )}
            >
              <span className="text-2xl min-w-6">{icon}</span>
              <span className="text-base font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Backdrop overlay */}
      {isMenuOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
        />
      )}
    </>
  )
}

export default NavigationBar
