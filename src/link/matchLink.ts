import { MatchState, PlayerSide } from '../engine/types';
import { addPoint } from '../engine/scoring';
import { Message, Ownership, PeerInfo, Transport, matchCode } from './protocol';

/** How often the scoreboard says it is still there. */
const HEARTBEAT_MS = 2000;

/**
 * How long a mirror sits in silence before deciding the scoreboard is gone.
 *
 * Three missed beats rather than one. A single dropped packet, or the scorer
 * glancing at another app for a moment, must not throw a warning up on a screen
 * the whole court is reading — a second screen that cries wolf gets ignored,
 * which costs more than the few seconds of lag this buys back.
 */
const SILENCE_MS = 7000;

/**
 * Keeps several devices looking at the same match.
 *
 * **One device holds the truth.** The scoreboard owns the state and is the only
 * thing that runs the engine; everybody else asks it to score a point and is
 * sent the result. That works because the engine is a pure function — given a
 * state and a point, it returns the next state — so there is nothing to keep in
 * sync beyond passing the state along.
 *
 * A camera needs none of this while playing: it records continuously and only
 * needs the scoreboard's clock at the start and the point times at the end. A
 * connection dropping mid-match therefore loses nothing.
 *
 * **A screen, though, has to know it went deaf.** The scoreboard beats on a
 * timer and a mirror watches for silence, because the transport's own idea of
 * "connected" outlives the truth by far too long to show a court.
 */
export class MatchLink {
  private stopListening: (() => void) | null = null;
  private stopBrowsing: (() => void) | null = null;
  private state: MatchState | null = null;
  private clockOffsetMs = 0;

  /** Called whenever the match changes, on every device. */
  onState: ((state: MatchState) => void) | null = null;
  /** Called with what is nearby, while browsing. */
  onPeers: ((peers: PeerInfo[]) => void) | null = null;
  /**
   * Called on a guest when the scoreboard starts or stops being heard. Separate
   * from the transport's own connection state, which stays hopeful for far
   * longer than a scoreboard can afford to be trusted.
   */
  onLiveness: ((heard: boolean) => void) | null = null;

  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private listening: ReturnType<typeof setInterval> | null = null;
  private lastHeardAt = 0;
  private heard = true;

  private stopWatchingConnection: (() => void) | null = null;

  constructor(
    private transport: Transport,
    public readonly ownership: Ownership
  ) {
    this.stopListening = transport.onMessage((message) => this.receive(message));

    // Connecting is not instant: inviting a peer only starts a handshake, and
    // anything sent before it completes goes nowhere. So the opening message
    // waits for the connection to actually exist.
    this.stopWatchingConnection =
      transport.onConnection?.((state) => {
        if (state !== 'connected') return;
        if (this.ownership === 'host') {
          // Somebody just joined: send them the match without being asked.
          void this.publish();
        } else {
          void this.transport.send({ kind: 'clock', sentAt: Date.now() });
        }
      }) ?? null;
  }

  /** How far this device's clock is behind the scoreboard's, in milliseconds. */
  get clockOffset(): number {
    return this.clockOffsetMs;
  }

  get current(): MatchState | null {
    return this.state;
  }

  /**
   * Start owning a match and become findable. The name is what somebody choosing
   * a device sees; the code is what makes that choice unambiguous.
   */
  async host(state: MatchState, name: string): Promise<void> {
    this.state = state;
    await this.transport.advertise({ name, code: matchCode(state.matchStartTime) });

    // Runs whether or not anybody has joined: with nobody listening the sends go
    // nowhere, and starting it here means a device that joins later is never
    // waiting on the next thing to happen in the match before it hears anything.
    this.heartbeat ??= setInterval(() => {
      void this.transport.send({ kind: 'alive', sentAt: Date.now() });
    }, HEARTBEAT_MS);
  }

  /** Look for scoreboards. Stops when `join` succeeds or `leave` is called. */
  browse(): void {
    this.stopBrowsing?.();
    this.stopBrowsing = this.transport.browse((peers) => this.onPeers?.(peers));
  }

  /** Connect to the one that was chosen — never to whatever answered first. */
  async join(peerId: string): Promise<void> {
    await this.transport.connect(peerId);
    this.stopBrowsing?.();
    this.stopBrowsing = null;

    // The clock starts now rather than at the first message, so a scoreboard
    // that never answers at all is caught by the same silence that catches one
    // going quiet later.
    this.lastHeardAt = Date.now();
    this.listening ??= setInterval(() => this.checkSilence(), 1000);

    // A transport that reports connections sends the opening message itself,
    // once there is a connection to send it down. One that does not — the
    // in-memory one — is connected the moment it is asked, so send it now.
    if (!this.transport.onConnection) {
      await this.transport.send({ kind: 'clock', sentAt: Date.now() });
    }
  }

  /**
   * Scores a point. On the scoreboard this runs the engine and sends the result;
   * anywhere else it asks the scoreboard to do it, and the answer arrives as a
   * state message.
   */
  async score(winner: PlayerSide, at: number = Date.now()): Promise<void> {
    if (this.ownership !== 'host') {
      await this.transport.send({ kind: 'point', winner });
      return;
    }
    if (!this.state) return;
    this.state = addPoint(this.state, winner, at);
    this.onState?.(this.state);
    await this.publish();
  }

  /** Replaces the state after an undo, or any other change made locally. */
  async publish(state?: MatchState): Promise<void> {
    if (state) this.state = state;
    if (this.ownership !== 'host' || !this.state) return;
    await this.transport.send({ kind: 'state', state: this.state, sentAt: Date.now() });
  }

  async leave(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (this.listening) clearInterval(this.listening);
    this.listening = null;
    this.stopWatchingConnection?.();
    this.stopWatchingConnection = null;
    this.stopBrowsing?.();
    this.stopBrowsing = null;
    this.stopListening?.();
    this.stopListening = null;
    await this.transport.stopAdvertising();
    await this.transport.disconnect();
  }

  /**
   * Whether the scoreboard has been heard from recently enough to be believed.
   * Only meaningful on a guest.
   */
  private checkSilence(): void {
    const heard = Date.now() - this.lastHeardAt < SILENCE_MS;
    if (heard === this.heard) return;
    this.heard = heard;
    this.onLiveness?.(heard);
  }

  private receive(message: Message): void {
    // Any message at all proves the scoreboard is there. What it says does not
    // matter — that it arrived does.
    this.lastHeardAt = Date.now();
    if (!this.heard) this.checkSilence();

    switch (message.kind) {
      case 'state':
        // Only a scoreboard produces these, so anything arriving here is newer
        // than what this device has.
        this.state = message.state;
        this.onState?.(message.state);
        return;

      case 'point':
        // A request from another device. Ignored unless this one owns the match,
        // which stops two scoreboards from scoring each other's matches.
        if (this.ownership === 'host') void this.score(message.winner);
        return;

      case 'undo':
        return;

      case 'clock':
        if (this.ownership === 'host') {
          void this.transport.send({ kind: 'clock', sentAt: Date.now() });
          void this.publish();
        } else {
          this.clockOffsetMs = message.sentAt - Date.now();
        }
        return;

      case 'alive':
        // Nothing to do: arriving was the entire message.
        return;
    }
  }
}
