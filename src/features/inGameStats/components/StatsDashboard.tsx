import React, { useMemo, useState } from 'react';
import { SummaryCard } from './SummaryCard';
import { MomentumIndicator } from './MomentumIndicator';
import { PointProgressionChart } from './PointProgressionChart';
import { ScoringRunsChart } from './ScoringRunsChart';
import { ActionBreakdownChart } from './ActionBreakdownChart';
import { PlayerHitAceRatioChart } from './PlayerHitAceRatioChart';
import { AttackKDEfficiencyChart } from './AttackKDEfficiencyChart';
import { KillZonesByPlayerChart } from './KillZonesByPlayerChart';
import { AttackAttemptsByPositionChart } from './AttackAttemptsByPositionChart';
import { useMatch, useTeamRosters } from '../context/MatchContext';
import {
  calculateSummaryStats,
  calculateMomentum
} from '../utils/statsCalculations';
import './StatsDashboard.css';

/**
 * StatsDashboard - Main statistics dashboard component
 * Phase 3A: Summary cards and momentum indicator
 * Phase 3B: Charts and visualizations
 * Phase 3C: Advanced player-level analytics
 */
export function StatsDashboard() {
  const { currentSetData, homeTeam, opponentTeam } = useMatch();
  const { homeRoster, opponentRoster } = useTeamRosters();
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // Calculate all statistics
  const summaryStats = useMemo(() => calculateSummaryStats(currentSetData), [currentSetData]);
  const momentum = useMemo(() => calculateMomentum(currentSetData, 10), [currentSetData]);

  // Format ratio for display (e.g., "8/2" for 8 kills and 2 errors)
  const formatRatio = (success: number, error: number): string => {
    return `${success}/${error}`;
  };

  if (!homeTeam || !opponentTeam) {
    return (
      <div className="stats-dashboard">
        <div className="stats-empty">No match data available</div>
      </div>
    );
  }

  if (currentSetData.length === 0) {
    return (
      <div className="stats-dashboard">
        <div className="stats-empty">
          <p>No points recorded yet.</p>
          <p className="stats-empty-hint">Add points to see statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-dashboard">
      {/* Toggle Button for Advanced Stats */}
      <div className="stats-toggle">
        <button
          className={`toggle-btn ${showAdvancedStats ? 'active' : ''}`}
          onClick={() => setShowAdvancedStats(!showAdvancedStats)}
        >
          {showAdvancedStats ? 'Hide info.' : 'Show info.'}
        </button>
      </div>

      {/* Summary Cards Section */}
      <div className="summary-section">
        <h2 className="section-title">Match Summary</h2>
        <div className="summary-cards-grid">
          <SummaryCard
            title="Kill Ratio"
            homeValue={formatRatio(summaryStats.home.kills, summaryStats.home.killErrors)}
            opponentValue={formatRatio(summaryStats.opponent.kills, summaryStats.opponent.killErrors)}
          />
          <SummaryCard
            title="Ace Ratio"
            homeValue={formatRatio(summaryStats.home.aces, summaryStats.home.serviceErrors)}
            opponentValue={formatRatio(summaryStats.opponent.aces, summaryStats.opponent.serviceErrors)}
          />
          <SummaryCard
            title="Blocks"
            homeValue={summaryStats.home.blocks}
            opponentValue={summaryStats.opponent.blocks}
          />
          <SummaryCard
            title="Kills"
            homeValue={summaryStats.home.kills}
            opponentValue={summaryStats.opponent.kills}
          />
          <SummaryCard
            title="Aces"
            homeValue={summaryStats.home.aces}
            opponentValue={summaryStats.opponent.aces}
          />
          <SummaryCard
            title="Opp Errors"
            homeValue={summaryStats.home.opponentErrors}
            opponentValue={summaryStats.opponent.opponentErrors}
          />
        </div>
      </div>

      {/* Momentum Indicator */}
      {momentum.lastNPoints.length > 0 && (
        <MomentumIndicator
          lastPoints={momentum.lastNPoints}
          currentRun={momentum.currentRun}
          homeTeamName={homeTeam.name}
          opponentTeamName={opponentTeam.name}
        />
      )}

      {/* Charts Section - Phase 3B */}
      <div className="charts-section">
        <h2 className="section-title">Visual Analytics</h2>

        <div className="charts-grid">
          {/* Point Progression Chart */}
          <div className="chart-full-width">
            <PointProgressionChart
              points={currentSetData}
              homeTeamName={homeTeam.name}
              opponentTeamName={opponentTeam.name}
            />
          </div>

          {/* Scoring Runs and Action Breakdown */}
          <div className="chart-half-width">
            <ScoringRunsChart
              points={currentSetData}
              homeTeamName={homeTeam.name}
              opponentTeamName={opponentTeam.name}
            />
          </div>
          <div className="chart-half-width">
            <ActionBreakdownChart
              points={currentSetData}
              homeTeamName={homeTeam.name}
              opponentTeamName={opponentTeam.name}
            />
          </div>
        </div>
      </div>

      {/* Advanced Stats Section - Phase 3C */}
      {showAdvancedStats && (
        <div className="advanced-stats-section">
          <h2 className="section-title">Advanced Player Analytics</h2>

          {/* Player Hit vs Ace Ratio */}
          <div className="chart-full-width">
            <PlayerHitAceRatioChart
              points={currentSetData}
              homeRoster={homeRoster}
              opponentRoster={opponentRoster}
              homeTeamName={homeTeam.name}
              opponentTeamName={opponentTeam.name}
            />
          </div>

          {/* Attack K/D Efficiency */}
          <div className="chart-full-width">
            <AttackKDEfficiencyChart
              points={currentSetData}
              homeRoster={homeRoster}
              opponentRoster={opponentRoster}
              homeTeamName={homeTeam.name}
              opponentTeamName={opponentTeam.name}
            />
          </div>

          {/* Attack Attempts by Position */}
          <div className="teams-container">
            <AttackAttemptsByPositionChart
              points={currentSetData}
              roster={homeRoster}
              teamName={homeTeam.name}
              team="home"
            />
            <AttackAttemptsByPositionChart
              points={currentSetData}
              roster={opponentRoster}
              teamName={opponentTeam.name}
              team="opponent"
            />
          </div>

          {/* Kill Zones by Player */}
          <div className="teams-container">
            <KillZonesByPlayerChart
              points={currentSetData}
              roster={homeRoster}
              teamName={homeTeam.name}
              team="home"
            />
            <KillZonesByPlayerChart
              points={currentSetData}
              roster={opponentRoster}
              teamName={opponentTeam.name}
              team="opponent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
