// Point data structure
export interface PointData {
  id: string;
  set_id: string;
  point_number: number;
  winning_team: 'home' | 'opponent';
  home_score: number;
  opponent_score: number;
  recorded_at: string;

  // Action details
  action_type: string;
  action_category: string;
  location_tempo: string | null;

  // Players
  home_player_id: string | null;
  opponent_player_id: string | null;
  home_player_name?: string;
  opponent_player_name?: string;
  opponent_player_jersey?: number;

  // Metadata
  notes?: string;
}

// Set data
export interface SetData {
  id: string;
  match_id: string;
  set_number: number;
  home_score: number;
  opponent_score: number;
  is_completed: boolean;
  points: PointData[];
}

// Match data
export interface MatchData {
  id: string;
  match_date: string;
  home_team: TeamData;
  opponent_team: TeamData;
  sets: SetData[];
}

// Team and player types
export interface TeamData {
  id: string;
  name: string;
  players: PlayerData[];
}

export interface PlayerData {
  id: string;
  name: string;
  jersey_number: number;
  position: string;
}

// UI State
export interface InGameStatsUIState {
  selectedSet: number | 'Total';
  viewMode: 'list' | 'stats';
  isLoading: boolean;
  error: string | null;
}

// Point Entry Form State
export interface PointEntryState {
  winLoss: 'Win' | 'Loss' | null;
  category: string | null;
  subcategory: string | null;
  locationTempo: string | null;
  player: string | null;
  isValid: boolean;
  errors: Record<string, string>;
}

// Statistics output types
export interface SummaryStats {
  homeErrors: number;
  opponentErrors: number;
  homeAces: number;
  opponentAces: number;
  homeAttacks: number;
  opponentAttacks: number;
}

export interface PlayerStat {
  player: string;
  count: number;
  color: string;
}

export interface HitAceData {
  aces: PlayerStat[];
  hits: PlayerStat[];
}

export interface PlayerKDData {
  player: string;
  kills: number;
  errors: number;
  attempts: number;
  efficiency: number;
  color: string;
}

export interface KillZoneData {
  zone: string;
  players: PlayerStat[];
}

export interface AttackPositionData {
  position: 'OH' | 'MB' | 'Oppo' | 'BackRow';
  players: PlayerStat[];
}

// Action Types structure
export interface ActionTypeCategory {
  category: string;
  subcategories: string[];
  locationTempo?: string[];
}

export interface ActionType {
  type: 'Win' | 'Loss';
  categories: Record<string, ActionTypeCategory>;
}

// New Point Input Data
export interface NewPointInput {
  setId: string;
  pointNumber: number;
  winningTeam: 'home' | 'opponent';
  homeScore: number;
  opponentScore: number;
  actionType: string;
  actionCategory: string;
  locationTempo: string | null;
  homePlayerId: string | null;
  opponentPlayerId: string | null;
  notes?: string;
}
