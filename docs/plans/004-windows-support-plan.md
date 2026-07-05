# windows 対応

## 目的

Windows 環境の Inkdrop v6 で、sidetoc の見出しクリックとキーマップによる見出しジャンプが正しく動作するようにする。

## 背景

Windows では sidetoc に表示された見出しをクリックしても、エディタの該当箇所へスクロールしない問題があった。

また、以下のキーマップを定義しても `sidetoc:jump-next` と `sidetoc:jump-prev` が該当セクションへ移動しない問題があった。

```json
{
  "body": {
    "ctrl-n": "sidetoc:jump-next",
    "ctrl-p": "sidetoc:jump-prev"
  }
}
```

調査の結果、クリック処理とジャンプ処理が CodeMirror 5 の `cm`、`getCursor`、`setCursor`、`scrollTo` に依存していたことが主な原因だった。

このプラグインは Inkdrop v6 のみを対象とするため、v5 互換は不要とし、CodeMirror 6 の `EditorView` / `EditorState` を前提に実装を整理する。

## 原因

- クリック処理が `inkdrop.getActiveEditor()?.cm` に依存していた。
- キーマップから呼ばれる `jump-next` / `jump-prev` も `cm.getCursor()` に依存していた。
- Inkdrop v6 では `editor.state.selection.main.head` と `editor.state.doc` から現在位置を扱う必要がある。
- `cm` が取得できない場合、ジャンプ処理が何もせず return していた。

## 修正方針

1. Inkdrop v6 専用の移動処理に統一する。
   - 現在行は `editor.state.selection.main.head` と `editor.state.doc.lineAt(head)` から取得する。
   - 指定行への移動は `editor.dispatch({ selection, scrollIntoView: true })` を使う。

2. クリック、`jump-next`、`jump-prev` の移動処理を共通化する。
   - `moveEditorToLine` で対象行へ移動する。
   - `getCurrentEditorLine` で現在行を取得する。

3. CodeMirror 5 互換の参照を削除する。
   - `CodeMirror.Editor` 型依存を削除する。
   - `cm`、`getCursor`、`setCursor`、`lineInfo`、`getScrollInfo`、`lineAtHeight` への依存を削除する。
   - `currentCodeMirror` を `currentEditor` に変更する。

4. `src` 修正後に `npm run build` を実行し、ローカル実行用の `lib` を同期する。

## 編集対象

- `src/sidetoc-pane.tsx`
- `src/types.ts`
- `src/pane-state.ts`
- `lib/sidetoc-pane.js`
- `lib/types.js`
- `lib/pane-state.js`

## 検証項目

- `npm run build` が成功すること。
- 見出しクリックで該当セクションへスクロールすること。
- `ctrl-n` に割り当てた `sidetoc:jump-next` で次の見出しへ移動すること。
- `ctrl-p` に割り当てた `sidetoc:jump-prev` で前の見出しへ移動すること。
- プレビュー表示時のクリックとジャンプが壊れていないこと。
- 現在見出しのハイライトが移動後に更新されること。

## 実施結果

- 見出しクリックでスクロールすることを確認済み。
- キーマップからの `jump-next` / `jump-prev` が動作することを確認済み。
- `npm run build` 成功。
- `git diff --check` 問題なし。
- `src` と `lib` から CodeMirror 5 の旧 API 参照が消えていることを確認済み。

## 注意点

- 既存ファイルの改行コードは変更しない。
- 既存の `package-lock.json` の未コミット変更には触らない。
