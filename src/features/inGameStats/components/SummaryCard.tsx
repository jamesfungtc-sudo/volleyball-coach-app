import React from 'react';
import './SummaryCard.css';

interface SummaryCardProps {
  title: string;
  homeValue: number | string;
  opponentValue: number | string;
  homeLabel?: string;
  opponentLabel?: string;
}

/**
 * SummaryCard - Displays a comparison metric between home and opponent
 * Used for top-level KPIs like Kills, Aces, Blocks, etc.
 */
export function SummaryCard({
  title,
  homeValue,
  opponentValue,
  homeLabel = 'Home',
  opponentLabel = 'Opp'
}: SummaryCardProps) {
  return (
    <div className="summary-card">
      <h3 className="summary-card-title">{title}</h3>
      <div className="summary-card-values">
        <div className="summary-value home-value">
          <span className="value-number">{homeValue}</span>
          <span className="value-label">{homeLabel}</span>
        </div>
        <div className="summary-separator">vs</div>
        <div className="summary-value opponent-value">
          <span className="value-number">{opponentValue}</span>
          <span className="value-label">{opponentLabel}</span>
        </div>
      </div>
    </div>
  );
}
