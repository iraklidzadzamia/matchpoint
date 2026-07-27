import { en } from './en';
import { MatchState, PlayerSide } from '../engine/types';
import { getSideNames } from '../engine/scoring';

export function t(path: string, params?: Record<string, string>): string {
  const keys = path.split('.');
  let current: any = en;
  for (const k of keys) {
    if (current && current[k] !== undefined) {
      current = current[k];
    } else {
      return path;
    }
  }
  let text = typeof current === 'string' ? current : path;
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    });
  }
  return text;
}

export function getScoreAnnouncement(state: MatchState): string | null {
  const last = state.lastEvent;
  if (!last) return null;

  const winnerSide: PlayerSide = last.winner;
  const winnerName = getSideNames(state.config, winnerSide);

  if (last.type === 'match') {
    return t('score.matchWon', { name: winnerName });
  }

  if (last.type === 'set') {
    const setNum = state.completedSets.length;
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
    const ordStr = ordinals[setNum - 1] || `${setNum}th`;
    return t('score.setWon', { ordinal: ordStr, name: winnerName });
  }

  if (last.type === 'game') {
    return t('score.gameWon', { name: winnerName });
  }

  if (last.type === 'point') {
    if (last.isMatchPoint) {
      return `${t('score.matchPoint')}, ${winnerName}`;
    }
    if (last.isSetPoint) {
      return `${t('score.setPoint')}, ${winnerName}`;
    }

    if (state.isTieBreak || state.isMatchTieBreak) {
      const [tb1, tb2] = state.tieBreakPoints;
      // Announce serving side score first or leading score
      return `${tb1} - ${tb2}`;
    }

    if (state.isDeuce) {
      if (state.advantage === 'side1') {
        const pName = getSideNames(state.config, 'side1');
        return `${t('score.advantage')}, ${pName}`;
      } else if (state.advantage === 'side2') {
        const pName = getSideNames(state.config, 'side2');
        return `${t('score.advantage')}, ${pName}`;
      }
      return t('score.deuce');
    }

    const mapPoint: Record<number, string> = {
      0: t('score.love'),
      1: t('score.fifteen'),
      2: t('score.thirty'),
      3: t('score.forty'),
    };

    const [p1, p2] = state.points;
    const p1Str = mapPoint[p1] || '40';
    const p2Str = mapPoint[p2] || '40';

    if (p1 === p2) {
      return `${p1Str} ${t('score.all')}`;
    }

    // Server score is announced first in tennis. A comma rather than a dash:
    // speech engines read a hyphen as "minus" or swallow it, and either way
    // the second half of the score stops registering.
    const serverIsSide1 = state.serving === 'side1';
    const serverScoreStr = serverIsSide1 ? p1Str : p2Str;
    const receiverScoreStr = serverIsSide1 ? p2Str : p1Str;

    return `${serverScoreStr}, ${receiverScoreStr}`;
  }

  return null;
}
