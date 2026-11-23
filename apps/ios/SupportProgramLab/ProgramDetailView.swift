import SwiftUI
import ProgramKit
import QuickLook
import UniformTypeIdentifiers

struct ProgramDetailView: View {
    let programID: UUID
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var editing = false
    @State private var importingAttachment = false
    @State private var previewURL: URL?
    @State private var reviewingExport = false
    @State private var exporting = false
    @State private var exportAfterReview = false
    @State private var exportDocument: ArchiveDocument?
    @State private var runningSession = false
    @State private var deleting = false
    @State private var message: String?

    var body: some View {
        Group {
            if let program = model.program(id: programID) {
                detail(program)
            } else {
                ContentUnavailableView("教材を開けません", systemImage: "doc.questionmark", description: Text("教材が削除されたか、保管庫の読み込みに失敗しています。教材棚と設定から状態を確認してください。"))
            }
        }
        .alert("教材", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
            Button("閉じる", role: .cancel) { message = nil }
        } message: { Text(message ?? "") }
    }

    private func detail(_ program: Program) -> some View {
        List {
            Section {
                Text(program.title).font(.title2).fontWeight(.semibold)
                if !program.summary.isEmpty { Text(program.summary).textSelection(.enabled) }
                LabeledContent("予定時間", value: "\(program.durationMinutes)分")
                if !program.tags.isEmpty {
                    Text(program.tags.joined(separator: " · ")).font(.subheadline).foregroundStyle(.secondary)
                }
                LabeledContent("更新日") {
                    Text(program.updatedAt, format: .dateTime.year().month().day())
                }
                Button { runningSession = true } label: {
                    Label("この教材で実施する", systemImage: "play.circle.fill")
                }
                .accessibilityIdentifier("program.startSession")
            }
            if !program.body.isEmpty {
                Section("進め方・メモ") {
                    Text(program.body).textSelection(.enabled)
                }
            }
            if !program.steps.isEmpty {
                Section("当日の工程") {
                    ForEach(program.steps) { step in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(step.title).fontWeight(.medium)
                                Spacer(minLength: 12)
                                Text("\(step.minutes)分").foregroundStyle(.secondary)
                            }
                            if !step.notes.isEmpty { Text(step.notes).font(.subheadline).foregroundStyle(.secondary) }
                        }
                        .padding(.vertical, 3)
                    }
                }
            }
            Section {
                if program.attachments.isEmpty {
                    Text("添付ファイルはありません。").foregroundStyle(.secondary)
                }
                ForEach(program.attachments) { attachment in
                    Button {
                        do { previewURL = try model.attachmentURL(programID: program.id, attachmentID: attachment.id) }
                        catch { message = "添付を開けませんでした。\n\(error.localizedDescription)" }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "doc.text").imageScale(.large)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(attachment.filename).foregroundStyle(.primary)
                                Text(ByteCountFormatter.string(fromByteCount: Int64(attachment.sizeBytes), countStyle: .file))
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "eye").foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 3)
                    }
                    .accessibilityLabel("\(attachment.filename)をプレビュー")
                }
                Button { importingAttachment = true } label: {
                    Label("ファイルを追加", systemImage: "paperclip.badge.ellipsis")
                }
                .disabled(!model.canWrite)
                .accessibilityIdentifier("program.addAttachment")
            } header: { Text("教材ファイル \(program.attachments.count)点") } footer: {
                Text("PDF・PPTX・DOCX・PNG・JPEG・TXT・Markdown。10点以内、合計10MBまで。表示できる形式はQuick Lookで開きます。")
            }
            Section("出典・権利メモ") {
                if program.sourceURL.isEmpty && program.rightsBasis.isEmpty {
                    Text("まだ記録がありません。素材の出典や利用許諾を、編集画面から残せます。")
                        .foregroundStyle(.secondary)
                }
                if !program.sourceURL.isEmpty {
                    if let url = URL(string: program.sourceURL), ["https", "http"].contains(url.scheme?.lowercased() ?? "") {
                        Link(destination: url) { Label(program.sourceURL, systemImage: "arrow.up.right.square") }
                    } else { Text(program.sourceURL).textSelection(.enabled) }
                }
                if !program.rightsBasis.isEmpty { Text(program.rightsBasis).textSelection(.enabled) }
                Text("権利や許諾を自動判定する機能はありません。非公開の保存でも、利用条件を満たすとは限りません。")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Button { reviewingExport = true } label: {
                    Label("確認して教材を書き出す", systemImage: "square.and.arrow.up")
                }
                .disabled(!model.canWrite)
                .accessibilityIdentifier("program.export")
                Text("本文・出典・権利メモ・添付を含むJSONです。ほかの端末へ渡したり、ファイルから再取り込みできます。")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Button("教材を削除", role: .destructive) { deleting = true }
                    .disabled(!model.canWrite)
                    .accessibilityIdentifier("program.delete")
            }
        }
        .navigationTitle("教材の詳細")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("編集") { editing = true }
                    .disabled(!model.canWrite)
                    .accessibilityIdentifier("program.edit")
            }
        }
        .sheet(isPresented: $editing) { ProgramEditorView(program: program) }
        .sheet(isPresented: $runningSession) { SessionView(program: program) }
        .sheet(isPresented: $reviewingExport, onDismiss: {
            if exportAfterReview {
                exportAfterReview = false
                exporting = true
            }
        }) {
            ExportReviewView(program: program) {
                let data = try model.exportProgram(id: program.id, acknowledged: true)
                exportDocument = ArchiveDocument(data: data)
                exportAfterReview = true
            }
        }
        .fileExporter(isPresented: $exporting, document: exportDocument, contentType: .json, defaultFilename: ProgramFileTypes.exportFilename(for: program.title)) { result in
            switch result {
            case .success:
                message = "教材を書き出しました。共有する場合は、書き出し先のファイルを相手に渡してください。"
            case .failure(let error):
                if (error as NSError).code != NSUserCancelledError { message = "書き出しを完了できませんでした。\n\(error.localizedDescription)" }
            }
            exportDocument = nil
        }
        .fileImporter(isPresented: $importingAttachment, allowedContentTypes: ProgramFileTypes.attachments, allowsMultipleSelection: true) { result in
            var added = 0
            do {
                for url in try result.get() {
                    try model.addAttachment(programID: program.id, from: url)
                    added += 1
                }
            } catch {
                message = "\(added)点を追加しました。残りの取り込みを完了できませんでした。\n\(error.localizedDescription)"
            }
        }
        .quickLookPreview($previewURL)
        .confirmationDialog("この教材と添付ファイルを削除しますか？", isPresented: $deleting, titleVisibility: .visible) {
            Button("教材を削除", role: .destructive) {
                do {
                    try model.delete(id: program.id)
                    dismiss()
                } catch { message = "削除を完了できませんでした。\n\(error.localizedDescription)" }
            }
            Button("キャンセル", role: .cancel) {}
        } message: { Text("この操作は取り消せません。書き出し済みのファイルは残ります。") }
    }
}

private struct ExportReviewView: View {
    let program: Program
    let onConfirm: () throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var checkedContent = false
    @State private var checkedRights = false
    @State private var checkedPrivacy = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("書き出される内容") {
                    Text(program.title).font(.headline)
                    Text("教材名・概要・本文・タグ・予定時間・工程・出典URL・権利メモ・添付\(program.attachments.count)点が、1つのJSONに含まれます。")
                    Text("権利メモも含まれます。書き出したファイルは、相手への送付後に遠隔で取り消せません。")
                        .font(.footnote).foregroundStyle(.secondary)
                    Toggle("含まれる内容と渡す相手を確認しました", isOn: $checkedContent)
                        .accessibilityIdentifier("export.confirmContent")
                }
                Section("素材・利用条件の確認") {
                    Text("第三者の文章・画像・ロゴ・テンプレートなどが含まれる場合は、配布・複製・改変の条件を確認してください。この画面は自動検査や適法保証ではありません。")
                        .font(.subheadline)
                    if program.rightsBasis.isEmpty {
                        Label("権利メモは未記入です", systemImage: "info.circle").foregroundStyle(.secondary)
                    } else { Text(program.rightsBasis).font(.footnote).foregroundStyle(.secondary) }
                    Toggle("素材の出典と利用条件を確認しました", isOn: $checkedRights)
                        .accessibilityIdentifier("export.confirmRights")
                    Toggle("個人情報や持ち出せない資料がないことを確認しました", isOn: $checkedPrivacy)
                        .accessibilityIdentifier("export.confirmPrivacy")
                }
            }
            .navigationTitle("書き出す前に確認")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("キャンセル") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("書き出す") {
                        do { try onConfirm(); dismiss() }
                        catch { errorMessage = error.localizedDescription }
                    }
                    .disabled(!checkedContent || !checkedRights || !checkedPrivacy)
                    .accessibilityIdentifier("export.continue")
                }
            }
            .alert("書き出せませんでした", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("閉じる", role: .cancel) { errorMessage = nil }
            } message: { Text(errorMessage ?? "") }
        }
    }
}
