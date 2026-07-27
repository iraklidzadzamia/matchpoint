export type Sport = 'tennis' | 'padel';
export type MatchFormat = 'singles' | 'doubles';
export type SwapSidesRule = 'off' | 'oddGames' | 'everySet';
export type PlayerSide = 'side1' | 'side2';

export interface PlayerInfo {
  player1: string;
  player2?: string;
}

export interface MatchConfig {
  sport: Sport;
  format: MatchFormat;
  totalSets: 1 | 3 | 5;
  tieBreakEnabled: boolean;
  matchTieBreakEnabled: boolean;
  tieBreakTo: 7 | 10;
  goldenPointEnabled: boolean;
  advantagesBeforeGolden: 0 | 1 | 2;
  swapSides: SwapSidesRule;
  
  side1: PlayerInfo;
  side2: PlayerInfo;
  
  servingFirst: PlayerSide;
  scoreKeeper: PlayerSide;
}

export interface AppSettings {
  voiceAnnounce: boolean;
  liveCrowd: boolean;
  maxBrightness: boolean;
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
  
  serving: PlayerSide;
  serverPlayerIndex: [number, number]; // [side1PlayerIdx, side2PlayerIdx] (0 or 1)
  courtSide: 'original' | 'swapped';
  
  matchStatus: 'setup' | 'playing' | 'finished';
  matchWinner: PlayerSide | null;
  matchStartTime: number;
  matchEndTime: number | null;
  
  gameHistory: string[];               // e.g. ["15 0", "15 15", "30 15"]
  lastEvent: MatchEvent | null;
}
