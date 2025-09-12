import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './NavigationBar.css'

function NavigationBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const navItems = [
    { path: '/', label: 'Rotations', icon: '🏐' },
    { path: '/teams', label: 'Teams', icon: '👥' },
    { path: '/statistics', label: 'Stats', icon: '📊' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className="navigation-bar">
      <div className="nav-header">
        <div className="nav-brand">
          <h1>🏐 Volleyball Coach</h1>
        </div>
        
        <button 
          className={`burger-menu ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      
      <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
        <div className="nav-items">
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => 
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={closeMenu}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
      
      {isMenuOpen && <div className="nav-overlay" onClick={closeMenu}></div>}
    </nav>
  )
}

export default NavigationBar