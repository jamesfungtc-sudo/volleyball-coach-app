import React from 'react';
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '2px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              📊 Match Info & Summary
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '24px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Match Details Section */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              🏐 Match Details
            </h3>
            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Match ID:</strong> {matchId}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Home Team:</strong> {homeTeamName} ({homeRoster.length} players)
              </div>
              <div>
                <strong>Opponent Team:</strong> {opponentTeamName} ({opponentRoster.length} players)
              </div>
            </div>
          </section>

          {/* Current Set Progress */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              📈 Set {currentSet} Progress
            </h3>
            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#7c3aed' }}>{homeScore}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{homeTeamName}</div>
                </div>
                <div style={{ fontSize: '24px', color: '#999', display: 'flex', alignItems: 'center' }}>-</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>{opponentScore}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{opponentTeamName}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
                {pointHistoryLength} points recorded
              </div>
              {!hasRecordedPoints && !hasScore && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#92400e',
                  textAlign: 'center'
                }}>
                  ⚠️ No points recorded yet - Set has not started
                </div>
              )}
            </div>
          </section>

          {/* Rotation Configuration Status */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              🔄 Rotation Configuration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Home Team Config */}
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                border: `2px solid ${hasHomeConfig ? '#10b981' : '#ef4444'}`,
                background: hasHomeConfig ? '#f0fdf4' : '#fef2f2'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px', color: '#333' }}>
                  🏠 {homeTeamName}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {hasHomeConfig ? (
                    <>
                      <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>
                        ✅ Configured
                      </div>
                      <div>System: {homeRotationConfig.system}</div>
                      <div>Rotation: {homeRotationConfig.currentRotation}/6</div>
                      <div>Libero: {homeRotationConfig.libero ? 'Yes' : 'No'}</div>
                    </>
                  ) : (
                    <div style={{ color: '#ef4444', fontWeight: '600' }}>
                      ❌ Not Configured
                    </div>
                  )}
                </div>
              </div>

              {/* Opponent Team Config */}
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                border: `2px solid ${hasOpponentConfig ? '#10b981' : '#ef4444'}`,
                background: hasOpponentConfig ? '#f0fdf4' : '#fef2f2'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px', color: '#333' }}>
                  🔴 {opponentTeamName}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {hasOpponentConfig ? (
                    <>
                      <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>
                        ✅ Configured
                      </div>
                      <div>System: {opponentRotationConfig.system}</div>
                      <div>Rotation: {opponentRotationConfig.currentRotation}/6</div>
                      <div>Libero: {opponentRotationConfig.libero ? 'Yes' : 'No'}</div>
                    </>
                  ) : (
                    <div style={{ color: '#ef4444', fontWeight: '600' }}>
                      ❌ Not Configured
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Data Completeness Indicators */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              ✅ Data Completeness
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span>{rotationEnabled ? '✅' : '❌'}</span>
                <span>Rotation Tracking {rotationEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span>{hasHomeConfig && hasOpponentConfig ? '✅' : '❌'}</span>
                <span>Both Teams Configured</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span>{homeRoster.length > 0 ? '✅' : '❌'}</span>
                <span>Home Roster Loaded ({homeRoster.length} players)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span>{opponentRoster.length > 0 ? '✅' : '❌'}</span>
                <span>Opponent Roster Loaded ({opponentRoster.length} players)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span>{hasRecordedPoints ? '✅' : '⬜'}</span>
                <span>Points Recorded ({pointHistoryLength})</span>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <section>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#333' }}>
              ⚡ Actions
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset the rotation configuration? This will clear all player assignments for this set.')) {
                    onResetConfiguration();
                    onClose();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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
