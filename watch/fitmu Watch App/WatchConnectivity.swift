import WatchConnectivity
import Foundation

// Singleton managing WCSession between Watch and iPhone.
// Unsent payloads (when iPhone is unreachable) are queued in UserDefaults
// and flushed automatically when reachability is restored.
class WatchConnectivityManager: NSObject, WCSessionDelegate, ObservableObject {
    static let shared = WatchConnectivityManager()

    @Published var todayHabit: String = "Keep moving today!"
    @Published var waterTarget: Int = 3000
    @Published var waterCurrent: Int = 0

    private let pendingQueueKey = "fitmu.pendingMessageQueue"

    override private init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: - Public send helpers

    func logWater(amount: Int = 250) {
        sendMessage(["type": "water", "amount": amount])
    }

    func logWeight(_ kg: Double) {
        sendMessage(["type": "weight", "value": kg])
    }

    func sendHealthData(steps: Int, heartRate: Double) {
        sendMessage(["type": "health", "steps": steps, "heartRate": heartRate])
    }

    // MARK: - Internal send + queue

    private func sendMessage(_ message: [String: Any]) {
        guard WCSession.default.isReachable else {
            queuePayload(message)
            return
        }
        WCSession.default.sendMessage(message, replyHandler: nil) { [weak self] error in
            NSLog("[WatchConnectivity] sendMessage failed: %@", error.localizedDescription)
            self?.queuePayload(message)
        }
    }

    private func queuePayload(_ message: [String: Any]) {
        var queue = UserDefaults.standard.array(forKey: pendingQueueKey) as? [[String: Any]] ?? []
        queue.append(message)
        UserDefaults.standard.set(queue, forKey: pendingQueueKey)
    }

    private func flushQueue() {
        guard WCSession.default.isReachable else { return }
        let queue = UserDefaults.standard.array(forKey: pendingQueueKey) as? [[String: Any]] ?? []
        guard !queue.isEmpty else { return }
        // Clear before re-sending; individual failures will re-queue via sendMessage's errorHandler.
        UserDefaults.standard.removeObject(forKey: pendingQueueKey)
        for message in queue {
            sendMessage(message)
        }
    }

    // MARK: - Receive from iPhone

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            if let habit = message["todayHabit"] as? String {
                self.todayHabit = habit
            }
            if let target = message["waterTarget"] as? Int {
                self.waterTarget = target
            }
            if let current = message["waterCurrent"] as? Int {
                self.waterCurrent = current
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            if let habit = applicationContext["todayHabit"] as? String {
                self.todayHabit = habit
            }
            if let target = applicationContext["waterTarget"] as? Int {
                self.waterTarget = target
            }
            if let current = applicationContext["waterCurrent"] as? Int {
                self.waterCurrent = current
            }
        }
    }

    // MARK: - Required WCSessionDelegate

    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        if let error = error {
            NSLog("[WatchConnectivity] activation error: %@", error.localizedDescription)
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        if session.isReachable {
            flushQueue()
        }
    }
}
