# 支援プログラムLab — iPhoneネイティブ版

App Store配信を目指す開発中のSwiftUIアプリです。WebViewで既存サイトを表示する方式ではなく、教材棚・編集・端末内ファイル・Quick Look・書き出し・進行タイマーをネイティブで扱います。

**まだApp Storeへ提出できる完成状態ではありません。** 初版にクラウド個人・チーム保管庫を含めるかは本人の回答待ちです。現在の実装は、どちらにも使う端末内の共通部分です。既存Web版のログイン・チーム・リンク共有との同期は未実装です。Web版はPR #9に残し、このiOS開発はそのブランチを土台にした別のDraft PRへ分けます。

## 開発

Xcode 26以降のMacで `SupportProgramLab.xcodeproj` を開き、共有Scheme `SupportProgramLab` を選びます。deployment targetはiOS 17、対象はiPhoneです。提出用のSDK要件と、利用者端末の最低OSは別です。

```sh
swift test --package-path apps/ios/ProgramKit
xcodebuild -project apps/ios/SupportProgramLab.xcodeproj -scheme SupportProgramLab -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
python3 -m unittest discover -s apps/ios/scripts -p 'test_*.py'
```

コマンドはリポジトリのルートから実行します。Linuxの開発環境にはSwift/Xcodeがないため、Swiftの実行証拠はGitHubの標準macOS runnerで確認します。署名やApple認証情報をCIに登録せず、Simulatorのbuild・install・起動・スクリーンショットを保存する定義です。実機操作・署名・TestFlightとは区別します。

## 端末内の保存と入出力

ProgramKitは、教材・進行工程・出典・権利メモと添付をアプリ専用領域へ保存します。ファイルの読込み失敗時に、空の教材棚で上書きしません。添付は10点・合計10MiBまで。教材の書き出しはversion 1のJSONで、本文・出典・権利メモ・添付のbase64内容を含みます。取込み入力は16MiBまでです。異なる保存先で取り込み、同じIDの教材があっても上書きしない設計です。

書き出し前に、含まれる情報と素材の利用条件を確認します。これは自動の権利判定・ロゴ検出ではありません。書き出したファイルや共有先のコピーを、後からこのアプリで遠隔削除することはできません。

設定から端末内データを削除できます。OSやファイルサービスのバックアップは対象外です。アプリの削除・再インストールやバックアップ復元の実機挙動は別途確認します。実利用者情報、持ち出せない業務資料は保存しません。

## テスト先行の記録

Issue #12で対象・拒否・未実装範囲を定義し、保存APIのstubと17件のXCTestを先に作成しました。[最初のCI](https://github.com/rns111603h-creator/support-program-lab/actions/runs/45121160280)（`d80d4c7`）ではXcode 16.4／Swift 6.1.2でcompile/link成功後、モデルの往復1件が成功し、保存APIに依存する16件が未実装のため失敗しました。これはコードの構文エラーによる失敗とは区別しています。この開発確認用SDKはApp Store提出用のSDK要件を満たした証拠にはしません。

実装後はmacOS 26 runnerでXcode 26以降を確認し、同じテストを再実行します。結果はiOSのPRへ記録します。CI定義の追加だけを合格とは扱いません。独立レビューと実操作も別の確認です。

## 提出前に必要なもの

`ReleaseConfiguration.example.json` は未完成の草案です。個人Appleチームと正式なBundle ID・実在するプライバシーポリシーとサポートURL・審査連絡先を本人と決めてから、Git対象外の `ReleaseConfiguration.json` に記入します。

```sh
python3 apps/ios/scripts/release-metadata.py apps/ios/ReleaseConfiguration.json
```

この検査はローカルのメタデータ形式だけを確認します。keywordsはUTF-8で100 bytes以内です。Releaseビルドの前段にも接続し、正式値が未設定の場合やXcode側のBundle ID・Teamと設定が異なる場合はビルドを止めます。DebugのSimulatorビルドはこの提出ゲートの対象外です。URLの実稼働、AppleでのID登録・契約・署名、審査申告の適否を証明しません。草案は意図的に不合格となります。アプリID・TeamはXcode側にも正式な値を設定します。`jp.supportprogramlab.ios.dev` は開発用の仮IDです。秘密鍵や証明書、AppleパスワードをGitやチャットへ貼りません。

[App Store要件と本人判断ゲート](docs/app-store-readiness.md)、[プライバシー草案](docs/privacy-policy-draft.md)、[サポート草案](docs/support-draft.md)を参照してください。公開URL・運営者・初版範囲が未決の草案を完成文書として提出しません。

実機iPhone、ファイルプロバイダー、VoiceOver／大きな文字、端末ロック、終了・再起動、OSバックアップ復元、実際のOffice・A4印刷は未確認です。追加の操作テストを担当するサブエージェントは自動安全分類で停止したため、この追加検証は未実施として残しています。今回のCIのSimulator起動証拠を、全操作の受入合格とは報告しません。

Apple Developer加入・費用・販売者名、署名資格情報、TestFlight配布、App Review提出、マージと公開は本人が判断します。現在、自動upload・自動公開はありません。
