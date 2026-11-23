import SwiftUI
import ProgramKit
import UniformTypeIdentifiers

struct LibraryView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var draft: Program?
    @State private var importing = false
    @State private var message: String?
    @State private var pendingDeletion: Program?

    private var visiblePrograms: [Program] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return model.programs }
        return model.programs.filter { program in
            ([program.title, program.summary, program.body] + program.tags).joined(separator: "\n").localizedStandardContains(needle)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                if let issue = model.storageIssue {
                    Section {
                        Label("保管庫の読み込みを確認してください", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                        Text(issue).font(.footnote)
                        Text("既存のファイルを空の保管庫で上書きしません。端末のロックを解除してから再試行してください。")
                            .font(.footnote).foregroundStyle(.secondary)
                        Button("読み込みを再試行") { model.openStorage() }
                            .accessibilityIdentifier("library.retry")
                    }
                }

                if model.programs.isEmpty && model.storageIssue == nil {
                    Section {
                        ContentUnavailableView("最初の教材を保存しましょう", systemImage: "books.vertical", description: Text("右上の＋から教材を作成できます。ファイルに書き出した教材は、取り込みボタンから戻せます。"))
                            .listRowBackground(Color.clear)
                        Text("保存した教材がここに並びます。")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                } else if visiblePrograms.isEmpty && !query.isEmpty {
                    ContentUnavailableView.search(text: query)
                } else {
                    Section {
                        ForEach(visiblePrograms) { program in
                            NavigationLink {
                                ProgramDetailView(programID: program.id)
                            } label: {
                                ProgramRow(program: program)
                            }
                            .accessibilityIdentifier("library.program.\(program.id.uuidString)")
                            .swipeActions {
                                Button("削除", role: .destructive) { pendingDeletion = program }
                                    .disabled(!model.canWrite)
                            }
                        }
                    } header: {
                        Text("\(visiblePrograms.count)件の教材")
                    }
                }
            }
            .navigationTitle("教材棚")
            .searchable(text: $query, prompt: "教材名・タグ・メモで検索")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        importing = true
                    } label: {
                        Label("取り込む", systemImage: "square.and.arrow.down")
                    }
                    .disabled(!model.canWrite)
                    .accessibilityIdentifier("library.import")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        let now = Date()
                        draft = Program(id: UUID(), title: "", createdAt: now, updatedAt: now)
                    } label: {
                        Label("教材を作成", systemImage: "plus")
                    }
                    .disabled(!model.canWrite)
                    .accessibilityIdentifier("library.create")
                }
            }
            .sheet(item: $draft) { program in
                ProgramEditorView(program: program)
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                do {
                    let url = try result.get()
                    let imported = try model.importArchive(from: url)
                    message = "「\(imported.title)」を取り込みました。"
                } catch {
                    message = "取り込みを完了できませんでした。\n\(error.localizedDescription)"
                }
            }
            .confirmationDialog("この教材と添付ファイルを削除しますか？", isPresented: Binding(get: { pendingDeletion != nil }, set: { if !$0 { pendingDeletion = nil } }), titleVisibility: .visible) {
                Button("教材を削除", role: .destructive) {
                    guard let program = pendingDeletion else { return }
                    do { try model.delete(id: program.id) }
                    catch { message = "削除を完了できませんでした。\n\(error.localizedDescription)" }
                    pendingDeletion = nil
                }
                Button("キャンセル", role: .cancel) { pendingDeletion = nil }
            } message: {
                Text("この操作は取り消せません。書き出し済みのファイルは削除されません。")
            }
            .alert("教材保管庫", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
                Button("閉じる", role: .cancel) { message = nil }
            } message: { Text(message ?? "") }
        }
    }
}

private struct ProgramRow: View {
    let program: Program

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(program.title).font(.headline).foregroundStyle(.primary)
            if !program.summary.isEmpty {
                Text(program.summary).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
            HStack(spacing: 12) {
                Label("\(program.durationMinutes)分", systemImage: "clock")
                Label("添付\(program.attachments.count)点", systemImage: "paperclip")
            }
            .font(.caption).foregroundStyle(.secondary)
            if !program.tags.isEmpty {
                Text(program.tags.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
        }
        .padding(.vertical, 6)
    }
}
