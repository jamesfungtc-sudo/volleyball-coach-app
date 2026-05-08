/**
 * SubstitutionModal
 * Two-step flow: pick who goes OUT → pick who comes IN → confirm.
 * Libero players are excluded (they have their own swap system).
 */

import { useState } from 'react';
import type { TeamLineup, PlayerInPosition } from '../types/rotation.types';
import type { Player } from '../../../services/googleSheetsAPI';
import type { VolleyballPosition } from '../types/opponentTracking.types';
import type { Substitution } from '../types/substitution.types';
import { MAX_SUBSTITUTIONS } from '../types/substitution.types';
import { getJerseyNumber, getPlayerDisplayName } from '../../../types/playerReference.types';

interface SubstitutionModalProps {
  isOpen: boolean;
  team: 'home' | 'opponent';
  teamName: string;
  lineup: TeamLineup;
  roster: Player[];
  subsUsed: number;
  /** Full substitution history for this team this set — used to enforce pair locking */
  subHistory: Substitution[];
  onConfirm: (
    subOut: PlayerInPosition,
    subIn: Player,
    courtPosition: VolleyballPosition
  ) => void;
  onClose: () => void;
}

const POSITION_ORDER: VolleyballPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

export default function SubstitutionModal({
  isOpen,
  team,
  teamName,
  lineup,
  roster,
  subsUsed,
  subHistory,
  onConfirm,
  onClose
}: SubstitutionModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedOut, setSelectedOut] = useState<PlayerInPosition | null>(null);
  const [selectedOutPos, setSelectedOutPos] = useState<VolleyballPosition | null>(null);
  const [selectedIn, setSelectedIn] = useState<Player | null>(null);

  if (!isOpen) return null;

  const teamColor = team === 'home' ? '#7c3aed' : '#ef4444';
  const teamBg   = team === 'home' ? 'rgba(124,58,237,0.08)' : 'rgba(239,68,68,0.08)';
  const teamBorder = team === 'home' ? '#c4b5fd' : '#fecaca';

  const subsRemaining = MAX_SUBSTITUTIONS - subsUsed;
  const atLimit = subsUsed >= MAX_SUBSTITUTIONS;

  // On-court players (non-libero)
  const onCourtPlayers: Array<{ pos: VolleyballPosition; player: PlayerInPosition }> =
    POSITION_ORDER
      .map(pos => ({ pos, player: lineup[pos]! }))
      .filter(({ player }) => player && !player.isLibero);

  // Jersey numbers currently on court (to exclude from bench list)
  const onCourtJerseys = new Set(
    POSITION_ORDER
      .map(pos => lineup[pos])
      .filter(Boolean)
      .map(p => Number(getJerseyNumber(p!.reference)))
  );

  // Bench = roster players not on court
  const benchPlayers = roster.filter(
    p => !onCourtJerseys.has(Number(p.jerseyNumber))
  );

  /**
   * Pair map: every completed substitution creates a locked A↔B pair.
   * Key = jersey number, Value = the jersey of their paired player.
   * e.g. if #7 subbed out for #12: pairs.get(7) === 12, pairs.get(12) === 7.
   */
  const pairMap = new Map<number, number>();
  subHistory.forEach(s => {
    pairMap.set(s.subOutJersey, s.subInJersey);
    pairMap.set(s.subInJersey, s.subOutJersey);
  });

  /**
   * Given the player going OUT, compute which bench players are actually
   * eligible to come in:
   *   - If outgoing player has a pair → only their pair partner can come in
   *   - Otherwise (original starter with no pair) → only "free" bench players
   *     (bench players who don't already have a pair assigned)
   */
  function getEligibleBench(outJersey: number): { players: Player[]; isPairReturn: boolean } {
    const pairedJersey = pairMap.get(outJersey);
    if (pairedJersey !== undefined) {
      // Locked pair: only the specific partner can return
      const partner = benchPlayers.filter(p => Number(p.jerseyNumber) === pairedJersey);
      return { players: partner, isPairReturn: true };
    }
    // Free starter: only bench players who don't have an existing pair
    const free = benchPlayers.filter(p => !pairMap.has(Number(p.jerseyNumber)));
    return { players: free, isPairReturn: false };
  }

  function handleSelectOut(pos: VolleyballPosition, player: PlayerInPosition) {
    setSelectedOut(player);
    setSelectedOutPos(pos);
    setSelectedIn(null);
    setStep(2);
  }

  function handleConfirm() {
    if (!selectedOut || !selectedIn || !selectedOutPos) return;
    onConfirm(selectedOut, selectedIn, selectedOutPos);
    handleClose();
  }

  function handleClose() {
    setStep(1);
    setSelectedOut(null);
    setSelectedOutPos(null);
    setSelectedIn(null);
    onClose();
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px'
  };

  const modalStyle: React.CSSProperties = {
    background: 'hsl(var(--card))',
    border: `2px solid ${teamBorder}`,
    borderRadius: '12px',
    width: '100%', maxWidth: '400px',
    maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  };

  const headerStyle: React.CSSProperties = {
    padding: '14px 16px',
    background: teamBg,
    borderBottom: `1px solid ${teamBorder}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  };

  const playerCardBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '2px solid hsl(var(--border))',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: 'hsl(var(--card))'
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: teamColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {teamName} — Substitution
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px' }}>
              {step === 1 ? 'Who leaves the court?' : 'Who comes in?'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontSize: '11px', fontWeight: '700',
              color: atLimit ? '#dc2626' : subsRemaining <= 2 ? '#d97706' : '#16a34a',
              background: atLimit ? '#fee2e2' : subsRemaining <= 2 ? '#fef3c7' : '#dcfce7',
              padding: '3px 8px', borderRadius: '99px'
            }}>
              {subsUsed}/{MAX_SUBSTITUTIONS} subs
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Sub limit warning */}
        {atLimit && (
          <div style={{ padding: '10px 16px', background: '#fee2e2', color: '#dc2626', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
            ⚠️ Maximum substitutions ({MAX_SUBSTITUTIONS}) reached for this set
          </div>
        )}

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid hsl(var(--border))' }}>
          {(['OUT', 'IN'] as const).map((label, i) => (
            <div key={label} style={{
              flex: 1, padding: '8px', textAlign: 'center',
              fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em',
              color: step === i + 1 ? teamColor : 'hsl(var(--muted-foreground))',
              borderBottom: step === i + 1 ? `2px solid ${teamColor}` : '2px solid transparent',
              background: step === i + 1 ? teamBg : 'transparent'
            }}>
              {i + 1}. PLAYER {label}
              {i === 0 && selectedOut && (
                <span style={{ marginLeft: '4px', color: teamColor }}>
                  ✓ #{getJerseyNumber(selectedOut.reference)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

          {/* Step 1: Select player going OUT */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onCourtPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '24px', fontSize: '13px' }}>
                  No players on court
                </div>
              ) : onCourtPlayers.map(({ pos, player }) => {
                const jersey = getJerseyNumber(player.reference);
                const name   = getPlayerDisplayName(player.reference);
                return (
                  <button
                    key={pos}
                    style={{
                      ...playerCardBase,
                      opacity: atLimit ? 0.5 : 1,
                      cursor: atLimit ? 'not-allowed' : 'pointer'
                    }}
                    disabled={atLimit}
                    onClick={() => handleSelectOut(pos, player)}
                    onMouseOver={e => { if (!atLimit) (e.currentTarget as HTMLElement).style.borderColor = teamColor; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: teamColor, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700', flexShrink: 0
                    }}>
                      {jersey}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{name || `#${jersey}`}</div>
                      <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
                        {player.roleInSystem} · {pos}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>→ OUT</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Select player coming IN */}
          {step === 2 && (() => {
            const outJersey = selectedOut ? Number(getJerseyNumber(selectedOut.reference)) : -1;
            const { players: eligibleBench, isPairReturn } = selectedOut
              ? getEligibleBench(outJersey)
              : { players: benchPlayers, isPairReturn: false };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Sub out summary */}
                {selectedOut && (
                  <div style={{
                    padding: '8px 12px', borderRadius: '6px',
                    background: teamBg, border: `1px solid ${teamBorder}`,
                    fontSize: '12px', color: teamColor, fontWeight: '600', marginBottom: '4px'
                  }}>
                    Replacing #{getJerseyNumber(selectedOut.reference)} {getPlayerDisplayName(selectedOut.reference)} ({selectedOut.roleInSystem} · {selectedOutPos})
                  </div>
                )}

                {/* Pair-return notice */}
                {isPairReturn && (
                  <div style={{
                    padding: '8px 12px', borderRadius: '6px',
                    background: '#fef3c7', border: '1px solid #fbbf24',
                    fontSize: '12px', color: '#92400e', fontWeight: '600'
                  }}>
                    🔒 Pair lock — only the original substitute can return
                  </div>
                )}

                {eligibleBench.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '24px', fontSize: '13px' }}>
                    {isPairReturn
                      ? 'Paired player is not on the bench'
                      : 'No eligible bench players available'}
                  </div>
                ) : eligibleBench.map(player => {
                  const isSelected = selectedIn?.id === player.id;
                  return (
                    <button
                      key={player.id}
                      style={{
                        ...playerCardBase,
                        borderColor: isSelected ? teamColor : 'hsl(var(--border))',
                        background: isSelected ? teamBg : 'hsl(var(--card))'
                      }}
                      onClick={() => setSelectedIn(player)}
                      onMouseOver={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = teamColor; }}
                      onMouseOut={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'hsl(var(--border))'; }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: isSelected ? teamColor : 'hsl(var(--muted))',
                        color: isSelected ? 'white' : 'hsl(var(--foreground))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: '700', flexShrink: 0,
                        transition: 'all 0.15s'
                      }}>
                        {player.jerseyNumber}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{player.name || `#${player.jerseyNumber}`}</div>
                        <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
                          {player.position} · {isPairReturn ? 'paired return' : 'bench'}
                        </div>
                      </div>
                      {isSelected && <div style={{ fontSize: '16px' }}>✓</div>}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid hsl(var(--border))',
          display: 'flex', gap: '8px'
        }}>
          {step === 2 ? (
            <>
              <button
                onClick={() => { setStep(1); setSelectedIn(null); }}
                style={{
                  flex: 1, padding: '10px',
                  border: '2px solid hsl(var(--border))',
                  borderRadius: '8px', background: 'hsl(var(--card))',
                  fontWeight: '600', fontSize: '14px', cursor: 'pointer'
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedIn}
                style={{
                  flex: 2, padding: '10px',
                  background: selectedIn ? teamColor : 'hsl(var(--muted))',
                  color: selectedIn ? 'white' : 'hsl(var(--muted-foreground))',
                  border: 'none', borderRadius: '8px',
                  fontWeight: '700', fontSize: '14px',
                  cursor: selectedIn ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Substitution
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              style={{
                flex: 1, padding: '10px',
                border: '2px solid hsl(var(--border))',
                borderRadius: '8px', background: 'hsl(var(--card))',
                fontWeight: '600', fontSize: '14px', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
