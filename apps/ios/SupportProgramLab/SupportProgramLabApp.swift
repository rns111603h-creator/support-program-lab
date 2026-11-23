import SwiftUI

@main
@MainActor
struct SupportProgramLabApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environment(model)
                .tint(Color(red: 0.32, green: 0.42, blue: 0.48))
        }
    }
}

struct AppRootView: View {
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TabView {
            LibraryView()
                .tabItem { Label("教材棚", systemImage: "books.vertical") }
            SettingsView()
                .tabItem { Label("設定", systemImage: "gearshape") }
        }
        .privacySensitive()
        .background(PrivacyCurtain(isVisible: scenePhase != .active))
    }
}
