import HealthKit
import Foundation

class HealthKitManager: ObservableObject {
    private let store = HKHealthStore()

    @Published var todaySteps: Int = 0
    @Published var todayHeartRate: Double = 0

    private let readTypes: Set<HKSampleType> = [
        HKQuantityType(.stepCount),
        HKQuantityType(.heartRate),
    ]

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        store.requestAuthorization(toShare: [], read: readTypes) { granted, _ in
            if granted { self.fetchTodayData() }
        }
    }

    func fetchTodayData() {
        fetchSteps()
        fetchLatestHeartRate()
    }

    private func fetchSteps() {
        let type = HKQuantityType(.stepCount)
        let start = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())

        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
            DispatchQueue.main.async {
                self.todaySteps = Int(result?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
                WatchConnectivityManager.shared.sendHealthData(
                    steps: self.todaySteps,
                    heartRate: self.todayHeartRate
                )
            }
        }
        store.execute(query)
    }

    private func fetchLatestHeartRate() {
        let type = HKQuantityType(.heartRate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else { return }
            DispatchQueue.main.async {
                self.todayHeartRate = sample.quantity.doubleValue(for: HKUnit(from: "count/min"))
            }
        }
        store.execute(query)
    }
}
