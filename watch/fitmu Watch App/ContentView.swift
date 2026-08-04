import SwiftUI

struct ContentView: View {
    @StateObject private var connectivity = WatchConnectivityManager.shared
    @StateObject private var healthKit = HealthKitManager()

    var body: some View {
        TabView {
            // Main: Today's focus + water
            MainView(connectivity: connectivity)
                .tabItem { Label("Home", systemImage: "house.fill") }

            // Quick log
            QuickLogView(connectivity: connectivity)
                .tabItem { Label("Log", systemImage: "plus.circle.fill") }
        }
        .onAppear {
            healthKit.requestAuthorization()
        }
    }
}

struct MainView: View {
    @ObservedObject var connectivity: WatchConnectivityManager

    var waterPercent: Double {
        guard connectivity.waterTarget > 0 else { return 0 }
        return min(Double(connectivity.waterCurrent) / Double(connectivity.waterTarget), 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                // Today's habit
                VStack(alignment: .leading, spacing: 4) {
                    Text("TODAY")
                        .font(.caption2)
                        .foregroundStyle(.green)
                    Text(connectivity.todayHabit)
                        .font(.footnote)
                        .foregroundStyle(.white)
                }
                .padding(10)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))

                // Water progress
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("💧 Water")
                            .font(.caption)
                        Spacer()
                        Text("\(connectivity.waterCurrent)ml")
                            .font(.caption)
                            .foregroundStyle(.blue)
                    }
                    ProgressView(value: waterPercent)
                        .tint(.blue)
                }
                .padding(10)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
            }
            .padding()
        }
        .navigationTitle("fitmu")
    }
}
