// Point data structure (matches OldTool Retool format)
export interface PointData {
  point_number: number;
  winning_team: 'home' | 'opponent';
  action_type: string;              // "Att.", "Ser.", "Blo.", etc.
  action: string;                    // "Hard Spike", "Ace (On floor)", etc.
  locationTempo: string | null;      // "OH (Line)", "MB (A)", etc.
  home_player: string;               // Player name (not ID)
  opponent_player: string;           // Opponent name (not ID)
  home_score: number;
  opponent_score: number;
}

// Set data (matches OldTool Retool format)
export interface SetData {
  set_number: number;
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

// Google Sheets storage format
export interface GoogleSheetsRow {
  Id: string;                        // Match ID
  Data: string;                      // JSON.stringify(SetData[])
  HomeTeam: string;                  // Team name
  OpponentTeam: string;              // Opponent name
  GameDate: string;                  // "2025-10-01"
}
