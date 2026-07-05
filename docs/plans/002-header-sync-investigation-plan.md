# sidetoc ヘッダー変更未反映 調査計画

## 背景

本文内の Markdown ヘッダーを編集しても、sidetoc の表示が即時更新されない。

## 調査結果

`SideTocPane#attachEvents()` までは実行されており、イベント登録処理そのものは通っている。実機では `SideTocPane#handleCmUpdate()` のログは `changes` では出力されず、`change` では出力された。少なくとも現在の Inkdrop v6 環境では、既存実装が期待している `changes` をそのまま更新トリガーとして使うのは安定していない。

見出し再計算の経路では、`SideTocPane#updateState()` が `ripper.parse(this.props)` を呼び出していた。ここで使われる入力は CodeMirror 上の最新本文ではなく `this.props.editingNote.body` であり、本文変更直後は props 側がまだ古い値のまま残る可能性があった。

そのため、ヘッダー変更が sidetoc に反映されない要因は 1 つではなく、更新トリガーと再解析入力の両方にあると判断した。前者では `changes` が発火しておらず、後者では再計算しても古い本文を読んでしまう可能性があった。

Inkdrop v6 Canary の案内では `inkdrop.getActiveEditor()` が `CodeMirror#EditorView` を返すように変更されたとされている。今回の修正では `change` を常用せず、`EditorView#dispatch()` をラップして更新前後の `state.doc` 差し替わりを監視する形に寄せた。この方式で、ヘッダー変更が sidetoc に反映されることを確認した。

現状の実装では、`SideTocPane#installDocumentChangeListener()` で `dispatch()` ごとに更新前後の `state.doc` を参照比較し、本文変更があった場合だけ `SideTocPane#handleCmUpdate()` を debounce 経由で呼んでいる。入力ごとに発生する処理自体は軽いが、負荷の中心はその後段にある全文文字列化と見出し再解析であり、長文ノートでは再計算条件の絞り込み余地が残る。

## 原因仮説

主因は、更新トリガーと見出し抽出の入力ソースの両方が Inkdrop v6 の editor state に追従していなかったことにある。`changes` が発火しない状態では再計算自体が走らず、仮に再計算しても `editingNote.body` を読む実装では最新のヘッダー変更を取りこぼす可能性があった。

最小修正としては、更新通知は `EditorView#dispatch()` を基準に取り、見出し抽出は `editor.state.doc` を優先して最新本文を参照する構成が妥当だった。

## 修正案

1. 見出し抽出の入力を最新本文へ寄せる

- [x] `ripper.parse()` が `Props` ではなく本文文字列を受け取れるように変更する
- [x] `SideTocPane#updateState()` からは `editor.state.doc` を優先し、必要時のみ `cm.getValue()` と `editingNote.body` をフォールバックとして使う
- [x] editor 未取得時やノート切り替え直後のみ `editingNote.body` をフォールバックとして使う

2. 更新判定を見直す

- [x] `SideTocPane#handleCmUpdate()` の早期 return 条件が、ヘッダー文言変更・追加・削除・階層変更を取りこぼさないことを確認する
- [x] Inkdrop v6 の `inkdrop.getActiveEditor()` が返す `EditorView` の実体と、プラグインから購読可能な更新 API を確認する
- [ ] CodeMirror v6 の `EditorView.updateListener`、`ViewUpdate.docChanged`、`ViewUpdate.changes` を使って本文変更を検知できるか確認する
- [x] 互換レイヤーとして `change` が使える場合でも、v6 対応の主経路として採用すべきかを判断する
- [x] `SideTocPane#detachEvents()` 側でも `dispatch` の差し替えを元に戻すようにした
- [ ] 必要なら直前本文ベースの比較や変更範囲判定を導入し、見出しに影響しない変更だけを抑制する

3. キャッシュ整合性を確認する

- [x] `ripper` のハッシュキャッシュが、最新本文文字列ベースでも正しく無効化されることを確認する
- [ ] ノート切り替え時に別ノートのキャッシュ結果を誤用しないことを確認する

## 影響箇所

- [x] [src/sidetoc-pane.tsx](/Users/tatsuya/repos/inkdrop/sidetoc/src/sidetoc-pane.tsx)
- [x] [src/ripper.ts](/Users/tatsuya/repos/inkdrop/sidetoc/src/ripper.ts)
- [x] [lib/sidetoc-pane.js](/Users/tatsuya/repos/inkdrop/sidetoc/lib/sidetoc-pane.js)
- [x] [lib/ripper.js](/Users/tatsuya/repos/inkdrop/sidetoc/lib/ripper.js)

## 動作確認項目

- [x] ヘッダー文言の変更が 1 回の編集で sidetoc に即時反映される
- [ ] `#` の追加で新しい見出しが sidetoc に表示される
- [ ] `#` の削除で sidetoc から見出しが消える
- [ ] `##` から `###` のような見出しレベル変更が sidetoc に反映される
- [ ] ノート切り替え後も sidetoc が正しい見出し一覧を表示する
- [x] `npm run build` が成功する
- [ ] 長文ノートの連続入力で体感上の遅延や過剰再描画がない

## 完了条件

- [x] 原因に対応する入力ソース修正が `src/` に反映されている
- [x] `lib/` 生成物が同期されている
- [ ] 手動確認項目の主要ケースが確認できている
