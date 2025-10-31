/**
 * Opponent Analysis Types
 * Dual-coordinate system: grid (simple) + normalized (precise)
 */

export type EventType = 'serve' | 'attack';
export type EventResult = 'kill' | 'error' | 'in_play';
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Location event with dual-coordinate system
 * - grid_x/grid_y: Simple 6×6 grid (0-5) for MVP
 * - normalized_x/normalized_y: Precise floats (0.0-1.0) for future enhancement
 */
export interface LocationEvent {
  id: string;
  match_id: string;
  set_number: number;

  // Player info
  player_id: string;
  player_name: string;

  // Event details
  event_type: EventType;
  result: EventResult;

  // Dual coordinates (store both for future-proofing)
  grid_x: number;        // 0-5 (simple grid)
  grid_y: number;        // 0-5
  normalized_x: number;  // 0.0-1.0 (converted: (grid_x + 0.5) / 6)
  normalized_y: number;  // 0.0-1.0

  // Metadata
  confidence?: Confidence;
  timestamp: number;
  notes?: string;
}

/**
 * Starting line-up for a set
 * Tracks which players started in each rotation position
 */
export interface StartingLineup {
  id: string;
  match_id: string;
  set_number: number;

  // Court positions (P1-P6)
  // P1 = right back, P2 = right front, P3 = middle front
  // P4 = left front, P5 = left back, P6 = middle back
  p1_player_id?: string;
  p2_player_id?: string;
  p3_player_id?: string;
  p4_player_id?: string;
  p5_player_id?: string;
  p6_player_id?: string;

  timestamp: number;
}

/**
 * Opponent analysis data for a match
 */
export interface OpponentAnalysisData {
  match_id: string;
  opponent_team_id: string;
  opponent_team_name: string;

  // Starting line-ups per set
  lineups: StartingLineup[];

  // Location events (serves + attacks)
  events: LocationEvent[];

  // Metadata
  created_at: number;
  updated_at: number;
}

/**
 * Heatmap cell data for visualization
 */
export interface HeatmapCell {
  x: number;  // 0-5
  y: number;  // 0-5
  count: number;
  percentage: number;
  events: LocationEvent[];
}

/**
 * Player statistics summary
 */
export interface PlayerStats {
  player_id: string;
  player_name: string;

  // Serve stats
  total_serves: number;
  serve_kills: number;
  serve_errors: number;
  serve_in_play: number;

  // Attack stats
  total_attacks: number;
  attack_kills: number;
  attack_errors: number;
  attack_in_play: number;

  // Location distribution
  serve_locations: HeatmapCell[];
  attack_locations: HeatmapCell[];
}
