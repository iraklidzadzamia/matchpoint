import ExpoModulesCore
import MultipeerConnectivity

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

public class MatchLinkModule: Module {
  private var session: MCSession?
  private var advertiser: MCNearbyServiceAdvertiser?
  private var browser: MCNearbyServiceBrowser?
  private var peerID: MCPeerID?

  /// Peers seen while browsing, keyed by the id handed to JavaScript.
  private var found: [String: MCPeerID] = [:]
  /// What each of them is advertising, so the list can show a name and a code.
  private var details: [String: [String: String]] = [:]
  /// Ids we are willing to accept an invitation from — set by `connect`.
  private var invitedTo: Set<String> = []

  public func definition() -> ModuleDefinition {
    Name("MatchLink")

    Events("onPeersChanged", "onMessage", "onConnectionChanged")

    /// Becomes findable as `name`, with `code` alongside so a person choosing
    /// between two identically-named matches can tell them apart.
    AsyncFunction("advertise") { (name: String, code: String) in
      self.ensureSession()
      guard let peerID = self.peerID else { return }

      self.advertiser?.stopAdvertisingPeer()
      let advertiser = MCNearbyServiceAdvertiser(
        peer: peerID,
        discoveryInfo: ["name": name, "code": code],
        serviceType: serviceType
      )
      advertiser.delegate = self
      advertiser.startAdvertisingPeer()
      self.advertiser = advertiser
    }

    AsyncFunction("stopAdvertising") {
      self.advertiser?.stopAdvertisingPeer()
      self.advertiser = nil
    }

    AsyncFunction("startBrowsing") {
      self.ensureSession()
      guard let peerID = self.peerID else { return }

      self.found.removeAll()
      self.details.removeAll()

      self.browser?.stopBrowsingForPeers()
      let browser = MCNearbyServiceBrowser(peer: peerID, serviceType: serviceType)
      browser.delegate = self
      browser.startBrowsingForPeers()
      self.browser = browser
      self.emitPeers()
    }

    AsyncFunction("stopBrowsing") {
      self.browser?.stopBrowsingForPeers()
      self.browser = nil
    }

    /// Invites exactly the device that was chosen. Never whoever answered first:
    /// with several groups on neighbouring courts, that is how you end up
    /// mirroring a stranger's match.
    AsyncFunction("connect") { (peerId: String) in
      guard let peer = self.found[peerId], let session = self.session else { return }
      self.invitedTo.insert(peerId)
      self.browser?.invitePeer(peer, to: session, withContext: nil, timeout: 20)
    }

    AsyncFunction("disconnect") {
      self.session?.disconnect()
      self.invitedTo.removeAll()
    }

    /// Sends an already-encoded message. Reliable delivery, because a dropped
    /// state update leaves a second screen showing a score that never existed.
    AsyncFunction("send") { (payload: String) in
      guard
        let session = self.session,
        !session.connectedPeers.isEmpty,
        let data = payload.data(using: .utf8)
      else { return }
      try? session.send(data, toPeers: session.connectedPeers, with: .reliable)
    }

    OnDestroy {
      self.advertiser?.stopAdvertisingPeer()
      self.browser?.stopBrowsingForPeers()
      self.session?.disconnect()
    }
  }

  private func ensureSession() {
    if session != nil { return }
    let peerID = MCPeerID(displayName: UIDevice.current.name)
    let session = MCSession(peer: peerID, securityIdentity: nil, encryptionPreference: .required)
    session.delegate = self
    self.peerID = peerID
    self.session = session
  }

  fileprivate func emitPeers() {
    let peers = found.keys.map { id -> [String: String] in
      [
        "id": id,
        "name": details[id]?["name"] ?? id,
        "code": details[id]?["code"] ?? "----",
      ]
    }
    sendEvent("onPeersChanged", ["peers": peers])
  }
}

extension MatchLinkModule: MCNearbyServiceBrowserDelegate {
  public func browser(
    _ browser: MCNearbyServiceBrowser,
    foundPeer peerID: MCPeerID,
    withDiscoveryInfo info: [String: String]?
  ) {
    let id = peerID.displayName
    found[id] = peerID
    details[id] = info ?? [:]
    emitPeers()
  }

  public func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
    let id = peerID.displayName
    found.removeValue(forKey: id)
    details.removeValue(forKey: id)
    emitPeers()
  }

  public func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
    sendEvent("onConnectionChanged", ["state": "error", "message": error.localizedDescription])
  }
}

extension MatchLinkModule: MCNearbyServiceAdvertiserDelegate {
  public func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didReceiveInvitationFromPeer peerID: MCPeerID,
    withContext context: Data?,
    invitationHandler: @escaping (Bool, MCSession?) -> Void
  ) {
    // A scoreboard accepts anybody who asks: the person joining has already
    // picked it deliberately, by reading the code off its screen.
    invitationHandler(true, session)
  }

  public func advertiser(
    _ advertiser: MCNearbyServiceAdvertiser,
    didNotStartAdvertisingPeer error: Error
  ) {
    sendEvent("onConnectionChanged", ["state": "error", "message": error.localizedDescription])
  }
}

extension MatchLinkModule: MCSessionDelegate {
  public func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
    let name: String
    switch state {
    case .connected: name = "connected"
    case .connecting: name = "connecting"
    default: name = "disconnected"
    }
    sendEvent("onConnectionChanged", ["state": name, "peerId": peerID.displayName])
  }

  public func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
    guard let payload = String(data: data, encoding: .utf8) else { return }
    sendEvent("onMessage", ["payload": payload, "fromPeerId": peerID.displayName])
  }

  public func session(
    _ session: MCSession,
    didReceive stream: InputStream,
    withName streamName: String,
    fromPeer peerID: MCPeerID
  ) {}

  public func session(
    _ session: MCSession,
    didStartReceivingResourceWithName resourceName: String,
    fromPeer peerID: MCPeerID,
    with progress: Progress
  ) {}

  public func session(
    _ session: MCSession,
    didFinishReceivingResourceWithName resourceName: String,
    fromPeer peerID: MCPeerID,
    at localURL: URL?,
    withError error: Error?
  ) {}
}
