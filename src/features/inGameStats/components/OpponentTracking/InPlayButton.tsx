import React from 'react';

interface InPlayButtonProps {
  onClick: () => void;
  disabled?: boolean;
  attemptCount?: number;
}

export const InPlayButton: React.FC<InPlayButtonProps> = ({
  onClick,
  disabled = false,
  attemptCount = 0
}) => {
  return (
    <div className="in-play-button-container">
      <button
        className={`in-play-button ${disabled ? 'disabled' : ''}`}
        onClick={onClick}
        disabled={disabled}
      >
        <span className="button-icon">→</span>
        <span className="button-text">In Play</span>
      </button>
      {attemptCount > 0 && (
        <div className="attempt-count-badge">
          {attemptCount} attempt{attemptCount !== 1 ? 's' : ''} recorded
        </div>
      )}
      {disabled && (
        <div className="disabled-hint">
          Select position → grid location to enable
        </div>
      )}
    </div>
  );
};
