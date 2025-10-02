import React from 'react';
import './WinLossToggle.css';

interface WinLossToggleProps {
  value: 'Win' | 'Loss' | null;
  onChange: (value: 'Win' | 'Loss') => void;
  disabled?: boolean;
}

/**
 * WinLossToggle - Binary toggle for selecting Point WIN or Point LOSS
 * This is the first step in the point entry workflow
 */
export function WinLossToggle({ value, onChange, disabled = false }: WinLossToggleProps) {
  return (
    <div className="win-loss-toggle">
      <button
        type="button"
        className={`toggle-btn win-btn ${value === 'Win' ? 'active' : ''}`}
        onClick={() => onChange('Win')}
        disabled={disabled}
        aria-pressed={value === 'Win'}
      >
        Point WIN
      </button>
      <button
        type="button"
        className={`toggle-btn loss-btn ${value === 'Loss' ? 'active' : ''}`}
        onClick={() => onChange('Loss')}
        disabled={disabled}
        aria-pressed={value === 'Loss'}
      >
        Point LOSS
      </button>
    </div>
  );
}
