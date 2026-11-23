import SwiftUI
import UIKit

/// A scene-local window covers sheets such as Quick Look as well as the main view.
struct PrivacyCurtain: UIViewRepresentable {
    var isVisible: Bool

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WindowObserverView {
        let view = WindowObserverView()
        view.isUserInteractionEnabled = false
        view.didFindScene = { [weak coordinator = context.coordinator] scene in
            coordinator?.update(scene: scene)
        }
        return view
    }

    func updateUIView(_ uiView: WindowObserverView, context: Context) {
        context.coordinator.isVisible = isVisible
        context.coordinator.update(scene: uiView.window?.windowScene)
    }

    static func dismantleUIView(_ uiView: WindowObserverView, coordinator: Coordinator) {
        coordinator.hide()
    }

    @MainActor
    final class Coordinator {
        var isVisible = false
        private var shield: UIWindow?

        func update(scene: UIWindowScene?) {
            guard isVisible else { hide(); return }
            guard let scene else { return }
            if shield?.windowScene !== scene {
                hide()
                let window = UIWindow(windowScene: scene)
                window.windowLevel = .alert + 1
                window.rootViewController = UIHostingController(rootView: CurtainView())
                shield = window
            }
            shield?.isHidden = false
        }

        func hide() {
            shield?.isHidden = true
            shield = nil
        }
    }
}

@MainActor
final class WindowObserverView: UIView {
    var didFindScene: ((UIWindowScene?) -> Void)?

    override func didMoveToWindow() {
        super.didMoveToWindow()
        didFindScene?(window?.windowScene)
    }
}

private struct CurtainView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            VStack(spacing: 14) {
                Image(systemName: "lock.shield").font(.largeTitle)
                Text("支援プログラムLab").font(.headline)
                Text("教材を非表示にしています").font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
