# SideTOC 機能仕様書

## 文書の位置付け

本仕様書は、SideTOC 3.0.5 のソースコードとプラグイン設定を基準に、
現行機能の挙動を記述する。README の説明と実装が異なる場合は実装を優先する。

## 対象環境

- Inkdrop 6.x
- Markdown 編集モード
- Markdown プレビューモード

## 文書一覧

- [概要](overview.md)
- [表示とコマンド](ui-and-commands.md)
- [見出し解析とスクロール連動](heading-and-scroll.md)
- [設定](settings.md)
- [ライフサイクルと状態管理](lifecycle-and-state.md)

## 用語

| 用語 | 意味 |
| --- | --- |
| SideTOC ペイン | エディターの右側に表示する目次領域 |
| 見出し項目 | Markdown 本文から抽出した ATX 見出しに対応する目次項目 |
| 現在見出し | カーソル位置またはプレビューのスクロール位置に対応する見出し |
| 編集モード | Markdown ソースを編集する表示モード |
| プレビューモード | Markdown のレンダリング結果を表示するモード |

## 参照元

- `src/` 配下の TypeScript 実装
- `package.json`
- `menus/sidetoc.json`
- `keymaps/sidetoc.json`
- `styles/sidetoc.css`
- Inkdrop 公式 API ドキュメント: <https://developers.inkdrop.app/>
