import { useState, useEffect, useRef } from 'react';
import { MatchState, MatchConfig, PlayerSide } from '../engine/types';
import { createMatch, addPoint, setServingPlayer, toMatchRecord } from '../engine/scoring';
import { MatchHistoryStack } from '../engine/history';
import {
  saveCurrentMatch,
  loadCurrentMatch,
  saveUndoStack,
  loadUndoStack,
  appendToHistory,
} from '../storage/matchStorage';
import { audioQueue } from '../audio/audioQueue';

/**
 * A name for one point, unique enough for anything that will ever hold one.
 *
 * Deliberately not the point's position in the log: undo hands that index to the
 * next point played, and a clip filed under it would reattach itself to a rally
 * it never saw. Deliberately not a library either — a timestamp and eight random
 * characters is already far past any collision this app can produce.
 */
function newPointId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useMatch() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef<MatchHistoryStack>(new MatchHistoryStack());

  useEffect(() => {
    async function init() {
      const loaded = await loadCurrentMatch();
      if (loaded) {
        setMatchState(loaded);
        historyRef.current.restore(await loadUndoStack());
        setCanUndo(historyRef.current.canUndo());
      }
    }
    init();
  }, []);

  const commit = async (next: MatchState) => {
    setMatchState(next);
    setCanUndo(historyRef.current.canUndo());
    await saveCurrentMatch(next);
    await saveUndoStack(historyRef.current.getAll());
  };

  const handleStartNewMatch = async (config: MatchConfig) => {
    historyRef.current.clear();
    await commit(createMatch(config));
  };

  const handleAddPoint = async (winner: PlayerSide) => {
    if (!matchState || matchState.matchStatus === 'finished') return;

    historyRef.current.push(matchState);
    // Both the time and the name are minted here, once, so that everything
    // hanging off this point — the log, and in time a rally clip — agrees about
    // which point it was.
    const nextState = addPoint(matchState, winner, Date.now(), newPointId());
    await commit(nextState);

    // This point ended the match — the guard above means it was still running.
    if (nextState.matchStatus === 'finished') {
      const record = toMatchRecord(nextState);
      if (record) await appendToHistory(record);
    }

    await audioQueue.handlePointEvent(nextState);
  };

  const handleUndo = async () => {
    const previousState = historyRef.current.pop();
    if (!previousState) return;

    await commit(previousState);
    await audioQueue.handleUndo();
  };

  const handleSelectServer = async (side: PlayerSide, playerIndex: 0 | 1) => {
    if (!matchState) return;
    await commit(setServingPlayer(matchState, side, playerIndex));
  };

  const handleSwapSides = async () => {
    if (!matchState) return;
    await commit({
      ...matchState,
      courtSide: matchState.courtSide === 'original' ? 'swapped' : 'original',
    });
  };

  const handleUpdateMatchConfig = async (updated: Partial<MatchConfig>) => {
    if (!matchState) return;
    await commit({
      ...matchState,
      config: { ...matchState.config, ...updated },
    });
  };

  const handleAbandonMatch = async () => {
    historyRef.current.clear();
    setMatchState(null);
    setCanUndo(false);
    await saveCurrentMatch(null);
    await saveUndoStack([]);
  };

  return {
    matchState,
    canUndo,
    startNewMatch: handleStartNewMatch,
    addPoint: handleAddPoint,
    undo: handleUndo,
    selectServer: handleSelectServer,
    swapSides: handleSwapSides,
    updateMatchConfig: handleUpdateMatchConfig,
    abandonMatch: handleAbandonMatch,
  };
}
