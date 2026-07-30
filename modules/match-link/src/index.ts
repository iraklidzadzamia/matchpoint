import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

/**
 * The native side of the phone-to-phone link, kept as thin as it can be: find
 * devices, connect to a chosen one, move strings. It knows nothing about
 * matches, so the layer above works unchanged when the watch arrives on a
 * completely different framework.
 */

export interface NativePeer {
  id: string;
  name: string;
  code: string;
}

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface MatchLinkNativeModule {
  advertise(name: string, code: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  startBrowsing(): Promise<void>;
  stopBrowsing(): Promise<void>;
  connect(peerId: string): Promise<void>;
  disconnect(): Promise<void>;
  send(payload: string): Promise<void>;
  addListener(
    event: 'onPeersChanged',
    handler: (e: { peers: NativePeer[] }) => void
  ): EventSubscription;
  addListener(
    event: 'onMessage',
    handler: (e: { payload: string; fromPeerId: string }) => void
  ): EventSubscription;
  addListener(
    event: 'onConnectionChanged',
    handler: (e: { state: ConnectionState; peerId?: string; message?: string }) => void
  ): EventSubscription;
}

let cached: MatchLinkNativeModule | null | undefined;

/**
 * The module, or null where it does not exist.
 *
 * It is absent in Expo Go, which has only the native code Expo ships with.
 * Importing it eagerly would take the whole app down on launch there, so this
 * asks once, remembers the answer, and lets callers offer the feature or not.
 */
export function getMatchLinkModule(): MatchLinkNativeModule | null {
  if (cached !== undefined) return cached;
  try {
    cached = requireNativeModule<MatchLinkNativeModule>('MatchLink');
  } catch {
    cached = null;
  }
  return cached;
}

/** Whether this build can talk to other devices at all. */
export function isMatchLinkAvailable(): boolean {
  return getMatchLinkModule() !== null;
}
