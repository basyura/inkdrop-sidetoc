# Inkdrop v6 対応完了計画

## 背景

- 最新コミット `4fc4b5a` で Inkdrop v6 対応が着手されている
- ただし現時点では、イベント購読まわりの追従と型修正が中心で、対応完了かどうかは未確認
- `npm run build` は成功しているが、`lib/` の生成物差分が未コミット

## 現状整理

### 対応済み

- [x] `engines.inkdrop` を `^6.0.0` に更新
- [x] `inkdrop-model` を更新
- [x] `inkdrop.onEditorLoad()` の戻り値を `Disposable` として扱うように変更
- [x] `inkdrop.onEditorUnload()` によるクリーンアップを追加
- [x] CodeMirror の更新イベントを `update` から `changes` に変更
- [x] ノート切り替え時のイベント再バインドと内部状態リセットを追加

### 要確認

- [x] `inkdrop.window.on/off` を使っていた箇所は現行 `src/` では実質コメントアウト済みで、残課題は `resize` 再実装要否の判断に絞られる
- [ ] コメントアウトされている `resize` 追従が不要なのか、代替実装が必要なのか
- [x] Preview mode のスクロール対象は `.mde-preview-container` であることを確認した
- [ ] Preview mode の表示判定、ノート切り替え直後の挙動が v6 で安定するか
- [ ] `lib/` を生成して配布物として同期すべきか

### preview mode 調査メモ

- [x] `preview mode` 実装の依存箇所を確認した
- [x] `preview mode` の DOM 構造として、スクロール対象が `.mde-preview-container` であることを確認した
- [x] `scroll` イベントが発火する実体は `.mde-preview` ではなく `.mde-preview-container` だった
- [x] `preview` 要素の差し替え時の再接続を仮説として試したが、主因ではなかったため修正は取り下げた
- [x] `editor-viewmode-preview` クラス監視や `.mde-preview` 表示状態判定も仮説として試したが、改善しなかった
- [x] `document.querySelector(\".mde-preview\")` を active editor 配下へ寄せる案も試したが、改善しなかったため戻した

#### 今回の試行結果

- [x] active editor 基準の DOM 取得は Inkdrop v6 の preview mode で安定せず、採用しなかった
- [x] `.mde-preview` の表示状態ベース判定では preview mode 追従問題は解消しなかった
- [x] preview mode のスクロール対象を `.mde-preview-container` に揃える最小修正で改善した
- [ ] `editor-viewmode-preview` クラス依存が v6 で安定しているかは引き続き確認する

#### 現時点の懸念

- [x] `getEditorElement()` が最初の `.editor` をキャッシュするため、active editor の切り替えや DOM 再生成に弱い可能性がある
- [x] `handlePreviewScroll()`、`handleJumpToPrev()`、`handleJumpToNext()`、`handleClick()` がグローバルな `.mde-preview` を参照している
- [x] `MutationObserver` は現在の preview 要素にしか付かないため、preview DOM が差し替わると監視が切れる可能性がある
- [x] `isPreview` は `editorEle.classList.contains(\"editor-viewmode-preview\")` に依存しており、クラス変化の検知契機が弱い
- [x] `previewHeaders` と `state.headers` がインデックスで 1:1 対応する前提のため、Preview 側で見出し構造が変わるとクリックやハイライトがずれる可能性がある

### 未着手の可能性が高い項目

- [ ] v6 実機での手動確認
- [ ] 配布前提のビルド成果物更新
- [ ] 必要に応じた README / CHANGELOG / リリース手順の見直し

## 参照前提

- Inkdrop の v5→v6 移行ガイドでは、`inkdrop.window.on('focus', ...)` のような使い方は `inkdrop.window.onFocus(...)` のような専用 API に移行し、購読解除は `dispose()` を使う
- 既存コードでは `resize` ハンドリングがコメントアウトされているため、v6 で利用可能な window API に合わせて実装方針を決める必要がある

## 対応方針

1. API 互換性の再確認

- [x] `src/` 全体から v5 依存の API 呼び出しを洗い出す
- [x] 特に `inkdrop.window`、editor lifecycle、preview mode の DOM 依存箇所を優先確認する

2. 実装修正

- [x] preview mode のスクロール対象を `.mde-preview-container` に揃える修正を実施した
- [x] イベント購読は `Disposable` を保持して `componentWillUnmount` で破棄する実装になっている
- [ ] `resize` 追従が必要なら v6 API に沿って再実装し、不要ならコードと計画の両方に理由を残す
- [x] preview mode の `scroll` / `scrollTop` / ジャンプ処理の参照先を `.mde-preview-container` に統一した
- [x] preview mode でカレントのヘッダー色変更が追従しない問題の主因を特定した

### preview mode 実装案

- [ ] `getEditorElement()` のキャッシュ戦略を見直す場合は、DOM 実態確認後に再検討する
- [x] `.mde-preview` と `.mde-preview-container` の役割を確認し、スクロール対象は `.mde-preview-container` に合わせた
- [ ] preview 要素の監視・再接続方法は、実際の DOM 差し替え有無を確認してから決める
- [ ] `editor-viewmode-preview` クラス依存をやめるかどうかは、v6 DOM 確認後に判断する
- [ ] `previewHeaders` と `state.headers` の紐付け見直しは、Preview 側の見出し構造を確認してから行う

3. 成果物同期

- [x] `npm run build` を実行して `lib/` を更新した
- [x] `src/` と `lib/` の差分が現在の作業内容に対応していることを確認した

4. 動作確認

- Inkdrop v6 で以下を手動確認する
- [ ] エディタ表示時に TOC が表示される
- [ ] 見出し移動で現在位置のハイライトが追従する
- [ ] preview mode 切り替え時に TOC が正しく再描画される
- [x] Preview スクロールで TOC の現在位置の色変更が追従する
- [x] Preview スクロールイベント自体が `.mde-preview-container` で発火することを確認した
- [ ] Preview 内の見出しクリックや再レンダリング後も TOC が破綻しない
- [ ] ノート切り替え時に TOC が壊れず再描画される
- [ ] プラグインの有効化・無効化やエディタ再読み込みでイベントリークが起きない

5. 仕上げ

- [ ] 必要なら README / CHANGELOG を更新する
- [ ] 完了条件を満たしたらコミット用の差分を整理する

## 完了条件

- [x] v6 非互換 API の洗い出しが完了している
- [ ] 必要な `src/` 修正が完了している
- [x] `npm run build` が成功している
- [x] `lib/` が同期されている
- [ ] Inkdrop v6 上で editor / preview mode の主要フロー手動確認が完了している
- [x] 未対応事項として preview mode の DOM 実態未確認を明文化した

## 想定アウトプット

- [x] `src/` の v6 対応修正
- [x] `lib/` の再生成
- [ ] 必要に応じたドキュメント更新
- [x] 動作確認結果と未解決事項のメモ
