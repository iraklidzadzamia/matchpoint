import ExpoModulesCore
import MultipeerConnectivity
import UIKit

/**
 * Carries match messages between nearby devices.
 *
 * Multipeer Connectivity is used because it picks its own path — Bluetooth,
 * peer-to-peer Wi-Fi, or the local network, whichever is available. A padel
 * court often has no usable Wi-Fi, and this needs no router either way. It
 * takes up to eight devices in one session, which is more than a scoreboard,
 * a second screen and a few cameras will ever need.
 *
 * This file is deliberately thin. It finds devices, connects to the one it is
 * told to, and moves opaque strings. Everything about matches, scores and roles
 * lives in TypeScript, so the watch — which needs a completely different
 * framework — can reuse all of it.
 */

private let serviceType = "matchpoint-mp"

/**
 * Does the actual Multipeer work.
 *
 * This is separate from the module for a reason that is not obvious and cost
 * two failed builds: `MCSessionDelegate` and its siblings are **Objective-C**
 * protocols, so anything conforming to them must inherit from `NSObject`.
 * Expo's `Module` inherits from `BaseModule`, which is a plain Swift class, so
 * the module itself cannot be the delegate. It compiles nowhere and the error
 * arrives only from a build machine.
 */
final class MultipeerCoordinator: NSObject {
  private let peerID = MCPeerID(displayName: UIDevice.current.name)
  private lazy var session: MCSession = {
    let session = MCSession(peer: peerID, securityIdentity: nil, encryptionPreference: .required)
    session.delegate = self
    return session
  }()

  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?

  /// Peers seen while browsing, and what each is advertising about itself.
  private var found: [String: MCPeerID] = [:]
  private var details: [String: [String: String]] = [:]

  var onPeers: (([[String: String]]) -> Void)?
  var onMessage: ((String, String) -> Void)?
  var onConnection: ((String, String?, String?) -> Void)?

  func advertise(name: String, code: String) {
    advertiser?.stopAdvertisingPeer()
    let advertiser = MCNearbyServiceAdvertiser(
      peer: peerID,
      discoveryInfo: ["name": name, "code": code],
      serviceType: serviceType
    )
    advertiser.delegate = self
    advertiser.startAdvertisingPeer()
    self.advertiser = advertiser
  }

  func stopAdvertising() {
    advertiser?.stopAdvertisingPeer()
    advertiser = nil
  }

  func startBrowsing() {
    found.removeAll()
    details.removeAll()

    browser?.stopBrowsingForPeers()
    let browser = MCNearbyServiceBrowser(peer: peerID, serviceType: serviceType)
    browser.delegate = self
    browser.startBrowsingForPeers()
    self.browser = browser
    emitPeers()
  }

  func stopBrowsing() {
    browser?.stopBrowsingForPeers()
    browser = nil
  }

  /// Invites exactly the device that was chosen. Never whoever answered first:
  /// with several groups on neighbouring courts, that is how you end up
  /// mirroring a stranger's match.
  func connect(peerId: String) {
    guard let peer = found[peerId] else { return }
    browser?.invitePeer(peer, to: session, withContext: nil, timeout: 20)
  }

  func disconnect() {
    session.disconnect()
  }

  /// Reliable delivery: a dropped state update leaves a second screen showing a
  /// score that never existed.
  func send(payload: String) {
    guard !session.connectedPeers.isEmpty, let data = payload.data(using: .utf8) else { return }
    try? session.send(data, toPeers: session.connectedPeers, with: .reliable)
  }

  func teardown() {
    stopAdvertising()
    stopBrowsing()
    session.disconnect()
  }

  fileprivate func emitPeers() {
    onPeers?(
      found.keys.map { id in
        [
          "id": id,
          "name": details[id]?["name"] ?? id,
          "code": details[id]?["code"] ?? "----",
        ]
      }
    )
  }
}

extension MultipeerCoordinator: MCNearbyServiceBrowserDelegate {
  func browser(
    _ browser: MCNearbyServiceBrowser,
    foundPeer peerID: MCPeerID,
    withDiscoveryInfo info: [String: String]?
  ) {
    found[peerID.displayName] = peerID
    details[peerID.displayName] = info ?? [:]
    emitPeers()
  }

  func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
    found.removeValue(forKey: peerID.displayName)
    details.removeValue(forKey: peerID.displayName)
    emitPeers()
  }

  func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
    onConnection?("error", nil, error.localizedDescription)
  }
}

extension MultipeerCoordinator: MCNearbyServiceAdvertiserDelegate {
  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didReceiveInvitationFromPeer peerID: MCPeerID,
    withContext context: Data?,
    invitationHandler: @escaping (Bool, MCSession?) -> Void
  ) {
    // A scoreboard accepts anybody who asks: the person joining has already
    // picked it deliberately, by reading the code off its screen.
    invitationHandler(true, session)
  }

  func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didNotStartAdvertisingPeer error: Error
  ) {
    onConnection?("error", nil, error.localizedDescription)
  }
}

extension MultipeerCoordinator: MCSessionDelegate {
  func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    let name: String
    switch state {
    case .connected: name = "connected"
    case .connecting: name = "connecting"
    default: name = "disconnected"
    }
    onConnection?(name, peerID.displayName, nil)
  }

  func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    guard let payload = String(data: data, encoding: .utf8) else { return }
    onMessage?(payload, peerID.displayName)
  }

  func session(
    _ session: MCSession,
    didReceive stream: InputStream,
    withName streamName: String,
    fromPeer peerID: MCPeerID
  ) {}

  func session(
    _ session: MCSession,
    didStartReceivingResourceWithName resourceName: String,
    fromPeer peerID: MCPeerID,
    with progress: Progress
  ) {}

  func session(
    _ session: MCSession,
    didFinishReceivingResourceWithName resourceName: String,
    fromPeer peerID: MCPeerID,
    at localURL: URL?,
    withError error: Error?
  ) {}
}

public class MatchLinkModule: Module {
  private let coordinator = MultipeerCoordinator()

  public func definition() -> ModuleDefinition {
    Name("MatchLink")

    Events("onPeersChanged", "onMessage", "onConnectionChanged")

    OnCreate {
      self.coordinator.onPeers = { [weak self] peers in
        self?.sendEvent("onPeersChanged", ["peers": peers])
      }
      self.coordinator.onMessage = { [weak self] payload, from in
        self?.sendEvent("onMessage", ["payload": payload, "fromPeerId": from])
      }
      self.coordinator.onConnection = { [weak self] state, peerId, message in
        var body: [String: Any] = ["state": state]
        if let peerId { body["peerId"] = peerId }
        if let message { body["message"] = message }
        self?.sendEvent("onConnectionChanged", body)
      }
    }

    /// Becomes findable as `name`, with `code` alongside so a person choosing
    /// between two identically-named matches can tell them apart.
    AsyncFunction("advertise") { (name: String, code: String) in
      self.coordinator.advertise(name: name, code: code)
    }

    AsyncFunction("stopAdvertising") {
      self.coordinator.stopAdvertising()
    }

    AsyncFunction("startBrowsing") {
      self.coordinator.startBrowsing()
    }

    AsyncFunction("stopBrowsing") {
      self.coordinator.stopBrowsing()
    }

    AsyncFunction("connect") { (peerId: String) in
      self.coordinator.connect(peerId: peerId)
    }

    AsyncFunction("disconnect") {
      self.coordinator.disconnect()
    }

    AsyncFunction("send") { (payload: String) in
      self.coordinator.send(payload: payload)
    }

    OnDestroy {
      self.coordinator.teardown()
    }
  }
}
