import { useState } from 'react'
import VolleyballCourt from './components/VolleyballCourt'
import './App.css'

function App() {
  const [players, setPlayers] = useState({
    1: { name: 'P1', position: 'Setter' },
    2: { name: 'P2', position: 'OH1' },
    3: { name: 'P3', position: 'MB1' },
    4: { name: 'P4', position: 'OH2' },
    5: { name: 'P5', position: 'MB2' },
    6: { name: 'P6', position: 'Oppo' }
  })

  const [currentRotation, setCurrentRotation] = useState(1)

  const rotateClockwise = () => {
    setCurrentRotation(prev => prev === 6 ? 1 : prev + 1)
  }

  const rotateCounterClockwise = () => {
    setCurrentRotation(prev => prev === 1 ? 6 : prev - 1)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏐 Volleyball Coach</h1>
        <div className="rotation-info">
          <span>Rotation {currentRotation} - Server: Position {currentRotation}</span>
        </div>
      </header>
      
      <main className="app-main">
        <VolleyballCourt 
          players={players} 
          currentRotation={currentRotation}
        />
        
        <div className="controls">
          <button onClick={rotateCounterClockwise} className="rotate-btn">
            ← Rotate CCW
          </button>
          <button onClick={rotateClockwise} className="rotate-btn">
            Rotate CW →
          </button>
        </div>
      </main>
    </div>
  )
}

export default App
