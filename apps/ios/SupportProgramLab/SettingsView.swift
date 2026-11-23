import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var deletingAll = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("端末内の保管庫") {
                    LabeledContent("教材", value: "\(model.programs.count)件")
                    LabeledContent("添付", value: "\(model.programs.reduce(0) { $0 + $1.attachments.count })点")
                    Text("教材はこのアプリの専用領域に保存します。アプリ自身が教材を外部APIや解析サービスへ送信することはありません。")
                        .font(.footnote).foregroundStyle(.secondary)
                    Text("書き出し先や端末のバックアップ設定によっては、端末外に保存される場合があります。共有・保存先はご自身で確認してください。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("読み込み") {
                    if let issue = model.storageIssue {
                        Label("保管庫を開けません", systemImage: "exclamationmark.triangle").foregroundStyle(.orange)
                        Text(issue).font(.footnote)
                    } else {
                        Label("保管庫を読み込みました", systemImage: "checkmark.circle")
                    }
                    Button("読み込みを再試行") { model.openStorage() }
                        .accessibilityIdentifier("settings.retry")
                    Text("読み込みに失敗しても、既存ファイルを空の内容で上書きしません。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("表示とファイルの保護") {
                    Label("背景へ移ると教材画面を隠します", systemImage: "eye.slash")
                    Text("画面を隠す処理は、教材データの削除ではありません。端末内の教材ファイルには、ロック中に読み書きできない保護を設定します。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section {
                    Button("端末内データをすべて削除", role: .destructive) { deletingAll = true }
                        .accessibilityIdentifier("settings.deleteAll")
                } header: { Text("データの削除") } footer: {
                    Text("この端末の教材と添付を削除します。書き出し済みのファイルは削除されません。必要な教材は先に書き出してください。")
                }
                Section("アプリについて") {
                    Text("支援プログラムLab")
                    NavigationLink("プライバシーとデータの扱い") {
                        PrivacyView()
                    }
                    .accessibilityIdentifier("settings.privacy")
                    Text("個人プロジェクトの教材保管庫です。実利用者の個人情報や、持ち出せない業務資料は扱いません。")
                        .font(.footnote).foregroundStyle(.secondary)
                    Text("権利・利用許諾の適法性を自動判定する機能はありません。")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("設定")
            .confirmationDialog("この端末の教材と添付をすべて削除しますか？", isPresented: $deletingAll, titleVisibility: .visible) {
                Button("すべて削除", role: .destructive) {
                    do {
                        try model.deleteAllLocalData()
                        message = "端末内の教材と添付を削除しました。"
                    } catch { message = error.localizedDescription }
                }
                Button("キャンセル", role: .cancel) {}
            } message: { Text("この操作は取り消せません。書き出し済みのファイルは残ります。") }
            .alert("データ管理", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
                Button("閉じる", role: .cancel) { message = nil }
            } message: { Text(message ?? "") }
        }
    }
}
