import {
  getMatchLinkModule,
  isMatchLinkAvailable,
  NativePeer,
} from '../../modules/match-link/src';
import { ConnectionState, Message, PeerInfo, Transport } from './protocol';

/**
 * The real transport: Multipeer Connectivity, wrapped to look like every other
 * one. It carries over Bluetooth or peer-to-peer Wi-Fi and needs no router,
 * which matters because a padel court rarely has usable Wi-Fi.
 *
 * Nothing above this file knows any of that. Swapping in the loopback transport
 * for tests, or WatchConnectivity for the watch, changes only which object is
 * constructed.
 */
export class MultipeerTransport implements Transport {
  private native = getMatchLinkModule();

  static get available(): boolean {
    return isMatchLinkAvailable();
  }

  async advertise(info: { name: string; code: string }): Promise<void> {
    await this.native?.advertise(info.name, info.code);
  }

  async stopAdvertising(): Promise<void> {
    await this.native?.stopAdvertising();
  }

  browse(onPeers: (peers: PeerInfo[]) => void): () => void {
    if (!this.native) return () => {};

    const subscription = this.native.addListener('onPeersChanged', ({ peers }) =>
      onPeers(peers.map(toPeerInfo))
    );
    void this.native.startBrowsing();

    return () => {
      subscription.remove();
      void this.native?.stopBrowsing();
    };
  }

  async connect(peerId: string): Promise<void> {
    await this.native?.connect(peerId);
  }

  async disconnect(): Promise<void> {
    await this.native?.disconnect();
  }

  async send(message: Message): Promise<void> {
    // The native side moves opaque strings, so the shape of a message stays a
    // TypeScript concern and Swift never needs to learn what a match is.
    await this.native?.send(JSON.stringify(message));
  }

  onConnection(handler: (state: ConnectionState) => void): () => void {
    if (!this.native) return () => {};
    const subscription = this.native.addListener('onConnectionChanged', ({ state }) =>
      handler(state)
    );
    return () => subscription.remove();
  }

  onMessage(handler: (message: Message, fromPeerId: string) => void): () => void {
    if (!this.native) return () => {};

    const subscription = this.native.addListener('onMessage', ({ payload, fromPeerId }) => {
      try {
        handler(JSON.parse(payload) as Message, fromPeerId);
      } catch {
        // A message that will not parse came from a different version of the
        // app. Dropping it is right: acting on half of one would be worse.
      }
    });
    return () => subscription.remove();
  }
}

const toPeerInfo = (peer: NativePeer): PeerInfo => ({
  id: peer.id,
  name: peer.name,
  code: peer.code,
});
