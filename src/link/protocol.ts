import { MatchState, PlayerSide } from '../engine/types';

/**
 * What devices say to each other, and nothing about how it travels.
 *
 * The transport underneath is swappable and has to be: phone-to-phone is one
 * technology, phone-to-watch is a different one entirely. Everything above this
 * file is written once.
 */

/**
 * Who owns the match. Exactly one host; everybody else a guest.
 *
 * Deliberately not a list of jobs. A phone on the fence can show the score and
 * film at the same time, so "what this device does" belongs to the app, where it
 * combines freely — a camera is simply a guest that happens to be recording.
 */
export type Ownership = 'host' | 'guest';

/** The vocabulary, and nothing outside it. */
export type Message =
  /**
   * The whole match. Sent on joining and after anything that changes it.
   *
   * `revision` counts authoritative changes on the scoreboard, and is what lets
   * a mirror tell "nothing has happened" apart from "something happened and I
   * never got it" — see the note on `alive`.
   */
  | { kind: 'state'; state: MatchState; revision: number; sentAt: number }
  /** A request to score, from a device that is not holding the truth. */
  | { kind: 'point'; winner: PlayerSide }
  | { kind: 'undo' }
  /**
   * The scoreboard's clock, so a camera can line its recording up with the
   * point times. Sent once on joining; a round trip is enough to be accurate to
   * far better than the seconds a video clip needs.
   */
  | { kind: 'clock'; sentAt: number }
  /**
   * The scoreboard saying it is still there, on a timer, along with the revision
   * it believes everyone should be showing.
   *
   * Needed because a connection can stay open long after the far end is gone —
   * the transport only notices when its own timeout expires, which is far too
   * late for a screen the court is reading. Silence is the signal here, so this
   * has to arrive on a schedule rather than only when something happens: points
   * can be minutes apart, and those minutes must not look like a fault.
   *
   * **Carrying the revision is what stops this message from lying.** Arriving
   * proves the scoreboard is alive. It does not prove the mirror is showing what
   * the scoreboard is showing, and those are different claims. A `state` message
   * can be lost — and this app deliberately drops anything that will not parse,
   * which in a version mismatch discards exactly the large messages while the
   * small ones keep arriving perfectly. Without a revision the mirror would then
   * hold a stale score under a healthy banner, which is the precise failure the
   * heartbeat was added to prevent, arriving through a different door.
   */
  | { kind: 'alive'; revision: number; sentAt: number }
  /**
   * A mirror saying it is behind and wants the whole match again. The scoreboard
   * answers with `state`. There is nothing to negotiate and no partial update:
   * the state is small enough to resend and reasoning about deltas would be a
   * second way to be wrong.
   */
  | { kind: 'syncRequest' };

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
