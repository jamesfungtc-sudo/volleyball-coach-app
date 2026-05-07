import { useState, useEffect, useCallback } from 'react';
import PageLayout from '../components/layout/PageLayout';
import {
  getTeams,
  getPlayers,
  createTeam,
  updateTeam,
  deleteTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '../services/googleSheetsAPI';

const POSITIONS = ['OH', 'MB', 'S', 'L', 'OPP', 'DS'];

function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // UI state
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [addingToTeamId, setAddingToTeamId] = useState(null);
  const [newPlayer, setNewPlayer] = useState(emptyPlayer());

  function emptyPlayer() {
    return { preferredName: '', jerseyNumber: '', mainPosition: 'OH', secondaryPosition: '' };
  }

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTeams();
      setTeams(data);
    } catch (err) {
      setError('Failed to load teams. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  async function loadPlayersForTeam(teamId) {
    if (players[teamId]) return;
    try {
      const all = await getPlayers();
      const teamPlayers = all.filter(p => p.TeamId === teamId);
      setPlayers(prev => ({ ...prev, [teamId]: teamPlayers }));
    } catch {
      setPlayers(prev => ({ ...prev, [teamId]: [] }));
    }
  }

  function toggleExpand(teamId) {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      loadPlayersForTeam(teamId);
    }
    setEditingPlayerId(null);
    setAddingToTeamId(null);
  }

  // ── Add Team ──────────────────────────────────────────────────────────────

  async function handleAddTeam() {
    const name = newTeamName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const { teamId } = await createTeam(name);
      setTeams(prev => [...prev, { Id: teamId, Name: name }]);
      setNewTeamName('');
      setShowAddTeam(false);
    } catch (err) {
      setError(`Failed to create team: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Edit Team ─────────────────────────────────────────────────────────────

  function startEditTeam(team) {
    setEditingTeamId(team.Id);
    setEditingTeamName(team.Name);
  }

  async function handleUpdateTeam(teamId) {
    const name = editingTeamName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await updateTeam(teamId, name);
      setTeams(prev => prev.map(t => t.Id === teamId ? { ...t, Name: name } : t));
      setEditingTeamId(null);
    } catch (err) {
      setError(`Failed to update team: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete Team ───────────────────────────────────────────────────────────

  async function handleDeleteTeam(team) {
    if (!confirm(`Delete team "${team.Name}"? This will not affect existing matches.`)) return;
    setSaving(true);
    try {
      await deleteTeam(team.Id);
      setTeams(prev => prev.filter(t => t.Id !== team.Id));
      if (expandedTeamId === team.Id) setExpandedTeamId(null);
    } catch (err) {
      setError(`Failed to delete team: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Add Player ────────────────────────────────────────────────────────────

  function startAddPlayer(teamId) {
    setAddingToTeamId(teamId);
    setNewPlayer(emptyPlayer());
    setEditingPlayerId(null);
  }

  async function handleAddPlayer(teamId) {
    const name = newPlayer.preferredName.trim();
    const jersey = parseInt(newPlayer.jerseyNumber, 10);
    if (!name || !jersey || jersey < 1 || jersey > 99) return;
    setSaving(true);
    try {
      const { playerId } = await createPlayer({
        preferredName: name,
        jerseyNumber: jersey,
        mainPosition: newPlayer.mainPosition,
        secondaryPosition: newPlayer.secondaryPosition,
        teamId,
      });
      const created = {
        Id: playerId,
        PreferredName: name,
        JerseyNumber: jersey,
        MainPosition: newPlayer.mainPosition,
        SecondaryPosition: newPlayer.secondaryPosition,
        TeamId: teamId,
      };
      setPlayers(prev => ({ ...prev, [teamId]: [...(prev[teamId] || []), created] }));
      setAddingToTeamId(null);
    } catch (err) {
      setError(`Failed to add player: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Edit Player ───────────────────────────────────────────────────────────

  function startEditPlayer(player) {
    setEditingPlayerId(player.Id);
    setEditingPlayer({
      preferredName: player.PreferredName || '',
      jerseyNumber: String(player.JerseyNumber || ''),
      mainPosition: player.MainPosition || 'OH',
      secondaryPosition: player.SecondaryPosition || '',
    });
    setAddingToTeamId(null);
  }

  async function handleUpdatePlayer(teamId, playerId) {
    const name = editingPlayer.preferredName.trim();
    const jersey = parseInt(editingPlayer.jerseyNumber, 10);
    if (!name || !jersey || jersey < 1 || jersey > 99) return;
    setSaving(true);
    try {
      await updatePlayer(playerId, {
        preferredName: name,
        jerseyNumber: jersey,
        mainPosition: editingPlayer.mainPosition,
        secondaryPosition: editingPlayer.secondaryPosition,
      });
      setPlayers(prev => ({
        ...prev,
        [teamId]: (prev[teamId] || []).map(p =>
          p.Id === playerId
            ? { ...p, PreferredName: name, JerseyNumber: jersey, MainPosition: editingPlayer.mainPosition, SecondaryPosition: editingPlayer.secondaryPosition }
            : p
        ),
      }));
      setEditingPlayerId(null);
    } catch (err) {
      setError(`Failed to update player: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete Player ─────────────────────────────────────────────────────────

  async function handleDeletePlayer(teamId, player) {
    if (!confirm(`Remove ${player.PreferredName || 'this player'} (#${player.JerseyNumber}) from the roster?`)) return;
    setSaving(true);
    try {
      await deletePlayer(player.Id);
      setPlayers(prev => ({
        ...prev,
        [teamId]: (prev[teamId] || []).filter(p => p.Id !== player.Id),
      }));
    } catch (err) {
      setError(`Failed to delete player: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageLayout title="Team Management">
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading teams...</span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Team Management"
      subtitle="Manage team rosters and player profiles"
    >
      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-destructive/60 hover:text-destructive">✕</button>
        </div>
      )}

      {/* Add Team button / form */}
      {showAddTeam ? (
        <div className="flex gap-2 items-center p-4 bg-card border border-border rounded-xl">
          <input
            autoFocus
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddTeam(); if (e.key === 'Escape') setShowAddTeam(false); }}
            placeholder="Team name"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAddTeam}
            disabled={saving || !newTeamName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => { setShowAddTeam(false); setNewTeamName(''); }}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddTeam(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Add Team
          </button>
        </div>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-lg font-medium mb-2">No teams yet</p>
          <p className="text-sm">Click "Add Team" to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map(team => {
            const isExpanded = expandedTeamId === team.Id;
            const teamPlayers = players[team.Id] || [];
            const isEditingTeam = editingTeamId === team.Id;
            const playerCount = players[team.Id] ? teamPlayers.length : null;

            return (
              <div key={team.Id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Team header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpand(team.Id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    {isEditingTeam ? null : (
                      <span className="font-semibold text-foreground">{team.Name}</span>
                    )}
                    {playerCount !== null && !isEditingTeam && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {playerCount} {playerCount === 1 ? 'player' : 'players'}
                      </span>
                    )}
                  </button>

                  {isEditingTeam ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editingTeamName}
                        onChange={e => setEditingTeamName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateTeam(team.Id); if (e.key === 'Escape') setEditingTeamId(null); }}
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleUpdateTeam(team.Id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTeamId(null)}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditTeam(team)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                        title="Rename team"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        disabled={saving}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        title="Delete team"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {/* Roster (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {teamPlayers.length === 0 && addingToTeamId !== team.Id && (
                      <div className="px-4 py-3 text-sm text-muted-foreground italic">No players yet</div>
                    )}

                    {teamPlayers.map(player => (
                      <div key={player.Id} className="border-b border-border/50 last:border-0">
                        {editingPlayerId === player.Id ? (
                          // Inline edit form
                          <div className="px-4 py-3 flex flex-wrap gap-2 items-center bg-muted/30">
                            <input
                              autoFocus
                              type="text"
                              value={editingPlayer.preferredName}
                              onChange={e => setEditingPlayer(p => ({ ...p, preferredName: e.target.value }))}
                              placeholder="Name"
                              className="w-36 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={editingPlayer.jerseyNumber}
                              onChange={e => setEditingPlayer(p => ({ ...p, jerseyNumber: e.target.value }))}
                              placeholder="#"
                              className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <select
                              value={editingPlayer.mainPosition}
                              onChange={e => setEditingPlayer(p => ({ ...p, mainPosition: e.target.value }))}
                              className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                            </select>
                            <select
                              value={editingPlayer.secondaryPosition}
                              onChange={e => setEditingPlayer(p => ({ ...p, secondaryPosition: e.target.value }))}
                              className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">2nd pos (optional)</option>
                              {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                            </select>
                            <button
                              onClick={() => handleUpdatePlayer(team.Id, player.Id)}
                              disabled={saving}
                              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPlayerId(null)}
                              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          // Player row
                          <div className="px-4 py-2.5 flex items-center gap-3">
                            <span className="w-8 text-center font-mono text-sm font-semibold text-muted-foreground">
                              #{player.JerseyNumber}
                            </span>
                            <span className="flex-1 text-sm text-foreground">
                              {player.PreferredName || <span className="italic text-muted-foreground">Unnamed</span>}
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {player.MainPosition || '—'}
                            </span>
                            {player.SecondaryPosition && (
                              <span className="text-xs text-muted-foreground">{player.SecondaryPosition}</span>
                            )}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEditPlayer(player)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors text-xs"
                                title="Edit player"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeletePlayer(team.Id, player)}
                                disabled={saving}
                                className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors text-xs disabled:opacity-50"
                                title="Remove player"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add player form */}
                    {addingToTeamId === team.Id ? (
                      <div className="px-4 py-3 flex flex-wrap gap-2 items-center border-t border-border/50 bg-muted/20">
                        <input
                          autoFocus
                          type="text"
                          value={newPlayer.preferredName}
                          onChange={e => setNewPlayer(p => ({ ...p, preferredName: e.target.value }))}
                          placeholder="Name"
                          className="w-36 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={newPlayer.jerseyNumber}
                          onChange={e => setNewPlayer(p => ({ ...p, jerseyNumber: e.target.value }))}
                          placeholder="#"
                          className="w-16 bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <select
                          value={newPlayer.mainPosition}
                          onChange={e => setNewPlayer(p => ({ ...p, mainPosition: e.target.value }))}
                          className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                        <select
                          value={newPlayer.secondaryPosition}
                          onChange={e => setNewPlayer(p => ({ ...p, secondaryPosition: e.target.value }))}
                          className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">2nd pos (optional)</option>
                          {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                        <button
                          onClick={() => handleAddPlayer(team.Id)}
                          disabled={saving || !newPlayer.preferredName.trim() || !newPlayer.jerseyNumber}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingToTeamId(null)}
                          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startAddPlayer(team.Id)}
                        className="w-full px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors text-left border-t border-border/50"
                      >
                        + Add Player
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}

export default TeamsPage;
