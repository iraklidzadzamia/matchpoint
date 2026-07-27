import { MatchConfig, MatchState, PlayerSide, MatchRecord } from './types';

export function createMatch(config: MatchConfig): MatchState {
  return {
    config,
    points: [0, 0],
    games: [0, 0],
    setsWon: [0, 0],
    completedSets: [],
    
    isDeuce: false,
    advantage: null,
    advantageCount: 0,
    
    isTieBreak: false,
    isMatchTieBreak: false,
    tieBreakPoints: [0, 0],
    tieBreakStartServer: null,

    serving: config.servingFirst,
    serverPlayerIndex: [0, 0],
    courtSide: 'original',
    
    matchStatus: 'playing',
    matchWinner: null,
    matchStartTime: Date.now(),
    matchEndTime: null,

    gameHistory: [],
    lastEvent: null,
  };
}

export function getSideNames(config: MatchConfig, side: PlayerSide): string {
  const info = side === 'side1' ? config.side1 : config.side2;
  if (config.format === 'doubles' && info.player2) {
    return `${info.player1} & ${info.player2}`;
  }
  return info.player1 || (side === 'side1' ? 'Side 1' : 'Side 2');
}

export function getServingPlayerName(state: MatchState): string {
  const side = state.serving;
  const info = side === 'side1' ? state.config.side1 : state.config.side2;
  const idx = side === 'side1' ? state.serverPlayerIndex[0] : state.serverPlayerIndex[1];
  
  if (state.config.format === 'doubles' && idx === 1 && info.player2) {
    return info.player2;
  }
  return info.player1 || (side === 'side1' ? 'Side 1' : 'Side 2');
}

export function toMatchRecord(state: MatchState): MatchRecord | null {
  if (state.matchStatus !== 'finished' || !state.matchWinner) return null;

  const endTime = state.matchEndTime ?? Date.now();
  return {
    id: `${state.matchStartTime}`,
    sport: state.config.sport,
    format: state.config.format,
    side1Name: getSideNames(state.config, 'side1'),
    side2Name: getSideNames(state.config, 'side2'),
    setScores: state.completedSets.map((s) => [...s] as [number, number]),
    setsWon: [...state.setsWon],
    winner: state.matchWinner,
    startedAt: state.matchStartTime,
    durationSec: Math.max(0, Math.floor((endTime - state.matchStartTime) / 1000)),
  };
}

export function setServingPlayer(state: MatchState, side: PlayerSide, playerIndex: 0 | 1): MatchState {
  const newServerIdx: [number, number] = [...state.serverPlayerIndex];
  if (side === 'side1') {
    newServerIdx[0] = playerIndex;
  } else {
    newServerIdx[1] = playerIndex;
  }
  return {
    ...state,
    serving: side,
    serverPlayerIndex: newServerIdx,
  };
}

export function getDisplayScore(state: MatchState): { side1Score: string; side2Score: string } {
  if (state.isTieBreak || state.isMatchTieBreak) {
    return {
      side1Score: state.tieBreakPoints[0].toString(),
      side2Score: state.tieBreakPoints[1].toString(),
    };
  }

  const [p1, p2] = state.points;

  if (state.isDeuce) {
    if (state.advantage === 'side1') {
      return { side1Score: 'AD', side2Score: '40' };
    } else if (state.advantage === 'side2') {
      return { side1Score: '40', side2Score: 'AD' };
    }
    return { side1Score: '40', side2Score: '40' };
  }

  const pointMap = ['0', '15', '30', '40'];
  return {
    side1Score: pointMap[p1] || '40',
    side2Score: pointMap[p2] || '40',
  };
}

export function addPoint(state: MatchState, winner: PlayerSide): MatchState {
  if (state.matchStatus === 'finished') {
    return state;
  }

  const winnerIdx = winner === 'side1' ? 0 : 1;
  const loserIdx = winner === 'side1' ? 1 : 0;
  const loser: PlayerSide = winner === 'side1' ? 'side2' : 'side1';

  let newState: MatchState = JSON.parse(JSON.stringify(state));

  // If in Tie-Break
  if (newState.isTieBreak || newState.isMatchTieBreak) {
    newState.tieBreakPoints[winnerIdx] += 1;
    const target = newState.isMatchTieBreak ? 10 : newState.config.tieBreakTo;
    const [tb1, tb2] = newState.tieBreakPoints;
    const currentWinnerTb = winnerIdx === 0 ? tb1 : tb2;
    const currentLoserTb = winnerIdx === 0 ? tb2 : tb1;

    // Set point / match point are computed before the win-check so a
    // game-winning point still carries these flags on its lastEvent.
    const isSetP = currentWinnerTb >= target - 1 && currentWinnerTb > currentLoserTb;
    const setsNeeded = Math.ceil(newState.config.totalSets / 2);
    const isMatchP = isSetP && newState.setsWon[winnerIdx] === setsNeeded - 1;

    // Check tie-break win
    if (currentWinnerTb >= target && currentWinnerTb - currentLoserTb >= 2) {
      return winGame(newState, winner, true, { isSetPoint: isSetP, isMatchPoint: isMatchP });
    }

    const totalPoints = tb1 + tb2;

    // Tie-break serve rotation: switch serve every 2 points (after 1st point).
    // Also rotate the serving side's player index so the 2nd doubles player
    // actually gets a turn to serve instead of being skipped forever.
    if (totalPoints % 2 === 1) {
      const nextServing = newState.serving === 'side1' ? 'side2' : 'side1';
      newState.serving = nextServing;
      if (newState.config.format === 'doubles') {
        const sideArrIdx = nextServing === 'side1' ? 0 : 1;
        newState.serverPlayerIndex[sideArrIdx] = newState.serverPlayerIndex[sideArrIdx] === 0 ? 1 : 0;
      }
    }

    // Court sides swap every 6 points scored in the tie-break.
    if (totalPoints > 0 && totalPoints % 6 === 0) {
      newState.courtSide = newState.courtSide === 'original' ? 'swapped' : 'original';
    }

    // Update history
    const display = getDisplayScore(newState);
    newState.gameHistory.push(`${display.side1Score} ${display.side2Score}`);

    newState.lastEvent = {
      type: 'point',
      winner,
      isSetPoint: isSetP,
      isMatchPoint: isMatchP,
    };

    return newState;
  }

  // Standard Game Logic
  const currentWinnerPoints = newState.points[winnerIdx];
  const currentLoserPoints = newState.points[loserIdx];

  // Determine (before mutating) whether this point, if won, ends the game —
  // used to attach break/set/match point flags to the point that actually
  // converts them, instead of only to points that don't win the game.
  let winsGame = false;
  if (newState.isDeuce) {
    if (
      (newState.config.goldenPointEnabled && newState.advantageCount >= newState.config.advantagesBeforeGolden) ||
      newState.advantage === winner
    ) {
      winsGame = true;
    }
  } else if (currentWinnerPoints === 3 && currentLoserPoints < 3) {
    winsGame = true;
  }

  let pointFlags: { isBreakPoint?: boolean; isSetPoint?: boolean; isMatchPoint?: boolean } = {};
  if (winsGame) {
    const projectedGames = newState.games[winnerIdx] + 1;
    const isBreakPoint = winner !== newState.serving;
    const isSetPoint = projectedGames >= 6 && projectedGames - newState.games[loserIdx] >= 2;
    const setsNeeded = Math.ceil(newState.config.totalSets / 2);
    const isMatchPoint = isSetPoint && newState.setsWon[winnerIdx] === setsNeeded - 1;
    pointFlags = { isBreakPoint, isSetPoint, isMatchPoint };
  }

  // Deuce / Advantage Logic
  if (newState.isDeuce) {
    if (newState.config.goldenPointEnabled && newState.advantageCount >= newState.config.advantagesBeforeGolden) {
      // Deciding Golden Point
      return winGame(newState, winner, false, pointFlags);
    }

    if (newState.advantage === winner) {
      // Winner had Advantage -> Wins game!
      return winGame(newState, winner, false, pointFlags);
    } else if (newState.advantage === loser) {
      // Loser had Advantage -> Back to Deuce
      newState.advantage = null;
      newState.advantageCount += 1;
    } else {
      // Exactly at Deuce -> Winner gets Advantage
      newState.advantage = winner;
    }
  } else {
    // Regular points
    if (currentWinnerPoints === 3 && currentLoserPoints < 3) {
      // Game win!
      return winGame(newState, winner, false, pointFlags);
    }

    newState.points[winnerIdx] += 1;

    // Just reached 40:40 -> Deuce. No advantage yet — the *next* point
    // decides (or, in golden-point mode, wins outright via the isDeuce
    // branch above since advantageCount starts at 0).
    if (newState.points[0] === 3 && newState.points[1] === 3) {
      newState.isDeuce = true;
      newState.advantage = null;
      newState.advantageCount = 0;
    }
  }

  // Update history (only reached for points that don't end the game)
  const display = getDisplayScore(newState);
  newState.gameHistory.push(`${display.side1Score} ${display.side2Score}`);

  // Flags describe the situation now reached: the winner is one point away
  // from breaking / taking the set / taking the match.
  const onePointFromGame =
    (newState.points[winnerIdx] === 3 && newState.points[loserIdx] < 3) ||
    newState.advantage === winner;

  const isBreakP = winner !== newState.serving && onePointFromGame;

  const projectedGames = newState.games[winnerIdx] + 1;
  const isSetP = onePointFromGame && projectedGames >= 6 && projectedGames - newState.games[loserIdx] >= 2;

  const setsNeeded = Math.ceil(newState.config.totalSets / 2);
  const isMatchP = isSetP && newState.setsWon[winnerIdx] === setsNeeded - 1;

  newState.lastEvent = {
    type: 'point',
    winner,
    isBreakPoint: isBreakP,
    isSetPoint: isSetP,
    isMatchPoint: isMatchP,
  };

  return newState;
}

function winGame(
  state: MatchState,
  winner: PlayerSide,
  fromTieBreak: boolean,
  pointFlags: { isBreakPoint?: boolean; isSetPoint?: boolean; isMatchPoint?: boolean } = {}
): MatchState {
  const winnerIdx = winner === 'side1' ? 0 : 1;
  const loserIdx = winner === 'side1' ? 1 : 0;

  state.points = [0, 0];
  state.isDeuce = false;
  state.advantage = null;
  state.advantageCount = 0;
  state.isTieBreak = false;
  state.isMatchTieBreak = false;
  state.tieBreakPoints = [0, 0];
  state.gameHistory = [];

  state.games[winnerIdx] += 1;

  // Alternate server for next game. After a tie-break the next set is opened by
  // the pair that did NOT open the tie-break (FIP Rule 1, Tie-Break §5) — which
  // is not always the same as flipping whoever served the final point.
  const prevServer = state.serving;
  if (fromTieBreak && state.tieBreakStartServer) {
    state.serving = state.tieBreakStartServer === 'side1' ? 'side2' : 'side1';
  } else {
    state.serving = prevServer === 'side1' ? 'side2' : 'side1';
  }
  state.tieBreakStartServer = null;

  // Rotate doubles server index for side that just served
  if (state.config.format === 'doubles') {
    if (prevServer === 'side1') {
      state.serverPlayerIndex[0] = state.serverPlayerIndex[0] === 0 ? 1 : 0;
    } else {
      state.serverPlayerIndex[1] = state.serverPlayerIndex[1] === 0 ? 1 : 0;
    }
  }

  // Check Swap Sides rule
  const totalGamesInSet = state.games[0] + state.games[1];
  if (state.config.swapSides === 'oddGames' && totalGamesInSet % 2 === 1) {
    state.courtSide = state.courtSide === 'original' ? 'swapped' : 'original';
  }

  const [g1, g2] = state.games;
  const currentWinnerGames = state.games[winnerIdx];
  const currentLoserGames = state.games[loserIdx];

  // Check Set Win
  let isSetWon = false;
  if (fromTieBreak) {
    isSetWon = true;
  } else if (currentWinnerGames >= 6 && currentWinnerGames - currentLoserGames >= 2) {
    isSetWon = true;
  }

  if (isSetWon) {
    return winSet(state, winner, pointFlags);
  }

  // Check if next game is Tie-Break (6:6)
  if (g1 === 6 && g2 === 6 && state.config.tieBreakEnabled) {
    const setsNeeded = Math.ceil(state.config.totalSets / 2);
    const isFinalSet = state.setsWon[0] === setsNeeded - 1 && state.setsWon[1] === setsNeeded - 1;
    
    if (isFinalSet && state.config.matchTieBreakEnabled) {
      state.isMatchTieBreak = true;
    } else {
      state.isTieBreak = true;
    }
    // state.serving was just set to whoever opens the next game — i.e. the
    // player who opens the tie-break.
    state.tieBreakStartServer = state.serving;
  }

  state.lastEvent = {
    type: 'game',
    winner,
    ...pointFlags,
  };

  return state;
}

function winSet(
  state: MatchState,
  winner: PlayerSide,
  pointFlags: { isBreakPoint?: boolean; isSetPoint?: boolean; isMatchPoint?: boolean } = {}
): MatchState {
  const winnerIdx = winner === 'side1' ? 0 : 1;

  state.completedSets.push([...state.games]);
  state.setsWon[winnerIdx] += 1;
  state.games = [0, 0];

  if (state.config.swapSides === 'everySet') {
    state.courtSide = state.courtSide === 'original' ? 'swapped' : 'original';
  }

  const setsNeeded = Math.ceil(state.config.totalSets / 2);
  if (state.setsWon[winnerIdx] >= setsNeeded) {
    state.matchStatus = 'finished';
    state.matchWinner = winner;
    state.matchEndTime = Date.now();
    state.lastEvent = {
      type: 'match',
      winner,
      ...pointFlags,
    };
  } else {
    state.lastEvent = {
      type: 'set',
      winner,
      ...pointFlags,
    };
  }

  return state;
}
