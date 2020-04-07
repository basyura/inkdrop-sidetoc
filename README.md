# Inkdrop SideToc Plugin

Provides Side TOC.

![Screenshot](https://raw.githubusercontent.com/basyura/inkdrop-sidetoc/master/images/screenshot.png)

## Features

- Show TOC of headers.
- Hightlight current header.
  - Follow cursor movement and scroll
- Jump to header on click.

## Install

```
ipm install sidetoc
```

## Settings

|       key      | default |
| -------------- | ------- |
| highlightColor | #C5EAFB |
| width          | 200     |

config.cson

```cson
sidetoc:
  highlightColor: "#C5EAFB"
  width: 200
```

## ToDo

* [ ] 入力のたびに再描画が走る
  - 保存時に反映するだけにしたいが API が無い？
  - 処理時間は 0 〜 2ms なので問題はなさそう 
* [ ] セクション移動 (リンク、ショートカットキー)
* [ ] プレビュー時のハイライト表示

### Done
  
* [x] スクロールバーの動きに追従
* [x] セクションがない場合はサイドバー表示しない
* [x] toggle で非表示にしても min-width が効いていて領域を取っている
* [x] サイドバーの幅指定
* [x] スタイル設定 (config 設定)
* [x] エディタのフォント設定を取得して反映する
* [x] サイドバークリックでジャンプしたい
* [x] カーソルの mouse over でセクションの色を変える
* [x] セクション (`#`) 行を出力する
* [x] カーソルの位置をセクションに合わせる (CPU 使いそう)
