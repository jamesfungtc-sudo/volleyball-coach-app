import React from 'react';
import { cn } from '@/lib/utils';
import type { TeamRotationConfig } from '../types/rotation.types';
import type { Player } from '../../../services/googleSheetsAPI';

export interface MatchInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  homeTeamName: string;
  opponentTeamName: string;
  currentSet: number;
  homeScore: number;
  opponentScore: number;
  pointHistoryLength: number;
  homeRotationConfig: TeamRotationConfig | null;
  opponentRotationConfig: TeamRotationConfig | null;
  homeRoster: Player[];
  opponentRoster: Player[];
  rotationEnabled: boolean;
  onResetConfiguration: () => void;
}

/**
 * MatchInfoModal - Displays comprehensive match information and status
 *
 * Shows:
 * - Match details (ID, teams)
 * - Current set progress (score, points recorded)
 * - Rotation configuration status
 * - Player lineups
 * - Data completeness indicators
 * - Action buttons (reset config, etc.)
 */
export function MatchInfoModal({
  isOpen,
  onClose,
  matchId,
  homeTeamName,
  opponentTeamName,
  currentSet,
  homeScore,
  opponentScore,
  pointHistoryLength,
  homeRotationConfig,
  opponentRotationConfig,
  homeRoster,
  opponentRoster,
  rotationEnabled,
  onResetConfiguration
}: MatchInfoModalProps) {
  if (!isOpen) return null;

  // Calculate data completeness
  const hasHomeConfig = homeRotationConfig !== null;
  const hasOpponentConfig = opponentRotationConfig !== null;
  const hasRecordedPoints = pointHistoryLength > 0;
  const hasScore = homeScore > 0 || opponentScore > 0;

  const sectionHeading = 'm-0 mb-3 text-lg font-bold text-foreground';
  const sectionCard = 'bg-secondary/50 p-4 rounded-lg border border-border';

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl w-[90%] max-w-[700px] max-h-[85vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 border-b border-border rounded-t-xl text-white"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="flex justify-between items-center">
            <h2 className="m-0 text-2xl font-bold">📊 Match Info & Summary</h2>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 border-none rounded-md text-white text-2xl w-9 h-9 cursor-pointer transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Match Details Section */}
          <section className="mb-6">
            <h3 className={sectionHeading}>🏐 Match Details</h3>
            <div className={sectionCard}>
              <div className="mb-2 text-foreground">
                <strong>Match ID:</strong> {matchId}
              </div>
              <div className="mb-2 text-foreground">
                <strong>Home Team:</strong> {homeTeamName} ({homeRoster.length} players)
              </div>
              <div className="text-foreground">
                <strong>Opponent Team:</strong> {opponentTeamName} ({opponentRoster.length} players)
              </div>
            </div>
          </section>

          {/* Current Set Progress */}
          <section className="mb-6">
            <h3 className={sectionHeading}>📈 Set {currentSet} Progress</h3>
            <div className={sectionCard}>
              <div className="flex justify-around mb-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-violet-400">{homeScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">{homeTeamName}</div>
                </div>
                <div className="text-2xl text-muted-foreground flex items-center">-</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">{opponentScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">{opponentTeamName}</div>
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {pointHistoryLength} points recorded
              </div>
              {!hasRecordedPoints && !hasScore && (
                <div className="mt-3 p-2 bg-amber-500/15 border border-amber-500/40 rounded-md text-sm text-amber-300 text-center">
                  ⚠️ No points recorded yet - Set has not started
                </div>
              )}
            </div>
          </section>

          {/* Rotation Configuration Status */}
          <section className="mb-6">
            <h3 className={sectionHeading}>🔄 Rotation Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Home Team Config */}
              <div
                className={cn(
                  'p-4 rounded-lg border-2',
                  hasHomeConfig
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-destructive/60 bg-destructive/10'
                )}
              >
                <div className="font-bold mb-2 text-foreground">🏠 {homeTeamName}</div>
                <div className="text-sm text-muted-foreground">
                  {hasHomeConfig ? (
                    <>
                      <div className="text-emerald-400 font-semibold mb-1">✅ Configured</div>
                      <div>System: {homeRotationConfig.system}</div>
                      <div>Rotation: {homeRotationConfig.currentRotation}/6</div>
                      <div>Libero: {homeRotationConfig.libero ? 'Yes' : 'No'}</div>
                    </>
                  ) : (
                    <div className="text-red-400 font-semibold">❌ Not Configured</div>
                  )}
                </div>
              </div>

              {/* Opponent Team Config */}
              <div
                className={cn(
                  'p-4 rounded-lg border-2',
                  hasOpponentConfig
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-destructive/60 bg-destructive/10'
                )}
              >
                <div className="font-bold mb-2 text-foreground">🔴 {opponentTeamName}</div>
                <div className="text-sm text-muted-foreground">
                  {hasOpponentConfig ? (
                    <>
                      <div className="text-emerald-400 font-semibold mb-1">✅ Configured</div>
                      <div>System: {opponentRotationConfig.system}</div>
                      <div>Rotation: {opponentRotationConfig.currentRotation}/6</div>
                      <div>Libero: {opponentRotationConfig.libero ? 'Yes' : 'No'}</div>
                    </>
                  ) : (
                    <div className="text-red-400 font-semibold">❌ Not Configured</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Data Completeness Indicators */}
          <section className="mb-6">
            <h3 className={sectionHeading}>✅ Data Completeness</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>{rotationEnabled ? '✅' : '❌'}</span>
                <span>Rotation Tracking {rotationEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>{hasHomeConfig && hasOpponentConfig ? '✅' : '❌'}</span>
                <span>Both Teams Configured</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>{homeRoster.length > 0 ? '✅' : '❌'}</span>
                <span>Home Roster Loaded ({homeRoster.length} players)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>{opponentRoster.length > 0 ? '✅' : '❌'}</span>
                <span>Opponent Roster Loaded ({opponentRoster.length} players)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <span>{hasRecordedPoints ? '✅' : '⬜'}</span>
                <span>Points Recorded ({pointHistoryLength})</span>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <section>
            <h3 className={sectionHeading}>⚡ Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset the rotation configuration? This will clear all player assignments for this set.')) {
                    onResetConfiguration();
                    onClose();
                  }
                }}
                className="flex-1 px-5 py-3 text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
              >
                🔄 Reset Configuration
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
