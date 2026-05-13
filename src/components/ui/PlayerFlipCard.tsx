import React from 'react';
import './PlayerFlipCard.css';

interface PlayerFlipCardProps {
  jerseyNumber: number | string;
  name: string;
  position: string;
  onClick?: () => void;
}

export function PlayerFlipCard({ jerseyNumber, name, position, onClick }: PlayerFlipCardProps) {
  return (
    <button className="flip-card" onClick={onClick} type="button">
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <div className="flip-card-jersey">#{jerseyNumber}</div>
          <div className="flip-card-name">{name}</div>
          {position && (
            <div className="flip-card-position-badge">{position}</div>
          )}
        </div>
        <div className="flip-card-back">
          <div className="flip-card-back-jersey">#{jerseyNumber}</div>
          <div className="flip-card-back-name">{name}</div>
          {position && (
            <div className="flip-card-back-position">{position}</div>
          )}
          <div className="flip-card-back-hint">tap to select</div>
        </div>
      </div>
    </button>
  );
}
