# iPhoneアプリの開発

ルートAGENTS.mdを引き継ぐ。個人アカウントと架空教材だけを使う。

- ProgramKitはSwift XCTestを先に作成し、macOS CIで狙ったREDを確認してから実装する。
- SwiftUIはSimulatorのunsigned buildを確認する。コンパイルと実操作・実機・署名・TestFlightを区別する。
- 初版のクラウド範囲は本人の回答まで未決。端末内共通機能だけを先行できる。
- ネイティブから外部APIへ資料を送信しない。クラウド連携を作る場合は別の仕様・認証・審査要件を検証する。
- ファイルの破損や読込み失敗で、既存保管庫を空にして上書きしない。
- ファイル書き出しは含まれる本文・出典・権利メモ・添付を明示し確認する。自動権利検査や適法保証を未実装のまま表示しない。
- release前にBundle ID、個人Appleチーム、privacy/supportの有効URL、実機チェックと署名archiveを確認。秘密鍵をGitに置かない。
- macOS CIでは標準runnerのみ使う。Apple有料契約・署名資格情報の登録・TestFlightアップロード・審査提出・公開は本人の判断後。
