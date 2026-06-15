# 初回起動時の sidetoc 表示修正計画

## 背景

- `show sidetoc by default` が有効でも、初回起動直後に sidetoc 領域が表示されない。
- ノートを切り替えると表示されるため、表示設定そのものではなく、初期表示時の editor/DOM 準備タイミングに依存した問題と考えられる。

## 原因仮説

- `SideTocPane` は mount 時に `inkdrop.getActiveEditor()` から editor を取得して `attachEvents` を実行している。
- 初回起動直後は editor が存在しても `cm` や preview DOM がまだ準備されていない場合がある。
- その場合 `attachEvents` が早期 return し、初回の `updateState` や再バインドが行われない。
- ノート切り替え時は `handleNoteSwitch` が走り、再度 state 更新と再バインドが行われるため表示される。

## 修正方針

- 初回 attach が editor 準備前に失敗した場合、短い遅延で active editor への再バインドを試す。
- `Activate` アクションでは `defaultVisible` 設定を尊重し、表示状態だけでなく現在の editor 内容も更新する。
- ノート切り替え時と同じ経路に寄せ、初回起動とノート切り替えで表示更新の差が出にくくする。

## 変更対象

- `src/sidetoc-pane.tsx`
- ビルド生成物として `lib/sidetoc-pane.js`

## 検証

- `npm run build` を実行する。
- 可能であれば Inkdrop で手動確認する。
  - 初回起動時に見出しがあるノートで sidetoc が表示されること。
  - `show sidetoc by default` が無効の場合、初回表示されないこと。
  - ノート切り替え後も従来通り表示・ハイライトが更新されること。
