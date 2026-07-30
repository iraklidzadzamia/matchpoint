import { Message, PeerInfo, Transport } from './protocol';

/**
 * A transport that runs entirely in memory, so the protocol and the roles above
 * it can be built and tested before any native code exists.
 *
 * Devices share one `LoopbackNetwork`. Advertising puts an entry in it, browsing
 * reads it, and a message sent by one arrives at whoever it is connected to. It
 * is not a simulation of Bluetooth — there is no latency and nothing drops — so
 * it proves the wiring, not the radio.
 */

interface Advert {
  id: string;
  name: string;
  code: string;
}

export class LoopbackNetwork {
  private adverts = new Map<string, Advert>();
  private watchers = new Set<(peers: PeerInfo[]) => void>();
  private inboxes = new Map<string, (message: Message, from: string) => void>();
  private links = new Map<string, string>();

  advertise(advert: Advert) {
    this.adverts.set(advert.id, advert);
    this.notify();
  }

  stopAdvertising(id: string) {
    this.adverts.delete(id);
    this.notify();
  }

  watch(handler: (peers: PeerInfo[]) => void): () => void {
    this.watchers.add(handler);
    handler(this.peers());
    return () => this.watchers.delete(handler);
  }

  peers(): PeerInfo[] {
    return [...this.adverts.values()].map(({ id, name, code }) => ({ id, name, code }));
  }

  listen(id: string, handler: (message: Message, from: string) => void): () => void {
    this.inboxes.set(id, handler);
    return () => this.inboxes.delete(id);
  }

  /** Connects both ways: either end can then send to the other. */
  connect(from: string, to: string) {
    this.links.set(from, to);
    this.links.set(to, from);
  }

  disconnect(id: string) {
    const other = this.links.get(id);
    if (other) this.links.delete(other);
    this.links.delete(id);
  }

  send(from: string, message: Message) {
    const to = this.links.get(from);
    if (!to) return;
    // Structured-cloned, like anything crossing a real wire, so a receiver
    // cannot end up holding the sender's own object.
    this.inboxes.get(to)?.(JSON.parse(JSON.stringify(message)), from);
  }

  private notify() {
    const peers = this.peers();
    this.watchers.forEach((handler) => handler(peers));
  }
}

export class LoopbackTransport implements Transport {
  constructor(
    private network: LoopbackNetwork,
    private id: string
  ) {}

  async advertise(info: { name: string; code: string }): Promise<void> {
    this.network.advertise({ id: this.id, ...info });
  }

  async stopAdvertising(): Promise<void> {
    this.network.stopAdvertising(this.id);
  }

  browse(onPeers: (peers: PeerInfo[]) => void): () => void {
    return this.network.watch((peers) =>
      // A device never lists itself.
      onPeers(peers.filter((peer) => peer.id !== this.id))
    );
  }

  async connect(peerId: string): Promise<void> {
    this.network.connect(this.id, peerId);
  }

  async disconnect(): Promise<void> {
    this.network.disconnect(this.id);
  }

  async send(message: Message): Promise<void> {
    this.network.send(this.id, message);
  }

  onMessage(handler: (message: Message, fromPeerId: string) => void): () => void {
    return this.network.listen(this.id, handler);
  }
}
