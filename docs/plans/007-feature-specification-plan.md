# SideTOC 機能仕様書作成計画

## 目的

Inkdrop プラグイン SideTOC の現行実装を調査し、利用者向けの挙動と
保守に必要な内部仕様を、日本語の機能仕様書として `docs/specs` 配下に整理する。

## 調査対象

- `README.md` と `CHANGELOG.md` に記載された利用方法および変更履歴
- `src` 配下のプラグイン初期化、画面表示、状態管理、見出し抽出、設定処理
- `styles/sidetoc.css` の表示仕様
- `menus/sidetoc.json` と `keymaps/sidetoc.json` のコマンドおよび操作割り当て
- `package.json` のプラグイン設定項目と既定値

## 作成方針

1. 現行コードから外部仕様と内部仕様を抽出する。
2. `docs/specs/README.md` を仕様書の目次として作成する。
3. 機能領域ごとに仕様書を分割する。
   - プラグインの概要と提供機能
   - 表示、操作、コマンド
   - 見出し抽出とスクロール連動
   - 設定項目
   - 状態管理とライフサイクル
4. 各仕様には、前提条件、正常時の挙動、対象外または制約を明記する。
5. 実装から断定できない内容は推測で補わず、未定義事項として記載する。

## 成果物

- `docs/specs/README.md`
- `docs/specs/overview.md`
- `docs/specs/ui-and-commands.md`
- `docs/specs/heading-and-scroll.md`
- `docs/specs/settings.md`
- `docs/specs/lifecycle-and-state.md`

実装調査の結果、責務の境界が異なる場合は、内容の重複を避けるため
ファイル名または分割単位を調整する。

## 確認方法

- 各記述を対応する実装または設定ファイルと照合する。
- 仕様書間で用語、既定値、コマンド名が一致していることを確認する。
- Markdown ファイルのリンク切れがないことを確認する。
- ドキュメントのみの変更であるため、ビルドは原則不要とする。
