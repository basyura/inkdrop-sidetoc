# エディタスクロール時の見出しハイライト修正

## 目的

Inkdrop v6 のエディタ本文をマウスやトラックパッドでスクロールしたときに、sidetoc の現在見出しハイライトが表示位置に追従するように戻す。

## 背景

`858bcb9` で CodeMirror 5 の `cm.on("scroll")` 依存を削除したため、エディタの selection が変化しないスクロールでは `currentHeader` が更新されなくなった。

クリックや `jump-next` / `jump-prev` は CodeMirror 6 の `dispatch` に寄せたことで動作するが、手動スクロール時のハイライト更新が抜けている。

## 修正方針

1. Inkdrop v6 / CodeMirror 6 のエディタ DOM からスクロール可能要素を取得する。
   - `EditorView.scrollDOM` が使える場合はそれを優先する。
   - 取得できない場合はエディタ要素内のスクロールコンテナを探索する。

2. エディタスクロールイベントを購読する。
   - `attachEvents` で scroll listener を登録する。
   - `detachEvents` で必ず解除する。
   - 頻繁なイベントを避けるため throttle する。

3. スクロール位置から現在見出しを更新する。
   - `view.lineBlockAtHeight` と `view.state.doc.lineAt` が使える場合は表示位置の行番号を取得する。
   - 取得できない場合は現在 selection 行にフォールバックする。
   - 取得した行で `updateSection` を呼ぶ。

4. 既存のクリック・キーマップジャンプ挙動を維持する。
   - `moveEditorToLine` の移動処理は変えない。
   - 変更範囲はエディタスクロール時のハイライト更新に限定する。

## 編集対象

- `src/pane-state.ts`
- `src/sidetoc-pane.tsx`

## 検証項目

- `npm run build` が成功すること。
- エディタ本文をマウスやトラックパッドでスクロールしたときに、sidetoc の現在見出しハイライトが更新されること。
- 見出しクリックで該当セクションへ移動できること。
- `sidetoc:jump-next` / `sidetoc:jump-prev` が引き続き動作すること。
- プレビュー表示時のスクロール連動が壊れていないこと。

## 実施結果

- `EditorView.scrollDOM` または `.cm-scroller` を使ってエディタスクロールイベントを購読するようにした。
- スクロール位置から `lineBlockAtHeight` と `doc.lineAt` で現在行を求め、`updateSection` を呼ぶようにした。
- `detachEvents` でエディタスクロール listener を解除するようにした。
- `npm run build` 成功。
- `git diff --check` 問題なし。
