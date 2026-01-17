import React from 'react';
import type { TeamRotationConfig } from '../types/rotation.types';
import type { Player } from '../../../services/googleSheetsAPI';

interface MatchInfoModalProps {
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
  rotationEnabled,
  onResetConfiguration
}: MatchInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
            📊 Match Info & Summary
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        {/* Match Details */}
        <div style={{
          background: '#f9fafb',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
            Match Details
          </h3>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Match ID:</strong> {matchId}</div>
            <div><strong>Home Team:</strong> {homeTeamName}</div>
            <div><strong>Opponent:</strong> {opponentTeamName}</div>
            <div><strong>Current Set:</strong> {currentSet}</div>
          </div>
        </div>

        {/* Score Summary */}
        <div style={{
          background: '#f0fdf4',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#166534' }}>
            Current Score
          </h3>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            <span style={{ color: '#7c3aed' }}>{homeScore}</span>
            <span style={{ color: '#999' }}>-</span>
            <span style={{ color: '#ef4444' }}>{opponentScore}</span>
          </div>
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#666',
            marginTop: '8px'
          }}>
            {pointHistoryLength} points played
          </div>
        </div>

        {/* Rotation Info */}
        {rotationEnabled && (
          <div style={{
            background: '#ede9fe',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#5b21b6' }}>
              Rotation Status
            </h3>
            <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
              {homeRotationConfig && (
                <div>
                  <strong>Home:</strong> Rotation {homeRotationConfig.currentRotation} ({homeRotationConfig.system})
                </div>
              )}
              {opponentRotationConfig && (
                <div>
                  <strong>Opponent:</strong> Rotation {opponentRotationConfig.currentRotation} ({opponentRotationConfig.system})
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              background: '#f3f4f6',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          {rotationEnabled && (
            <button
              onClick={() => {
                if (window.confirm('This will reset all rotation configuration. Are you sure?')) {
                  onResetConfiguration();
                  onClose();
                }
              }}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                fontWeight: '600',
                background: '#fee2e2',
                color: '#991b1b',
                border: '2px solid #fecaca',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Reset Rotation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
