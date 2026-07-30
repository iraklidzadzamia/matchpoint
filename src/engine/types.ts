export type Sport = 'tennis' | 'padel';
export type MatchFormat = 'singles' | 'doubles';
export type SwapSidesRule = 'off' | 'oddGames' | 'everySet';
export type PlayerSide = 'side1' | 'side2';

export interface PlayerInfo {
  player1: string;
  player2?: string;
}

// Games needed to take a set. 6 is the tournament set; 4 is what people play
// when the court is booked for an hour; 8 is a pro set, usually played alone
// instead of a best-of-three.
export type GamesPerSet = 4 | 6 | 8;

export interface MatchConfig {
  sport: Sport;
  format: MatchFormat;
  totalSets: 1 | 3 | 5;
  gamesPerSet: GamesPerSet;
  tieBreakEnabled: boolean;
  matchTieBreakEnabled: boolean;
  tieBreakTo: 7 | 10;
  goldenPointEnabled: boolean;
  advantagesBeforeGolden: 0 | 1 | 2;
  swapSides: SwapSidesRule;
  
  side1: PlayerInfo;
  side2: PlayerInfo;

  servingFirst: PlayerSide;
}

// A finished match, flattened to just what the history list needs — keeping
// whole MatchState objects around would bloat storage for no benefit.
export interface MatchRecord {
  id: string;
  sport: Sport;
  format: MatchFormat;
  side1Name: string;
  side2Name: string;
  setScores: [number, number][];
  setsWon: [number, number];
  winner: PlayerSide;
  startedAt: number;
  durationSec: number;
  pointLog: PointRecord[];
  /**
   * Each side's players, one name per entry. `side1Name` is these joined for
   * display; these are what anything per-player reads, because splitting a
   * display string back apart is guesswork.
   *
   * Optional: records written before this existed only ever kept the joined
   * name, and a name like "Irakli & Nika" cannot be told apart from one player
   * who happens to have "&" in their name.
   */
  side1Players?: string[];
  side2Players?: string[];
}

export interface AppSettings {
  voiceAnnounce: boolean;
  maxBrightness: boolean;
}

/**
 * One point, as it happened. The winner alone is enough to rebuild the whole
 * match — the engine is deterministic — so this stays deliberately small; `at`
 * is what everything else hangs off: rally lengths, a match timeline, and
 * later, tying a saved video clip to the point it belongs to.
 */
export interface PointRecord {
  at: number;
  winner: PlayerSide;
  type: MatchEvent['type'];
  /**
   * Who served this point, and which of that side's two players did. The engine
   * knows both while the match runs but used to throw them away, which made the
   * numbers that matter most in tennis and padel — points won on serve, games
   * broken — impossible to work out afterwards.
   *
   * Optional: points logged before this existed genuinely do not know, and no
   * amount of replaying can recover it.
   */
  served?: PlayerSide;
  servedByPlayer?: 0 | 1;
}

export interface MatchEvent {
  type: 'point' | 'game' | 'set' | 'match';
  winner: PlayerSide;
  isMatchPoint?: boolean;
  isSetPoint?: boolean;
  isBreakPoint?: boolean;
}

export interface MatchState {
  config: MatchConfig;
  points: [number, number];            // Raw points in current game (0, 1, 2, 3...)
  games: [number, number];             // Games won in current set
  setsWon: [number, number];           // Sets won so far
  completedSets: [number, number][];   // History of set scores e.g. [[6, 4], [3, 6]]
  
  isDeuce: boolean;
  advantage: PlayerSide | null;
  advantageCount: number;              // Count of advantage turns in current game
  
  isTieBreak: boolean;
  isMatchTieBreak: boolean;            // Super tie-break in final set
  tieBreakPoints: [number, number];
  tieBreakStartServer: PlayerSide | null; // Who opened the tie-break; the other side opens the next set
  
  serving: PlayerSide;
  serverPlayerIndex: [number, number]; // [side1PlayerIdx, side2PlayerIdx] (0 or 1)
  courtSide: 'original' | 'swapped';
  
  matchStatus: 'setup' | 'playing' | 'finished';
  matchWinner: PlayerSide | null;
  matchStartTime: number;
  matchEndTime: number | null;
  
  gameHistory: string[];               // e.g. ["15 0", "15 15", "30 15"]
  pointLog: PointRecord[];             // every point of the match, in order
  lastEvent: MatchEvent | null;
}
