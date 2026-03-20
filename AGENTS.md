# Repository Guidelines

## 計画

- 修正を始める前に計画をマークダウンファイルで .plans フォルダ配下に日本語で生成してください。
- 計画のファイル名は連番とし、1つ目を 001 始まりとして修正にあった適切なファイル名としてください。
- 具体的なファイル編集をする前に、修正案を提示すること。
- 指示があるまで新しい計画ファイルを作成せず、現在の計画に反映すること。
- API に関しては https://github.com/inkdropapp/api-docs/ サイトを確認すること。特に、inkdrop v5 から v6 への plugin アップデートに関しては https://github.com/inkdropapp/api-docs/blob/main/src/app/appendix/plugin-migration-from-v5-to-v6/page.mdx を参照すること。

## Project Structure & Module Organization

This repository is an Inkdrop plugin that renders a side table of contents for the editor and preview. Edit source files in `src/`; compiled output is emitted to `lib/` via TypeScript and should stay in sync with source changes. UI styling lives in `styles/sidetoc.css`, command/menu bindings live in `keymaps/sidetoc.json` and `menus/sidetoc.json`, and screenshots for documentation are stored in `images/`.

Key modules:

- `src/sidetoc.ts`: plugin entry point
- `src/sidetoc-pane.tsx`: React pane UI
- `src/dispatcher.ts`, `src/pane-state.ts`, `src/settings.ts`: state and behavior
- `src/ripper.ts`: heading extraction logic

## Build, Test, and Development Commands

- `npm install`: install local dependencies
- `npm run build`: compile `src/` into `lib/` with `tsc`
- `npm run build-watch`: rebuild on change during development

There is no dedicated test runner configured in `package.json` today. Use `npm run build` as the minimum validation step before opening a pull request.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation and keep files focused on one responsibility. Match existing naming patterns: kebab-case for filenames (`sidetoc-pane.tsx`), camelCase for variables/functions, and PascalCase for React components and types. Prefer small, explicit functions in stateful modules.

Formatting/tooling in this repo is partially historical: `.prettierrc` and `.eslintrc.yml` are not fully aligned. Follow the existing style in surrounding code, then run the project formatter/linter only if you also verify the diff stays minimal.

## Testing Guidelines

Because there is no automated test suite yet, validate changes by:

- running `npm run build`
- manually loading the plugin in Inkdrop
- checking TOC rendering, current-heading highlight, and keybindings for affected flows

If you add tests in the future, place them near the relevant source module or under a dedicated `test/` directory and use clear names such as `ripper.test.ts`.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commits with optional scopes, for example `fix(engine): supports v5 and v6` and `refactor(stylesheets): migrate from LESS to CSS`. Follow that style: `<type>(optional-scope): summary`.

For pull requests, include:

- a short description of user-visible behavior changes
- linked issue or context when applicable
- screenshots for UI changes
- confirmation that `npm run build` succeeded


## API 

### inkdrop.window

```
Object.getOwnPropertyNames(inkdrop.window)
[
    "constructor",
    "subscribeEvents",
    "onSwipe",
    "onAppCommand",
    "onFoundInPage",
    "onMaximize",
    "onUnmaximize",
    "onFocus",
    "onBlur",
    "onClose",
    "close",
    "getSize",
    "setSize",
    "getPosition",
    "setPosition",
    "center",
    "focus",
    "show",
    "hide",
    "reload",
    "minimize",
    "setMinimumSize",
    "isMaximized",
    "maximize",
    "unmaximize",
    "isFullScreen",
    "setFullScreen",
    "openDevTools",
    "closeDevTools",
    "toggleDevTools",
    "setMenuBarVisibility",
    "webContentsAction",
    "showContextMenu",
    "findInPage",
    "stopFindInPage"
]
```
