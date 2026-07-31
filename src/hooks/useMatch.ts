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

  /**
   * The match as of the last commit, rather than as of the last render.
   *
   * Every handler here used to read `matchState` out of its closure, which is a
   * value from the last time React drew. Two calls arriving before it draws
   * again both read the same match, and the second overwrites the first: a point
   * vanishes and the undo stack gets the same state pushed twice. Fingers rarely
   * manage it. A remote firing asynchronously into the same door will.
   */
  const liveRef = useRef<MatchState | null>(null);

  /**
   * The queue every change goes through, one at a time.
   *
   * Reading the committed state is not enough on its own: the work is async, so
   * two overlapping calls could still interleave between reading and committing.
   * Chaining them removes the window entirely. A failure does not jam the queue —
   * the next piece of work runs either way.
   */
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  function through<T>(work: () => Promise<T>): Promise<T> {
    const next = queueRef.current.then(work, work);
    queueRef.current = next.catch(() => undefined);
    return next;
  }

  useEffect(() => {
    async function init() {
      const loaded = await loadCurrentMatch();
      if (loaded) {
        liveRef.current = loaded;
        setMatchState(loaded);
        historyRef.current.restore(await loadUndoStack());
        setCanUndo(historyRef.current.canUndo());
      }
    }
    init();
  }, []);

  const commit = async (next: MatchState) => {
    // Before the render, so the next piece of work through the queue sees it.
    liveRef.current = next;
    setMatchState(next);
    setCanUndo(historyRef.current.canUndo());
    await saveCurrentMatch(next);
    await saveUndoStack(historyRef.current.getAll());
  };

  const handleStartNewMatch = (config: MatchConfig) =>
    through(async () => {
      historyRef.current.clear();
      await commit(createMatch(config));
    });

  const handleAddPoint = (winner: PlayerSide) =>
    through(async () => {
      const current = liveRef.current;
      if (!current || current.matchStatus === 'finished') return;

      historyRef.current.push(current);
      // Both the time and the name are minted here, once, so that everything
      // hanging off this point — the log, and in time a rally clip — agrees about
      // which point it was.
      const nextState = addPoint(current, winner, Date.now(), newPointId());
      await commit(nextState);

      // This point ended the match — the guard above means it was still running.
      if (nextState.matchStatus === 'finished') {
        const record = toMatchRecord(nextState);
        if (record) await appendToHistory(record);
      }

      await audioQueue.handlePointEvent(nextState);
    });

  const handleUndo = () =>
    through(async () => {
      const previousState = historyRef.current.pop();
      if (!previousState) return;

      await commit(previousState);
      await audioQueue.handleUndo();
    });

  const handleSelectServer = (side: PlayerSide, playerIndex: 0 | 1) =>
    through(async () => {
      const current = liveRef.current;
      if (!current) return;
      await commit(setServingPlayer(current, side, playerIndex));
    });

  const handleSwapSides = () =>
    through(async () => {
      const current = liveRef.current;
      if (!current) return;
      await commit({
        ...current,
        courtSide: current.courtSide === 'original' ? 'swapped' : 'original',
      });
    });

  const handleUpdateMatchConfig = (updated: Partial<MatchConfig>) =>
    through(async () => {
      const current = liveRef.current;
      if (!current) return;
      await commit({
        ...current,
        config: { ...current.config, ...updated },
      });
    });

  const handleAbandonMatch = () =>
    through(async () => {
      historyRef.current.clear();
      liveRef.current = null;
      setMatchState(null);
      setCanUndo(false);
      await saveCurrentMatch(null);
      await saveUndoStack([]);
    });

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
