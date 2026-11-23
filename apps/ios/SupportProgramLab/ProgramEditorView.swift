import SwiftUI
import ProgramKit

struct ProgramEditorView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Program
    @State private var tagText: String
    @State private var errorMessage: String?
    @State private var discardConfirmation = false

    init(program: Program) {
        _draft = State(initialValue: program)
        _tagText = State(initialValue: program.tags.joined(separator: ", "))
    }

    private var totalStepMinutes: Int { draft.steps.reduce(0) { $0 + $1.minutes } }

    var body: some View {
        NavigationStack {
            Form {
                Section("教材") {
                    TextField("教材名", text: $draft.title)
                        .accessibilityIdentifier("editor.title")
                    TextField("ねらい・対象など", text: $draft.summary, axis: .vertical)
                        .lineLimit(2...5)
                        .accessibilityIdentifier("editor.summary")
                    Stepper("予定時間 \(draft.durationMinutes)分", value: $draft.durationMinutes, in: 1...480, step: 5)
                    TextField("タグ（カンマ区切り）", text: $tagText)
                        .accessibilityIdentifier("editor.tags")
                }
                Section("進め方・メモ") {
                    TextEditor(text: $draft.body)
                        .frame(minHeight: 160)
                        .accessibilityLabel("進め方・メモ")
                        .accessibilityIdentifier("editor.body")
                }
                Section {
                    ForEach($draft.steps) { $step in
                        VStack(alignment: .leading, spacing: 10) {
                            TextField("工程名", text: $step.title)
                            Stepper("\(step.minutes)分", value: $step.minutes, in: 1...240)
                            TextField("声かけ・準備のメモ", text: $step.notes, axis: .vertical)
                                .font(.subheadline)
                        }
                        .padding(.vertical, 4)
                    }
                    .onDelete { draft.steps.remove(atOffsets: $0) }
                    .onMove { draft.steps.move(fromOffsets: $0, toOffset: $1) }
                    Button { draft.steps.append(ProgramStep(id: UUID(), title: "", minutes: 5)) } label: {
                        Label("工程を追加", systemImage: "plus.circle")
                    }
                    .accessibilityIdentifier("editor.addStep")
                    if !draft.steps.isEmpty {
                        LabeledContent("工程の合計", value: "\(totalStepMinutes)分")
                        Button("予定時間を工程の合計に合わせる") { draft.durationMinutes = totalStepMinutes }
                            .disabled(totalStepMinutes < 1 || totalStepMinutes > 480)
                    }
                } header: { Text("当日の工程") } footer: {
                    Text("工程を設定すると、実施画面で順番にタイマーを使えます。工程がない場合は、予定時間全体のタイマーを使います。")
                }
                Section {
                    TextField("出典URL（任意）", text: $draft.sourceURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityIdentifier("editor.sourceURL")
                    TextField("素材の作成者・利用許諾など", text: $draft.rightsBasis, axis: .vertical)
                        .lineLimit(3...8)
                        .accessibilityIdentifier("editor.rightsBasis")
                } header: { Text("出典・権利メモ") } footer: {
                    Text("自動の権利検査は行いません。第三者素材の利用条件は、ご自身で確認してください。このメモも教材を書き出す際に含まれます。")
                }
                Section {
                    Text("添付ファイルは、教材を保存した後の詳細画面から追加・プレビューできます。")
                        .font(.footnote).foregroundStyle(.secondary)
                    Text("実利用者の氏名・写真・支援記録や、持ち出せない業務資料は保存しないでください。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("教材を編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { discardConfirmation = true }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }
                        .fontWeight(.semibold)
                        .disabled(!model.canWrite || draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .accessibilityIdentifier("editor.save")
                }
                ToolbarItem(placement: .bottomBar) { EditButton() }
            }
            .interactiveDismissDisabled()
            .confirmationDialog("編集内容を破棄しますか？", isPresented: $discardConfirmation, titleVisibility: .visible) {
                Button("破棄して閉じる", role: .destructive) { dismiss() }
                Button("編集を続ける", role: .cancel) {}
            }
            .alert("保存できませんでした", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("閉じる", role: .cancel) { errorMessage = nil }
            } message: { Text(errorMessage ?? "") }
        }
    }

    private func save() {
        var program = draft
        program.title = program.title.trimmingCharacters(in: .whitespacesAndNewlines)
        program.tags = tagText.components(separatedBy: CharacterSet(charactersIn: ",、")).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        program.updatedAt = Date()
        do {
            try model.save(program)
            dismiss()
        } catch { errorMessage = error.localizedDescription }
    }
}
