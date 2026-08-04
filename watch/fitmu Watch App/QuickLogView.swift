import SwiftUI

struct QuickLogView: View {
    @ObservedObject var connectivity: WatchConnectivityManager
    @State private var weightValue: Double = 100.0
    @State private var showWeightPicker = false
    @State private var waterLogged = false
    @State private var weightLogged = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Water +250ml
                Button {
                    connectivity.logWater(amount: 250)
                    withAnimation { waterLogged = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        waterLogged = false
                    }
                } label: {
                    HStack {
                        Text("💧")
                        Text(waterLogged ? "Logged!" : "+250ml Water")
                            .font(.footnote)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(waterLogged ? Color.green.opacity(0.3) : Color.blue.opacity(0.2))
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)

                // Log weight
                VStack(spacing: 6) {
                    Text("⚖️ Log Weight")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("Weight", selection: $weightValue) {
                        ForEach(stride(from: 50.0, to: 250.0, by: 0.5).map { $0 }, id: \.self) { w in
                            Text(String(format: "%.1f kg", w)).tag(w)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 60)

                    Button {
                        connectivity.logWeight(weightValue)
                        withAnimation { weightLogged = true }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            weightLogged = false
                        }
                    } label: {
                        Text(weightLogged ? "Saved!" : "Save Weight")
                            .font(.footnote)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(weightLogged ? Color.green.opacity(0.3) : Color.green.opacity(0.2))
                            .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
        .navigationTitle("Quick Log")
    }
}
