import SwiftUI
import ProgramKit

struct SessionView: View {
    let program: Program
    @Environment(\.dismiss) private var dismiss
    @State private var stepIndex = 0
    @State private var clock = SessionClock()
    @State private var finished = false
    @State private var ending = false

    private var steps: [ProgramStep] {
        program.steps.isEmpty ? [ProgramStep(id: program.id, title: "プログラム全体", minutes: program.durationMinutes, notes: program.body)] : program.steps
    }

    private var currentStep: ProgramStep { steps[min(stepIndex, steps.count - 1)] }

    var body: some View {
        NavigationStack {
            Group {
                if finished {
                    ContentUnavailableView("今回の実施を終了しました", systemImage: "checkmark.circle", description: Text("必要な振り返りは、教材のメモに残せます。参加者の個人情報は記録しないでください。"))
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            Text(program.title).font(.subheadline).foregroundStyle(.secondary)
                            Text("工程 \(stepIndex + 1) / \(steps.count)").font(.caption).foregroundStyle(.secondary)
                            Text(currentStep.title).font(.largeTitle).fontWeight(.semibold)
                            TimelineView(.periodic(from: .now, by: 1)) { context in
                                let elapsed = clock.elapsed(at: context.date)
                                let target = TimeInterval(max(0, currentStep.minutes) * 60)
                                let remaining = clock.remaining(duration: target, at: context.date)
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(formattedClock(remaining)).font(.system(size: 64, weight: .medium, design: .rounded)).monospacedDigit().minimumScaleFactor(0.5).lineLimit(1)
                                        .accessibilityLabel("残り\(Int(remaining) / 60)分\(Int(remaining) % 60)秒")
                                        .accessibilityIdentifier("session.remaining")
                                    Text(elapsed >= target && target > 0 ? "予定時間になりました。次へ進むタイミングを判断してください。" : "予定 \(currentStep.minutes)分")
                                        .font(.subheadline).foregroundStyle(.secondary)
                                }
                            }
                            HStack {
                                Button {
                                    toggleRunning()
                                } label: {
                                    Label(clock.isRunning ? "一時停止" : "開始・再開", systemImage: clock.isRunning ? "pause.fill" : "play.fill")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.borderedProminent)
                                .accessibilityIdentifier("session.toggle")
                                Button("リセット") { clock.reset() }
                                    .buttonStyle(.bordered)
                                    .accessibilityIdentifier("session.reset")
                            }
                            if !currentStep.notes.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("進行メモ").font(.headline)
                                    Text(currentStep.notes).textSelection(.enabled)
                                }
                            }
                            Button {
                                advance()
                            } label: {
                                Label(stepIndex == steps.count - 1 ? "実施を終了" : "次の工程へ", systemImage: stepIndex == steps.count - 1 ? "checkmark" : "arrow.right")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .accessibilityIdentifier("session.next")
                            Text("背景に移っても、経過時間は開始時刻との差から計算します。アプリが終了した場合、この実施タイマーは保持されません。録音・通知は行いません。")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        .padding(24)
                        .frame(maxWidth: 640, alignment: .leading)
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle("プログラムを実施")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") {
                        if finished { dismiss() } else { ending = true }
                    }
                }
            }
            .interactiveDismissDisabled(!finished)
            .confirmationDialog("今回の実施タイマーを閉じますか？", isPresented: $ending, titleVisibility: .visible) {
                Button("閉じる", role: .destructive) { dismiss() }
                Button("実施を続ける", role: .cancel) {}
            } message: { Text("教材は残りますが、このタイマーの経過は保存されません。") }
        }
    }

    private func toggleRunning() {
        if clock.isRunning {
            clock.pause(at: Date())
        } else {
            clock.start(at: Date())
        }
    }

    private func advance() {
        let wasRunning = clock.isRunning
        clock.reset()
        if stepIndex + 1 < steps.count {
            stepIndex += 1
            if wasRunning { clock.start(at: Date()) }
        } else {
            finished = true
        }
    }

    private func formattedClock(_ interval: TimeInterval) -> String {
        let seconds = max(0, Int(interval.rounded(.up)))
        return String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }
}
