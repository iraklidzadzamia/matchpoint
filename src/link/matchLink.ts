import { MatchState, PlayerSide } from '../engine/types';
import { Message, Ownership, PeerInfo, Transport, matchCode } from './protocol';

/** How often the scoreboard says it is still there. */
const HEARTBEAT_MS = 2000;

/**
 * How long a mirror tolerates being out of touch before it stops trusting what
 * it is showing — whether that is silence, or hearing a scoreboard that is
 * plainly ahead of it.
 *
 * Three missed beats rather than one. A single dropped packet, or the scorer
 * glancing at another app for a moment, must not throw a warning up on a screen
 * the whole court is reading — a second screen that cries wolf gets ignored,
 * which costs more than the few seconds of lag this buys back. The same slack
 * covers a resync in flight, so a mirror that notices a gap and immediately gets
 * the answer never flickers a warning at anybody.
 */
const SILENCE_MS = 7000;

/**
 * How often a guest re-checks the scoreboard's clock.
 *
 * Two phones' clocks do not merely differ, they drift apart, and consumer
 * crystals are good to some tens of parts per million — enough to eat most of
 * the quarter-second a clip's boundaries are allowed to be out by, over a
 * ninety-minute match. Measuring the drift properly would take pairs of devices
 * and a long afternoon in the sun; asking again now and then costs two tiny
 * messages and settles the question instead.
 */
const RESYNC_MS = 5 * 60 * 1000;

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
 *
 * **And going deaf is not the only way to be wrong.** A mirror can hear every
 * beat and still be showing an old score, if the message carrying the new one
 * never landed. So the beat carries the scoreboard's revision, and a mirror that
 * finds itself behind asks for the match again rather than displaying something
 * it has reason to doubt.
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
   * Called on a guest when what it is showing becomes trustworthy, or stops
   * being. Separate from the transport's own connection state, which stays
   * hopeful for far longer than a scoreboard can afford to be trusted, and
   * broader than mere silence: a mirror that knows it is a revision behind is
   * not to be believed either.
   */
  onTrust: ((trusted: boolean) => void) | null = null;
  /**
   * Called on the scoreboard when somebody asks for a point — from another
   * device, or from this one.
   *
   * **This class must never run the engine itself.** It used to, and that was a
   * trap waiting for the first remote scorer: a point applied here would bypass
   * the app's funnel, and with it saving the match, the undo stack, the history,
   * the sound, and the rally recorder. The score would move and nothing else
   * would happen, which is the kind of bug that takes an evening to believe.
   *
   * So the link asks and the app decides. Wiring this to the funnel is required
   * before any device other than the scoreboard can score.
   */
  onPointRequest: ((winner: PlayerSide) => void) | null = null;
  /**
   * Called on the scoreboard when a remote asks to take the last point back.
   *
   * Same rule as `onPointRequest`, and the same reason: undo pops the app's
   * history stack, saves, and speaks. None of that is the link's to do. It also
   * has to be wired before a watch ships — a third of the watch's vocabulary is
   * the long press, and until this reaches the funnel that gesture arrives and
   * disappears.
   */
  onUndoRequest: (() => void) | null = null;
  /**
   * Called when a message could not be sent at all.
   *
   * Nothing has to act on this for the link to be correct — a lost state message
   * is caught by the next heartbeat carrying a revision the mirror does not
   * have, and asked for again. But a failure nobody can even see is not
   * something to keep building on top of, and the native side used to discard
   * these entirely.
   */
  onSendError: ((error: unknown) => void) | null = null;

  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private listening: ReturnType<typeof setInterval> | null = null;
  private resyncing: ReturnType<typeof setInterval> | null = null;
  private lastHeardAt = 0;
  private lastInSyncAt = 0;
  private trusted = true;

  /** Authoritative count of changes, kept by the scoreboard. */
  private revision = 0;
  /** The revision a guest has actually applied. */
  private seenRevision = 0;

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
          this.probeClock();
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
      this.emit({
        kind: 'alive',
        revision: this.revision,
        sentAt: Date.now(),
      });
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
    this.lastInSyncAt = this.lastHeardAt;
    this.listening ??= setInterval(() => this.checkTrust(), 1000);
    this.resyncing ??= setInterval(() => this.probeClock(), RESYNC_MS);

    // A transport that reports connections sends the opening message itself,
    // once there is a connection to send it down. One that does not — the
    // in-memory one — is connected the moment it is asked, so send it now.
    if (!this.transport.onConnection) {
      this.probeClock();
    }
  }

  /** Asks the scoreboard what time it is. The answer does the arithmetic. */
  private probeClock(): void {
    if (this.ownership === 'host') return;
    this.emit({ kind: 'clock', sentAt: Date.now() });
  }

  /**
   * Every send in this class goes through here: fired without waiting, because
   * nothing upstairs can usefully block on a radio, and never silently, because
   * a send that failed is one of the ways a screen ends up trusting a score that
   * never arrived.
   */
  private emit(message: Message): void {
    void this.transport.send(message).catch((error) => this.onSendError?.(error));
  }

  /**
   * Asks for a point to be scored. Never scores one.
   *
   * On a guest this goes down the wire; on the scoreboard it is handed to
   * `onPointRequest`. Either way the answer comes back as a state message, and
   * the engine is run in exactly one place — see the note on `onPointRequest`
   * for why that matters more than the small detour costs.
   */
  async score(winner: PlayerSide): Promise<void> {
    if (this.ownership === 'host') {
      this.onPointRequest?.(winner);
      return;
    }
    this.emit({ kind: 'point', winner });
  }

  /** Asks for the last point to be taken back. Never takes one back. */
  async requestUndo(): Promise<void> {
    if (this.ownership === 'host') {
      this.onUndoRequest?.();
      return;
    }
    this.emit({ kind: 'undo' });
  }

  /**
   * Replaces the state after a point, an undo, or any other local change, and
   * sends it out. Called with no argument it resends what is already held —
   * greeting a device that just joined, or answering one that asked.
   *
   * **Only a real change moves the revision.** A resend must not, or every
   * greeting and every resync would look to a mirror like something it had
   * missed, and it would ask again for what it just received.
   */
  async publish(state?: MatchState): Promise<void> {
    if (this.ownership !== 'host') return;
    if (state) {
      this.state = state;
      this.revision += 1;
    }
    if (!this.state) return;
    this.emit({
      kind: 'state',
      state: this.state,
      revision: this.revision,
      sentAt: Date.now(),
    });
  }

  async leave(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (this.listening) clearInterval(this.listening);
    this.listening = null;
    if (this.resyncing) clearInterval(this.resyncing);
    this.resyncing = null;
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
   * Whether what this device is showing can still be believed. Only meaningful
   * on a guest, and it takes two things: the scoreboard has been heard from
   * recently, **and** it has not been reporting a revision this device never
   * received. Either failing on its own is enough to stop trusting the screen.
   */
  private checkTrust(): void {
    const now = Date.now();
    const trusted =
      now - this.lastHeardAt < SILENCE_MS && now - this.lastInSyncAt < SILENCE_MS;
    if (trusted === this.trusted) return;
    this.trusted = trusted;
    this.onTrust?.(trusted);
  }

  private receive(message: Message): void {
    // Any message at all proves the scoreboard is there. What it says does not
    // matter — that it arrived does.
    this.lastHeardAt = Date.now();
    if (!this.trusted) this.checkTrust();

    switch (message.kind) {
      case 'state':
        // Only a scoreboard produces these, so anything arriving here is newer
        // than what this device has — and receiving one is what being in sync
        // means.
        this.state = message.state;
        this.seenRevision = message.revision;
        this.lastInSyncAt = Date.now();
        this.checkTrust();
        this.onState?.(message.state);
        return;

      case 'point':
        // A request from another device. Ignored unless this one owns the match,
        // which stops two scoreboards from scoring each other's matches. Handed
        // up rather than applied here: the engine runs in one place only.
        if (this.ownership === 'host') this.onPointRequest?.(message.winner);
        return;

      case 'undo':
        if (this.ownership === 'host') this.onUndoRequest?.();
        return;

      case 'syncRequest':
        // A mirror noticed it was behind. Only a scoreboard can answer, and it
        // answers with the whole match.
        if (this.ownership === 'host') void this.publish();
        return;

      case 'clock': {
        if (this.ownership !== 'host') return;
        // Answered with both ends of the handling, so the asker can cancel the
        // travel out rather than mistake it for a difference between clocks.
        const receivedAt = Date.now();
        this.emit({
          kind: 'clockReply',
          askedAt: message.sentAt,
          receivedAt,
          sentAt: Date.now(),
        });
        void this.publish();
        return;
      }

      case 'clockReply': {
        if (this.ownership === 'host') return;
        const heardAt = Date.now();
        this.clockOffsetMs =
          (message.receivedAt - message.askedAt + (message.sentAt - heardAt)) / 2;
        return;
      }

      case 'alive':
        if (this.ownership === 'host') return;
        if (message.revision === this.seenRevision) {
          // Arriving proved it is there; agreeing proves this screen is right.
          this.lastInSyncAt = Date.now();
          this.checkTrust();
          return;
        }
        // The scoreboard has moved on and this device never got the message that
        // said so. Ask for the match rather than keep showing a score now known
        // to be behind.
        this.emit({ kind: 'syncRequest' });
        return;
    }
  }
}
