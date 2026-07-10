# 設定

## 設定一覧

| 設定キー | 型 | 既定値 | 挙動 |
| --- | --- | --- | --- |
| `sidetoc.highlightBgColor` | 文字列 | `--note-list-view-item-active-background` | 現在見出しとホバー項目の背景色 |
| `sidetoc.highlightFgColor` | 文字列 | `--note-list-view-item-active-color` | 現在見出しとホバー項目の文字色 |
| `sidetoc.width` | 整数 | `200` | SideTOC ペインの幅。単位は px |
| `sidetoc.increaseWidth` | 整数 | `10` | 幅変更コマンドの変更量として公開される設定 |
| `sidetoc.textwrap` | 真偽値 | `true` | 長い見出しを折り返すかどうか |
| `sidetoc.defaultVisible` | 真偽値 | `true` | 有効化時にペインを表示状態にするかどうか |
| `sidetoc.showIfNoHeader` | 真偽値 | `false` | 見出しがない場合も空のペインを表示するかどうか |

## 色の指定

前景色と背景色には、次のいずれかを文字列で指定する。

- `--` で始まる CSS カスタムプロパティ名
- CSS 色名
- `#FFFFFF` 形式などの CSS カラー値

CSS カスタムプロパティ名を指定した場合は、`document.body` の算出済みスタイルから
値を取得する。テーマ変更により `document.body` の属性が変わると、色を再取得する。

## 幅

`width` が未設定または 10 未満の場合は 200 px として扱う。
幅のリセットでは、最後に設定から読み込んだ値へ戻す。

幅の増減値を取得する実装は `sidetoc.IncreaseWidth` を参照するが、公開設定キーは
`sidetoc.increaseWidth` である。設定キーの大文字小文字が一致しないため、通常は
取得値が未設定となり、フォールバック値の 10 px ずつ増減する。

縮小時の最小幅は定義されていない。このため、縮小操作を繰り返すと幅が 0 以下に
なる可能性がある。

## 一時的な変更

以下のコマンド操作は Inkdrop の設定値へ保存しない。

- ペインの表示切り替え
- ペイン幅の拡大、縮小、リセット
- 文字列の折り返し切り替え

設定監視により値が変更された場合は、対応する内部値へ反映する。ただし、
`textwrap`、`defaultVisible`、`showIfNoHeader` の変更だけでは、直ちに React の
再描画を要求しない。
