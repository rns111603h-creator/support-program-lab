# 支援プログラムLab

福祉事業所向けプログラム教材のGitHub Pagesサンプルサイトです。

個人・チームの教材保管庫を `apps/marketplace` に追加しています。ID・パスワード認証、教材と添付の保存、チーム招待、期限付き共有、素材の権利確認アラートを備えたNode.jsアプリです。[起動方法・検査範囲・公開前の残件](apps/marketplace/README.md) を参照してください。GitHub Pagesの静的版と認証付き保管庫は実行環境が異なります。

iPhoneのネイティブ版は `apps/ios` で開発中です。[開発・検証とApp Store提出前の残件](apps/ios/README.md)を参照してください。初版のクラウド範囲・個人Appleチーム・実機・署名・提出は未決／未実施で、App Store公開済みではありません。

## Local Preview

From this directory:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

From the repository root:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/Projects/support-program-lab/
```

## Checks

```bash
node Projects/support-program-lab/scripts/check-site.mjs
```

## GitHub Pages

This sample is static HTML/CSS/JS and can be published from the repository root or from this project folder depending on the GitHub Pages repository settings.

Do not add login, payment, restricted files, or personal case data to this static sample. Move to a production app before adding those features.
