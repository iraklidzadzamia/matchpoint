import { useEffect, useRef, useState } from 'react';
import { MatchState } from '../engine/types';
import { getSideNames } from '../engine/scoring';
import { MatchLink } from './matchLink';
import { MultipeerTransport } from './multipeerTransport';
import { ConnectionState, matchCode } from './protocol';

/**
 * Makes the running match findable by other devices, and keeps them up to date.
 *
 * Hosting is off until asked for: advertising costs radio and battery, and most
 * matches are one phone on a bench. Turning it on starts advertising and pushes
 * the state after every point, so a second screen never has to ask.
 */
export function useHosting(state: MatchState | null, hosting: boolean) {
  const link = useRef<MatchLink | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('disconnected');

  const code = state ? matchCode(state.matchStartTime) : null;

  useEffect(() => {
    if (!hosting || !state || !MultipeerTransport.available) return;

    const transport = new MultipeerTransport();
    const created = new MatchLink(transport, 'scoreboard');
    link.current = created;

    const stopWatching = transport.onConnection?.(setConnection);
    void created.host(state, `${getSideNames(state.config, 'side1')} vs ${getSideNames(state.config, 'side2')}`);

    return () => {
      stopWatching?.();
      void created.leave();
      link.current = null;
      setConnection('disconnected');
    };
    // Only the switch matters here. Following `state` would tear the session
    // down and rebuild it on every point, which is the opposite of the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hosting]);

  // Every point produces a new state object; push it to whoever is watching.
  useEffect(() => {
    if (!hosting || !state) return;
    void link.current?.publish(state);
  }, [hosting, state]);

  return { code, connection, available: MultipeerTransport.available };
}
