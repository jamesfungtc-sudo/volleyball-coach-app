/**
 * RotationDrawer
 * Right-panel lineup configurator — replaces RotationConfigModal.
 *
 * Flow:
 *  1. Coach taps a court circle → parent sets activePosition
 *  2. Drawer focuses that position, shows jersey input
 *  3. Coach types jersey # → player resolved from roster (or custom)
 *  4. Auto-advances to next empty position on same team
 *  5. All 6 filled → setter chip selection
 *  6. Save & Play → buildTeamRotationConfig × 2 → onSave
 */

import { useState, useEffect, useRef } from 'react';
import type { Player } from '../../../services/googleSheetsAPI';
import type { VolleyballSystem, PlayerRole, TeamRotationConfig } from '../types/rotation.types';
import type { PlayerReference } from '../../../types/playerReference.types';
import type { VolleyballPosition } from '../types/opponentTracking.types';
import { createRosterReference, createCustomReference, getJerseyNumber, getPlayerDisplayName } from '../../../types/playerReference.types';
import {
  VOLLEYBALL_POSITIONS,
  EMPTY_POSITIONS,
  buildTeamRotationConfig,
  buildDraftPositionsFromConfig,
  getSetterPositionFromConfig,
  getDefaultLiberoTargets,
} from '../../../utils/rotationDerivation';

const SYSTEMS: VolleyballSystem[] = ['5-1 (OH>S)', '5-1 (MB>S)', '6-2', '4-2'];

export interface RotationDrawerProps {
  homeTeamName: string;
  opponentTeamName: string;
  currentSet: number;
  homeRoster: Player[];
  opponentRoster: Player[];
  initialHomeConfig?: TeamRotationConfig;
  initialOpponentConfig?: TeamRotationConfig;
  initialStartingServer?: 'home' | 'opponent';
  /** Controlled by parent: which circle was last tapped */
  activePosition: { team: 'home' | 'opponent'; position: VolleyballPosition } | null;
  /** Called whenever a position assignment changes — lets parent update config circles */
  onDraftChange: (team: 'home' | 'opponent', positions: Record<VolleyballPosition, PlayerReference | null>) => void;
  onSave: (homeConfig: TeamRotationConfig, opponentConfig: TeamRotationConfig, startingServer: 'home' | 'opponent') => void;
  onCancel: () => void;
}

export default function RotationDrawer({
  homeTeamName,
  opponentTeamName,
  currentSet,
  homeRoster,
  opponentRoster,
  initialHomeConfig,
  initialOpponentConfig,
  initialStartingServer = 'home',
  activePosition,
  onDraftChange,
  onSave,
  onCancel,
}: RotationDrawerProps) {
  // ── Draft position assignments ──────────────────────────────────────────
  const [homePositions, setHomePositions] = useState<Record<VolleyballPosition, PlayerReference | null>>(
    () => initialHomeConfig ? buildDraftPositionsFromConfig(initialHomeConfig) : { ...EMPTY_POSITIONS }
  );
  const [opponentPositions, setOpponentPositions] = useState<Record<VolleyballPosition, PlayerReference | null>>(
    () => initialOpponentConfig ? buildDraftPositionsFromConfig(initialOpponentConfig) : { ...EMPTY_POSITIONS }
  );

  // ── System selection ────────────────────────────────────────────────────
  const [homeSystem, setHomeSystem] = useState<VolleyballSystem>(
    initialHomeConfig?.system ?? '5-1 (OH>S)'
  );
  const [opponentSystem, setOpponentSystem] = useState<VolleyballSystem>(
    initialOpponentConfig?.system ?? '5-1 (OH>S)'
  );

  // ── Setter positions ────────────────────────────────────────────────────
  const [homeSetterPos, setHomeSetterPos] = useState<VolleyballPosition | null>(
    () => initialHomeConfig ? getSetterPositionFromConfig(initialHomeConfig) : null
  );
  const [opponentSetterPos, setOpponentSetterPos] = useState<VolleyballPosition | null>(
    () => initialOpponentConfig ? getSetterPositionFromConfig(initialOpponentConfig) : null
  );

  // ── Libero ──────────────────────────────────────────────────────────────
  const [homeLibero, setHomeLibero] = useState<PlayerReference | null>(initialHomeConfig?.libero ?? null);
  const [opponentLibero, setOpponentLibero] = useState<PlayerReference | null>(initialOpponentConfig?.libero ?? null);
  const [homeLiberoTargets, setHomeLiberoTargets] = useState<PlayerRole[]>(
    () => initialHomeConfig?.liberoReplacementTargets ?? getDefaultLiberoTargets(initialHomeConfig?.system ?? '5-1 (OH>S)')
  );
  const [opponentLiberoTargets, setOpponentLiberoTargets] = useState<PlayerRole[]>(
    () => initialOpponentConfig?.liberoReplacementTargets ?? getDefaultLiberoTargets(initialOpponentConfig?.system ?? '5-1 (OH>S)')
  );

  // ── Serve ────────────────────────────────────────────────────────────────
  const [startingServer, setStartingServer] = useState<'home' | 'opponent'>(initialStartingServer);

  // ── Jersey input ─────────────────────────────────────────────────────────
  const [jerseyInput, setJerseyInput] = useState('');
  const [homeLiberoInput, setHomeLiberoInput] = useState(
    initialHomeConfig?.libero ? String(getJerseyNumber(initialHomeConfig.libero)) : ''
  );
  const [opponentLiberoInput, setOpponentLiberoInput] = useState(
    initialOpponentConfig?.libero ? String(getJerseyNumber(initialOpponentConfig.libero)) : ''
  );
  const jerseyRef = useRef<HTMLInputElement>(null);

  // ── Active team (follows activePosition prop) ─────────────────────────
  const [activeTeam, setActiveTeam] = useState<'home' | 'opponent'>(
    activePosition?.team ?? 'home'
  );

  // When parent changes activePosition (circle tapped), sync drawer
  useEffect(() => {
    if (!activePosition) return;
    setActiveTeam(activePosition.team);
    const positions = activePosition.team === 'home' ? homePositions : opponentPositions;
    const ref = positions[activePosition.position];
    setJerseyInput(ref ? String(getJerseyNumber(ref)) : '');
    // Focus input after brief delay (allow re-render)
    setTimeout(() => jerseyRef.current?.focus(), 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePosition]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getPositions = (team: 'home' | 'opponent') =>
    team === 'home' ? homePositions : opponentPositions;

  const getRoster = (team: 'home' | 'opponent') =>
    team === 'home' ? homeRoster : opponentRoster;

  const resolvePlayer = (jerseyNum: number, team: 'home' | 'opponent'): PlayerReference => {
    const roster = getRoster(team);
    const found = roster.find(p => Number(p.jerseyNumber) === jerseyNum);
    return found
      ? createRosterReference(found)
      : createCustomReference(jerseyNum);
  };

  const nextEmptyPosition = (
    positions: Record<VolleyballPosition, PlayerReference | null>,
    after: VolleyballPosition
  ): VolleyballPosition | null => {
    const idx = VOLLEYBALL_POSITIONS.indexOf(after);
    for (let i = 1; i <= 6; i++) {
      const pos = VOLLEYBALL_POSITIONS[(idx + i) % 6];
      if (positions[pos] === null) return pos;
    }
    return null; // all filled
  };

  const allFilled = (positions: Record<VolleyballPosition, PlayerReference | null>) =>
    VOLLEYBALL_POSITIONS.every(p => positions[p] !== null);

  const updatePositions = (
    team: 'home' | 'opponent',
    pos: VolleyballPosition,
    ref: PlayerReference | null
  ) => {
    const setter = team === 'home' ? setHomePositions : setOpponentPositions;
    setter(prev => {
      const next = { ...prev, [pos]: ref };
      onDraftChange(team, next);
      return next;
    });
  };

  // ── Confirm jersey entry for active position ──────────────────────────
  const confirmJersey = (pos: VolleyballPosition, team: 'home' | 'opponent') => {
    const num = parseInt(jerseyInput, 10);
    if (isNaN(num) || num < 0) {
      // Clear the position
      updatePositions(team, pos, null);
      return;
    }
    const ref = resolvePlayer(num, team);
    updatePositions(team, pos, ref);

    // Auto-advance
    const currentPositions = getPositions(team);
    const next = nextEmptyPosition({ ...currentPositions, [pos]: ref }, pos);
    if (next) {
      const newRef = { ...currentPositions, [pos]: ref }[next];
      setJerseyInput(newRef ? String(getJerseyNumber(newRef)) : '');
      setTimeout(() => jerseyRef.current?.focus(), 80);
    } else {
      setJerseyInput('');
    }
  };

  // ── Libero resolution ────────────────────────────────────────────────
  const resolveLibero = (input: string, team: 'home' | 'opponent') => {
    const num = parseInt(input, 10);
    if (isNaN(num)) {
      if (team === 'home') setHomeLibero(null);
      else setOpponentLibero(null);
      return;
    }
    const ref = resolvePlayer(num, team);
    if (team === 'home') {
      setHomeLibero(ref);
      setHomeLiberoTargets(getDefaultLiberoTargets(homeSystem));
    } else {
      setOpponentLibero(ref);
      setOpponentLiberoTargets(getDefaultLiberoTargets(opponentSystem));
    }
  };

  // ── Validation ───────────────────────────────────────────────────────
  const homeValid = allFilled(homePositions) && homeSetterPos !== null;
  const opponentValid = allFilled(opponentPositions) && opponentSetterPos !== null;
  const canSave = homeValid && opponentValid;

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!canSave) return;
    const homeConfig = buildTeamRotationConfig(
      homeSystem, homePositions, homeSetterPos!, homeLibero, homeLiberoTargets
    );
    const opponentConfig = buildTeamRotationConfig(
      opponentSystem, opponentPositions, opponentSetterPos!, opponentLibero, opponentLiberoTargets
    );
    onSave(homeConfig, opponentConfig, startingServer);
  };

  // ── Colors ───────────────────────────────────────────────────────────
  const teamColor = (team: 'home' | 'opponent') => team === 'home' ? '#7c3aed' : '#ef4444';
  const teamBg    = (team: 'home' | 'opponent') => team === 'home' ? 'rgba(124,58,237,0.08)' : 'rgba(239,68,68,0.08)';

  // ── Current active context ───────────────────────────────────────────
  const activePos = activePosition?.position ?? null;
  const activePositions = getPositions(activeTeam);
  const activeRef = activePos ? activePositions[activePos] : null;
  const resolvedName = activeRef ? getPlayerDisplayName(activeRef) : null;
  const activeSetterPos = activeTeam === 'home' ? homeSetterPos : opponentSetterPos;
  // ── Progress pips ────────────────────────────────────────────────────
  const renderPips = (positions: Record<VolleyballPosition, PlayerReference | null>, team: 'home' | 'opponent') => (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
      <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', width: '32px', flexShrink: 0 }}>
        {team === 'home' ? 'HME' : 'OPP'}
      </span>
      {VOLLEYBALL_POSITIONS.map(pos => {
        const filled = positions[pos] !== null;
        const isActive = activeTeam === team && activePos === pos;
        return (
          <div
            key={pos}
            title={`${pos}: ${filled ? `#${getJerseyNumber(positions[pos]!)}` : 'empty'}`}
            style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: isActive ? teamColor(team) : filled ? '#22c55e' : 'hsl(var(--muted))',
              border: isActive ? `2px solid ${teamColor(team)}` : 'none',
              flexShrink: 0
            }}
          />
        );
      })}
      {allFilled(positions) && (activeTeam === team ? activeSetterPos : (team === 'home' ? homeSetterPos : opponentSetterPos)) && (
        <span style={{ fontSize: '10px', color: '#22c55e', marginLeft: '2px' }}>✓</span>
      )}
    </div>
  );

  // ── Jersey input section ──────────────────────────────────────────────
  const renderJerseySection = () => {
    if (!activePos) return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'hsl(var(--muted-foreground))', fontSize: '13px' }}>
        Tap a player circle on the court to configure that position
      </div>
    );

    return (
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Position label */}
        <div style={{ fontSize: '11px', fontWeight: '700', color: teamColor(activeTeam), textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {activePos} · {activeTeam === 'home' ? homeTeamName : opponentTeamName}
        </div>

        {/* Jersey input */}
        <div style={{ position: 'relative' }}>
          <input
            ref={jerseyRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Jersey #"
            value={jerseyInput}
            onChange={e => setJerseyInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && activePos) confirmJersey(activePos, activeTeam);
            }}
            onBlur={() => { if (activePos) confirmJersey(activePos, activeTeam); }}
            style={{
              width: '100%', padding: '14px 16px',
              fontSize: '28px', fontWeight: '700',
              border: `2px solid ${teamColor(activeTeam)}`,
              borderRadius: '10px',
              background: teamBg(activeTeam),
              color: 'hsl(var(--foreground))',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Resolved name */}
        <div style={{ fontSize: '14px', fontWeight: '600', minHeight: '20px', color: resolvedName ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
          {resolvedName || (jerseyInput ? `Custom #${jerseyInput}` : '—')}
        </div>

        {/* Quick roster suggestions */}
        {jerseyInput && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {getRoster(activeTeam)
              .filter(p => String(p.jerseyNumber).startsWith(jerseyInput))
              .slice(0, 5)
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setJerseyInput(String(p.jerseyNumber));
                    if (activePos) {
                      const ref = createRosterReference(p);
                      updatePositions(activeTeam, activePos, ref);
                      const next = nextEmptyPosition({ ...activePositions, [activePos]: ref }, activePos);
                      setJerseyInput(next && activePositions[next] ? String(getJerseyNumber(activePositions[next]!)) : '');
                      setTimeout(() => jerseyRef.current?.focus(), 80);
                    }
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: '99px',
                    border: `1px solid ${teamColor(activeTeam)}`,
                    background: teamBg(activeTeam),
                    fontSize: '12px', fontWeight: '600',
                    color: teamColor(activeTeam), cursor: 'pointer'
                  }}
                >
                  #{p.jerseyNumber} {p.name}
                </button>
              ))
            }
          </div>
        )}
      </div>
    );
  };

  // ── Setter section (shown after all 6 positions filled for a team) ───
  const renderSetterSection = (team: 'home' | 'opponent') => {
    const positions = getPositions(team);
    if (!allFilled(positions)) return null;
    const setterPos = team === 'home' ? homeSetterPos : opponentSetterPos;
    const setPos = team === 'home' ? setHomeSetterPos : setOpponentSetterPos;

    return (
      <div style={{ padding: '10px 16px', borderTop: '1px solid hsl(var(--border))' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: teamColor(team), textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          {team === 'home' ? homeTeamName : opponentTeamName} — Who is the setter?
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {VOLLEYBALL_POSITIONS.map(pos => {
            const ref = positions[pos];
            if (!ref) return null;
            const isSelected = setterPos === pos;
            const jersey = getJerseyNumber(ref);
            const name = getPlayerDisplayName(ref);
            return (
              <button
                key={pos}
                onClick={() => setPos(isSelected ? null : pos)}
                style={{
                  padding: '8px 12px', borderRadius: '8px',
                  border: `2px solid ${isSelected ? teamColor(team) : 'hsl(var(--border))'}`,
                  background: isSelected ? teamColor(team) : 'hsl(var(--card))',
                  color: isSelected ? 'white' : 'hsl(var(--foreground))',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px'
                }}
              >
                <span>#{jersey}</span>
                <span style={{ fontSize: '10px', fontWeight: '400', opacity: 0.8 }}>{name}</span>
                <span style={{ fontSize: '9px', opacity: 0.6 }}>{pos}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Libero section ────────────────────────────────────────────────────
  const renderLiberoSection = (team: 'home' | 'opponent') => {
    const liberoInput = team === 'home' ? homeLiberoInput : opponentLiberoInput;
    const setLiberoInput = team === 'home' ? setHomeLiberoInput : setOpponentLiberoInput;
    const libero = team === 'home' ? homeLibero : opponentLibero;
    const targets = team === 'home' ? homeLiberoTargets : opponentLiberoTargets;
    const setTargets = team === 'home' ? setHomeLiberoTargets : setOpponentLiberoTargets;
    const system = team === 'home' ? homeSystem : opponentSystem;

    // Available roles for libero targets (MB-type roles only)
    const SYSTEM_ROLES_MAP: Record<string, string[]> = {
      '5-1 (OH>S)': ['S', 'OH (w.s)', 'MB', 'Oppo', 'OH', 'MB (w.s)'],
      '5-1 (MB>S)': ['S', 'MB (w.s)', 'OH', 'Oppo', 'MB', 'OH (w.s)'],
      '4-2':        ['S1', 'OH1', 'MB1', 'S2', 'OH2', 'MB2'],
      '6-2':        ['S1/OPP1', 'MB1', 'OH1', 'S2/OPP2', 'MB2', 'OH2'],
    };
    const allRoles = SYSTEM_ROLES_MAP[system] as PlayerRole[];

    return (
      <div style={{ padding: '10px 16px', borderTop: '1px solid hsl(var(--border))' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          {team === 'home' ? homeTeamName : opponentTeamName} — Libero (optional)
        </div>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Jersey #"
          value={liberoInput}
          onChange={e => setLiberoInput(e.target.value)}
          onBlur={() => resolveLibero(liberoInput, team)}
          style={{
            width: '100%', padding: '10px 14px',
            fontSize: '18px', fontWeight: '600',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            background: 'rgba(245,158,11,0.08)',
            outline: 'none', boxSizing: 'border-box',
            marginBottom: '8px'
          }}
        />
        {libero && (
          <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px' }}>
            #{getJerseyNumber(libero)} {getPlayerDisplayName(libero)}
          </div>
        )}
        {libero && (
          <div>
            <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}>Replaces:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {allRoles.map(role => {
                const checked = targets.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => setTargets(prev =>
                      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                    )}
                    style={{
                      padding: '3px 8px', borderRadius: '99px', fontSize: '11px',
                      border: `1px solid ${checked ? '#f59e0b' : 'hsl(var(--border))'}`,
                      background: checked ? '#fef3c7' : 'transparent',
                      color: checked ? '#92400e' : 'hsl(var(--muted-foreground))',
                      cursor: 'pointer', fontWeight: checked ? '600' : '400'
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop — tap to cancel */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1499,
          touchAction: 'none'
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width: '380px', maxWidth: '90vw',
        display: 'flex', flexDirection: 'column',
        background: 'hsl(var(--card))',
        borderLeft: '2px solid hsl(var(--border))',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
        zIndex: 1500,
        overflow: 'hidden'
      }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid hsl(var(--border))',
        background: 'hsl(var(--muted))',
        display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '700' }}>
            Set {currentSet} Lineup
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* System selectors */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '600' }}>H:</span>
            <select
              value={homeSystem}
              onChange={e => setHomeSystem(e.target.value as VolleyballSystem)}
              style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #c4b5fd', background: 'white' }}
            >
              {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>O:</span>
            <select
              value={opponentSystem}
              onChange={e => setOpponentSystem(e.target.value as VolleyballSystem)}
              style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #fecaca', background: 'white' }}
            >
              {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Serve first */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>Serves first:</span>
          {(['home', 'opponent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setStartingServer(t)}
              style={{
                padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                border: `2px solid ${startingServer === t ? teamColor(t) : 'hsl(var(--border))'}`,
                background: startingServer === t ? teamColor(t) : 'transparent',
                color: startingServer === t ? 'white' : 'hsl(var(--muted-foreground))',
                cursor: 'pointer'
              }}
            >
              {t === 'home' ? homeTeamName : opponentTeamName}
            </button>
          ))}
        </div>

        {/* Progress pips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {renderPips(homePositions, 'home')}
          {renderPips(opponentPositions, 'opponent')}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Jersey entry for active position */}
        {renderJerseySection()}

        {/* Setter selection — home */}
        {renderSetterSection('home')}

        {/* Setter selection — opponent */}
        {renderSetterSection('opponent')}

        {/* Libero — home */}
        {renderLiberoSection('home')}

        {/* Libero — opponent */}
        {renderLiberoSection('opponent')}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 14px', borderTop: '1px solid hsl(var(--border))',
        display: 'flex', gap: '8px', flexShrink: 0
      }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '11px',
            border: '2px solid hsl(var(--border))', borderRadius: '8px',
            background: 'hsl(var(--card))', fontWeight: '600', fontSize: '14px', cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2, padding: '11px',
            background: canSave ? '#7c3aed' : 'hsl(var(--muted))',
            color: canSave ? 'white' : 'hsl(var(--muted-foreground))',
            border: 'none', borderRadius: '8px',
            fontWeight: '700', fontSize: '14px',
            cursor: canSave ? 'pointer' : 'not-allowed'
          }}
        >
          {canSave ? 'Save & Play →' : `Fill all positions + select setters`}
        </button>
      </div>
      </div>
    </>
  );
}
