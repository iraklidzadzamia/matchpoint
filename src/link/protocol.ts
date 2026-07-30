import { MatchState, PlayerSide } from '../engine/types';

/**
 * What devices say to each other, and nothing about how it travels.
 *
 * The transport underneath is swappable and has to be: phone-to-phone is one
 * technology, phone-to-watch is a different one entirely. Everything above this
 * file is written once.
 */

export type Role = 'scoreboard' | 'display' | 'camera';

/** Four messages, and that is the whole vocabulary. */
export type Message =
  /** The whole match. Sent on joining and after anything that changes it. */
  | { kind: 'state'; state: MatchState; sentAt: number }
  /** A request to score, from a device that is not holding the truth. */
  | { kind: 'point'; winner: PlayerSide }
  | { kind: 'undo' }
  /**
   * The scoreboard's clock, so a camera can line its recording up with the
   * point times. Sent once on joining; a round trip is enough to be accurate to
   * far better than the seconds a video clip needs.
   */
  | { kind: 'clock'; sentAt: number };

/** A device seen nearby, as it should be shown to somebody choosing one. */
export interface PeerInfo {
  /** Whatever the transport uses to address it. */
  id: string;
  /** The match, so a list of them reads as a list of games. */
  name: string;
  /**
   * Four digits, also shown on the scoreboard itself. With several groups on
   * neighbouring courts, names alone are ambiguous — two of them can genuinely
   * be "Irakli & Nika vs Rafael & Juan". The code is what makes the choice
   * certain: read it off the screen of the phone you mean.
   */
  code: string;
}

/**
 * Moves messages. Deliberately small: find peers, connect to one, send, receive.
 * It knows nothing about matches.
 */
export interface Transport {
  /** Become findable. Only a scoreboard does this. */
  advertise(info: { name: string; code: string }): Promise<void>;
  stopAdvertising(): Promise<void>;

  /** Watch what is nearby. Returns a function that stops watching. */
  browse(onPeers: (peers: PeerInfo[]) => void): () => void;

  connect(peerId: string): Promise<void>;
  disconnect(): Promise<void>;

  send(message: Message): Promise<void>;
  /** Returns a function that stops listening. */
  onMessage(handler: (message: Message, fromPeerId: string) => void): () => void;

  /**
   * Whether anything is actually connected. Optional because a transport can be
   * simple enough not to have the notion — the in-memory one used by tests is
   * connected the moment it is asked to be.
   */
  onConnection?(handler: (state: ConnectionState) => void): () => void;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

/**
 * A four-digit code for a match, derived from when it started so that the same
 * match always shows the same code — including after the app is restarted, which
 * a code held only in memory would not survive.
 */
export function matchCode(startedAt: number): string {
  // Any spread of the low digits does; this one keeps consecutive starts apart.
  const n = Math.abs(Math.floor(startedAt / 1000) * 2654435761) % 10000;
  return String(n).padStart(4, '0');
}
