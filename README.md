# Inkdrop SideToc Plugin

> [!WARNING]
> Starting with Inkdrop v6.1.1, the `ctrl-l` key is assigned to the `.cm-editor .cm-scroller` element, so the `ctrl-l` binding on `body` no longer works.
> The `ctrl-l` binding on `body` will be removed in the next version of sidetoc.
> To configure the same behavior, see the Keybindings section for the `keymap.json` configuration.

It adds an outline view on the right side of the editor and preview.

https://my.inkdrop.app/plugins/sidetoc

![Screenshot](https://raw.githubusercontent.com/basyura/inkdrop-sidetoc/master/images/screenshot.png)

## Features

- Show TOC of headers.
- Highlight current header.
  - Follow cursor movement and scroll
- Toggle side toc pane.
- Jump to header on click.
- Jump to next (or previous) header by key.
- Support Preview Mode

## Install

```
ipm install sidetoc
```

## Keybindings

| Command                | Explanation                       |
| ---------------------- | --------------------------------- |
| sidetoc:sidetoc-toggle | Toggle side toc pane.             |
| sidetoc:jump-next      | Jump to next header.              |
| sidetoc:jump-prev      | Jump to previous header.          |
| sidetoc:width-increase | increase width.                   |
| sidetoc:width-decrease | decrease width.                   |
| sidetoc:width-reset    | reset width.                      |
| sidetoc:wraptext-toggle| Toggle wrap/nowrap overflow text. |

keymap.json

```json
".cm-editor .cm-scroller": {
  "ctrl-v": "core:paste",
  "ctrl-l": "sidetoc:sidetoc-toggle",
  "ctrl-n": "sidetoc:jump-next",
  "ctrl-p": "sidetoc:jump-prev",
  "ctrl-L": "sidetoc:width-decrease",
  "ctrl-K": "sidetoc:width-increase",
  "ctrl-0": "sidetoc:width-reset",
  "ctrl-t": "sidetoc:wraptext-toggle"
},

".mde-preview-container": {
  "ctrl-n": "sidetoc:jump-next",
  "ctrl-p": "sidetoc:jump-prev",
}
```

## Settings

| key                | default                                 |
| ------------------ | --------------------------------------- |
| ~~highlightColor~~ | ~~#C5EAFB~~  - Obsolete!!               |
| highlightBgColor   | --note-list-view-item-active-background |
| highlightFgColor   | --note-list-view-item-active-color      |
| width              | 200                                     |
| textwrap           | true                                    |
| defaultVisible     | true                                    |
| showIfNoHeader     | false                                   |

config.cson

```cson
sidetoc:
  highlightBgColor: "#C5EAFB"
  highlightFgColor: "black"
  width: 200
  textwrap: false
  defaultVisible: true
  showIfNoHeader: true
```

Settings UI


![setting1](https://raw.githubusercontent.com/basyura/inkdrop-sidetoc/master/images/setting1.png)
![setting2](https://raw.githubusercontent.com/basyura/inkdrop-sidetoc/master/images/setting2.png)

## Style Tweaks

https://docs.inkdrop.app/manual/style-tweaks

> If you want to apply quick-and-dirty personal styling changes without creating an entire theme that you intend to publish,
> you can add styles to the styles.less file in your data directory. It does not exist by default.

## Not supported

* Content in html tags (syntax).

## Changelog

* https://github.com/basyura/inkdrop-sidetoc/commits/master/
