"use babel";

import * as React from "react";
import * as ripper from "./ripper";
import dispatcher from "./dispatcher";
import Settings from "./settings";
import { PaneState } from "./pane-state";
import {
  Inkdrop,
  Editor,
  DispatchAction,
  HeaderItem,
  Props,
  State,
  WidthChangeMode,
} from "./types";
/*
 * セレクターに一致する最初の DOM 要素を取得する。
 */
const $ = (query: string) => document.querySelector(query);
const cursorScrollPriorityMs = 100;

declare var inkdrop: Inkdrop;

// Memoized header list item component for performance
interface HeaderListItemProps {
  header: HeaderItem;
  style: React.CSSProperties;
  onClick: (header: HeaderItem) => void;
  isCurrent: boolean;
}

/*
 * 見出し項目を描画し、現在見出しへの参照とクリック処理を設定する。
 */
const HeaderListItem = React.memo(
  React.forwardRef<HTMLLIElement, HeaderListItemProps>(
    ({ header, style, onClick, isCurrent }, ref) => (
      <li
        style={style}
        onClick={() => onClick(header)}
        ref={isCurrent ? ref : null}
      >
        {header.str}
      </li>
    )
  ),
  /*
   * 現在見出しかどうかと見出しの参照を比較し、再描画を省略できるか判定する。
   */
  (prevProps, nextProps) => {
    // Only prevent re-render if header content is the same AND isCurrent status unchanged
    // Always re-render when isCurrent changes to update background color
    if (prevProps.isCurrent !== nextProps.isCurrent) {
      return false; // Force re-render when active state changes
    }

    // For performance, skip deep style comparison and only check header identity
    return prevProps.header === nextProps.header;
  }
);

export default class SideTocPane extends React.Component<Props, State> {
  // internal state
  paneState = new PaneState();
  // element cache
  statusBar: Element | null = null;
  private dispatchTarget: any | null = null;
  private originalDispatch: ((...args: any[]) => any) | null = null;
  private maxRebindAttempts = 100;
  private lastCursorMoveAt = Number.NEGATIVE_INFINITY;

  /*
   * 指定した 0 始まりの行へカーソルを移動し、フォーカスと現在見出しを更新する。
   * 必要に応じてスクロールし、その直後はカーソル位置による見出し判定を優先する。
   */
  private moveEditorToLine(
    line: number,
    scrollIntoView: boolean = true,
    prioritizeCursorOnScroll: boolean = false
  ): void {
    const editor = inkdrop.getActiveEditor();
    if (!editor) return;

    const { view, doc } = this.getEditorRefs(editor);
    if (view?.dispatch && doc?.line) {
      const lineCount = doc.lines ?? this.state.len;
      const lineNumber = Math.min(Math.max(line + 1, 1), lineCount);
      const pos = doc.line(lineNumber).from;
      if (prioritizeCursorOnScroll) {
        this.lastCursorMoveAt = performance.now();
      }
      view.dispatch({
        selection: { anchor: pos },
        scrollIntoView,
      });
      view.focus?.();
      this.updateSection(line);
    }
  }

  /*
   * アクティブエディターのカーソル行を 0 始まりで取得する。
   */
  private getCurrentEditorLine(): number | null {
    const editor = inkdrop.getActiveEditor();
    if (!editor) return null;

    const { view, doc } = this.getEditorRefs(editor);
    const head = view?.state?.selection?.main?.head;
    if (typeof head !== "number" || !doc?.lineAt) {
      return null;
    }

    return doc.lineAt(head).number - 1;
  }

  /*
   * 連続した呼び出しをまとめ、最後の呼び出しから指定時間後に関数を実行する。
   */
  private debounce = <T extends (...args: any[]) => void>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout | undefined;
    return ((...args: Parameters<T>) => {
      // 待機後にタイマーを解除し、最後に受け取った引数で対象の関数を実行する。
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    }) as T;
  };

  /*
   * 最初の呼び出しを実行し、指定時間が経過するまで後続の呼び出しを抑制する。
   */
  private throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
    let inThrottle: boolean;
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  };

  /*
   * 目次ペインの DOM 要素を取得し、再利用できるようにキャッシュする。
   */
  private getPaneElement(): HTMLElement | null {
    if (!this.paneState.cachedPaneElement) {
      this.paneState.cachedPaneElement = document.querySelector<HTMLElement>(
        "#app-container > .main-layout > .editor-layout > .mde-layout > .sidetoc-pane"
      );
    }
    return this.paneState.cachedPaneElement;
  }

  /*
   * エディターの DOM 要素を取得し、再利用できるようにキャッシュする。
   */
  private getEditorElement(): Element | null {
    if (!this.paneState.cachedEditorElement) {
      this.paneState.cachedEditorElement = document.querySelector(".editor");
    }
    return this.paneState.cachedEditorElement;
  }

  /*
   * 目次ペインとエディターの DOM 要素キャッシュを破棄する。
   */
  private invalidateElementCache(): void {
    this.paneState.cachedPaneElement = null;
    this.paneState.cachedEditorElement = null;
  }

  /*
   * エディターのビューと現在の文書への参照を取得する。
   */
  private getEditorRefs(editor: Editor) {
    const view = editor as any;
    const doc = view?.state?.doc ?? null;

    return { view, doc };
  }

  /*
   * エディターの本文を取得し、取得できない場合は編集中ノートの本文を返す。
   */
  private getEditorBody(editor: Editor): string {
    const { doc } = this.getEditorRefs(editor);
    return doc?.toString?.() ?? this.props.editingNote?.body ?? "";
  }

  /*
   * 文書の変更検出に使用するエディター文書への参照を取得する。
   */
  private getEditorDoc(editor: Editor): unknown {
    return this.getEditorRefs(editor).doc;
  }

  /*
   * 文書の行数を取得し、取得できない場合は本文の改行から算出する。
   */
  private getEditorLineCount(editor: Editor): number {
    const { view } = this.getEditorRefs(editor);
    return view?.state?.doc?.lines ?? this.getEditorBody(editor).split("\n").length;
  }

  /*
   * エディターのカーソルがある行の文字列を取得する。
   */
  private getCurrentLineText(editor: Editor): string {
    const { view } = this.getEditorRefs(editor);
    const head = view?.state?.selection?.main?.head;
    return typeof head === "number" ? view?.state?.doc?.lineAt(head)?.text ?? "" : "";
  }

  /*
   * エディターのスクロール要素を取得し、必要に応じて DOM 内を検索する。
   */
  private getEditorScrollElement(editor: Editor, editorEle: Element | null): Element | null {
    const { view } = this.getEditorRefs(editor);
    const scrollDOM = view?.scrollDOM;
    if (scrollDOM?.addEventListener) {
      return scrollDOM;
    }

    return editorEle?.querySelector(".cm-scroller") ?? null;
  }

  /*
   * スクロール位置とカーソル余白から表示上端の行を求め、取得できない場合はカーソル行を返す。
   */
  private getVisibleEditorLine(editor: Editor): number | null {
    const { view, doc } = this.getEditorRefs(editor);
    const scrollDOM = this.paneState.editorScrollElement as HTMLElement | null;
    if (view?.lineBlockAtHeight && doc?.lineAt && scrollDOM != null) {
      const margin = inkdrop.config.get("editor.cursorScrollMargin") ?? 0;
      const block = view.lineBlockAtHeight(scrollDOM.scrollTop + margin);
      const from = block?.from;
      if (typeof from === "number") {
        return doc.lineAt(from).number - 1;
      }
    }

    return this.getCurrentEditorLine();
  }

  /*
   * エディターの dispatch をラップし、文書変更とカーソル移動を目次へ反映する。
   */
  private installDocumentChangeListener(editor: Editor): void {
    const { view } = this.getEditorRefs(editor);
    const target = view;
    if (!target?.dispatch) {
      return;
    }
    const originalDispatch = target.dispatch.bind(target);
    this.dispatchTarget = target;
    this.originalDispatch = originalDispatch;

    target.dispatch = (...args: any[]) => {
      const beforeDoc = this.getEditorDoc(editor);
      const beforeHead = target.state?.selection?.main?.head;
      const result = originalDispatch(...args);
      const afterDoc = this.getEditorDoc(editor);
      const afterHead = target.state?.selection?.main?.head;

      if (beforeDoc !== afterDoc) {
        this.handleEditorUpdate();
      }
      if (beforeHead !== afterHead) {
        const line = this.getCurrentEditorLine();
        if (line != null) {
          this.lastCursorMoveAt = performance.now();
          this.updateSection(line);
        }
      }

      return result;
    };
  }

  /*
   * ラップした dispatch を元に戻し、変更監視用の参照を解放する。
   */
  private uninstallDocumentChangeListener(): void {
    if (this.dispatchTarget && this.originalDispatch) {
      this.dispatchTarget.dispatch = this.originalDispatch;
    }

    this.dispatchTarget = null;
    this.originalDispatch = null;
  }
  /*
   * 初期状態とアクション・エディターの購読を設定し、エディターへの接続を開始する。
   */
  componentWillMount() {
    // state of this component
    this.state = {
      visibility: Settings.isDefaultVisible,
      headers: [],
      currentHeader: null,
      min: 0,
      len: 0,
    };

    this.paneState.dispatchId = dispatcher.register((action: DispatchAction) =>
      this.dispatchAction(action)
    );

    this.paneState.editorLoadSubscription = inkdrop.onEditorLoad((editor) => {
      this.attachEvents(editor);
    });
    this.paneState.editorUnloadSubscription = inkdrop.onEditorUnload(() => {
      this.invalidateElementCache();
      this.detachEvents();
    });

    const editor = inkdrop.getActiveEditor();
    if (editor != null) {
      this.attachEvents(editor);
    } else {
      this.rebindActiveEditor(100);
    }
  }
  /*
   * ノート切り替えを処理し、それ以外の更新では現在見出しまで目次をスクロールする。
   */
  componentDidUpdate(prevProps: Props) {
    if (prevProps.editingNote?._id !== this.props.editingNote?._id) {
      this.handleNoteSwitch();
      return;
    }

    const cur = this.paneState.curSectionRef.current;
    if (cur == null) {
      return;
    }

    const pane = document.querySelector<HTMLElement>(".sidetoc-pane-wrapper");
    if (pane != null) {
      pane.scrollTop = cur.offsetTop - pane.offsetTop;
    }
  }
  /*
   * アクション登録、再接続タイマー、エディター購読、イベント監視を解除する。
   */
  componentWillUnmount() {
    // unhandle event
    dispatcher.unregister(this.paneState.dispatchId);

    if (this.paneState.rebindTimer != null) {
      clearTimeout(this.paneState.rebindTimer);
      this.paneState.rebindTimer = null;
    }
    this.paneState.editorLoadSubscription?.dispose();
    this.paneState.editorUnloadSubscription?.dispose();
    this.paneState.editorLoadSubscription = null;
    this.paneState.editorUnloadSubscription = null;
    this.detachEvents();
  }
  /*
   * 受信したアクションに応じて表示、見出し移動、幅、折り返しなどを操作する。
   */
  dispatchAction(action: DispatchAction) {
    switch (action.type) {
      case "Toggle":
        this.handleVisibility();
        break;
      case "JumpToPrev":
        this.handleJumpToPrev();
        break;
      case "JumpToNext":
        this.handleJumpToNext();
        break;
      case "Activate":
        this.updateState({ visibility: Settings.isDefaultVisible });
        this.rebindActiveEditor(100);
        break;
      case "Deactivate":
        this.updateState({ visibility: false });
        break;
      case "IncreaseWidth":
        this.handleChangeWidth(WidthChangeMode.Increase);
        break;
      case "DecreaseWidth":
        this.handleChangeWidth(WidthChangeMode.Decrease);
        break;
      case "ResetWidth":
        this.handleChangeWidth(WidthChangeMode.Reset);
        break;
      case "ToggleTextwrap":
        this.handleToggleTextwrap();
        break;

      default:
    }
  }
  /*
   * 表示に関わる状態が変わった場合に目次を再生成し、描画結果をキャッシュする。
   */
  render() {
    // Check if we need to regenerate content
    if (this.paneState.content == null || this.shouldUpdateContent()) {
      this.paneState.content = this.createContent();
      this.paneState.lastRenderHeaders = this.state.headers;
      this.paneState.lastRenderVisibility = this.state.visibility;
      this.paneState.lastRenderCurrentHeader = this.state.currentHeader;
    }

    return this.paneState.content;
  }

  /*
   * 見出し一覧、表示状態、現在見出しを比較し、目次の再生成が必要か判定する。
   */
  private shouldUpdateContent(): boolean {
    return (
      this.paneState.lastRenderHeaders !== this.state.headers ||
      this.paneState.lastRenderVisibility !== this.state.visibility ||
      this.paneState.lastRenderCurrentHeader !== this.state.currentHeader
    );
  }
  /*
   * 表示設定と見出し一覧から、目次ペインと各見出し項目の描画内容を生成する。
   */
  createContent() {
    const isShowPane = this.isShowPane();
    let className = "sidetoc-pane";
    if (!isShowPane) {
      className = "sidetoc-pane-hide";
    } else if (!Settings.isTextwrap) {
      className += " sidetoc-pane-nowrap";
    }

    const style = {
      fontFamily: Settings.fontFamily,
    };

    let wrapperStyle: { [key: string]: any } = {};
    if (isShowPane) {
      const pane = this.getPaneElement();
      if (pane != null) {
        wrapperStyle.height = pane.offsetHeight - 20;
      }
    }

    // current header key for preview which join header text with "_".
    let current = "";

    return (
      <div className={className} style={style}>
        <div className="sidetoc-pane-wrapper" style={wrapperStyle}>
          {this.state.headers.map((v: HeaderItem, index: number) => {
            // Optimized string processing - avoid regex replace
            const cleanStr = v.str.split(" ").join("");
            current += "_" + cleanStr;
            const { style, isCurrent } = this.toStyleCached(v, current);
            const ref = isCurrent ? this.paneState.curSectionRef : null;
            return (
              <HeaderListItem
                key={`${v.index}-${v.str}`} // stable key for React optimization
                header={v}
                style={style}
                onClick={this.handleClick}
                ref={ref}
                isCurrent={isCurrent}
              />
            );
          })}
        </div>
      </div>
    );
  }
  /*----- private -----*/
  /*
   * エディターの文書変更、スクロール、プレビュー更新、テーマ変更、ペインのサイズ変更を監視する。
   * エディターが未準備の場合は再接続を予約する。
   */
  attachEvents(editor: Editor): boolean {
    if (!editor?.dispatch || !editor?.state?.doc) {
      this.rebindActiveEditor(100);
      return false;
    }
    if (this.paneState.currentEditor === editor) {
      return true;
    }

    this.detachEvents();
    this.paneState.rebindAttempts = 0;
    this.paneState.currentEditor = editor;
    this.statusBar = document.querySelector(
      "#app-container .main-layout .editor-layout .editor-status-bar-layout"
    );

    // refresh
    this.updateState();

    this.installDocumentChangeListener(editor);

    const pane = this.getPaneElement();
    if (pane != null) {
      this.paneState.resizeObserver = new ResizeObserver(() => {
        this.handleWindowResize();
      });
      this.paneState.resizeObserver.observe(pane);
    }

    // hook preview scroll
    const editorEle = this.getEditorElement();
    const editorScrollElement = this.getEditorScrollElement(editor, editorEle);
    if (editorScrollElement != null) {
      this.paneState.editorScrollElement = editorScrollElement;
      editorScrollElement.addEventListener("scroll", this.handleEditorScroll);
    }

    if (editorEle == null) {
      return true;
    }
    // preview element
    const preview = editorEle.querySelector(".mde-preview-container");
    if (preview == null) {
      return true;
    }
    // Store reference for proper cleanup
    this.paneState.previewElement = preview;
    preview.addEventListener("scroll", this.handlePreviewScroll);

    // check initial view mode
    this.paneState.isPreview = editorEle.classList.contains("editor-viewmode-preview");
    // observe preview update
    this.paneState.observer = new MutationObserver((_) => this.handlePreviewUpdate(editorEle));

    this.paneState.observer.observe(preview, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // observe ui theme
    this.paneState.bodyObserver = new MutationObserver((_) => {
      Settings.refresh();
      this.updateState();
    });
    this.paneState.bodyObserver.observe(document.body, { attributes: true });

    return true;
  }
  /*
   * 文書変更の監視、各 Observer、スクロールイベントを解除し、接続先を解放する。
   */
  detachEvents(editor?: Editor) {
    this.uninstallDocumentChangeListener();
    this.paneState.resizeObserver?.disconnect();
    this.paneState.observer?.disconnect();
    this.paneState.bodyObserver?.disconnect();
    this.paneState.resizeObserver = null;
    this.paneState.observer = null;
    this.paneState.bodyObserver = null;

    // Properly remove preview scroll event listener to prevent memory leaks
    if (this.paneState.previewElement) {
      this.paneState.previewElement.removeEventListener("scroll", this.handlePreviewScroll);
      this.paneState.previewElement = null;
    }
    if (this.paneState.editorScrollElement) {
      this.paneState.editorScrollElement.removeEventListener("scroll", this.handleEditorScroll);
      this.paneState.editorScrollElement = null;
    }

    this.paneState.currentEditor = null;
  }
  /*
   * アクティブエディターの本文を解析し、見出し一覧と行数を追加の状態とともに反映する。
   */
  updateState = (option = {}) => {
    const editor = inkdrop.getActiveEditor();
    if (editor == null) {
      return;
    }
    const body = this.getEditorBody(editor);
    const ret = ripper.parse(body);
    // renew state
    const newState = Object.assign(option, {
      headers: ret.headers,
      min: ret.min,
      len: this.getEditorLineCount(editor),
    });

    this.commit(newState);

    return newState;
  };

  /*
   * 指定時間後にアクティブエディターへ再接続し、目次と現在見出しを更新する。
   * エディターがない場合は試行上限まで再接続を予約する。
   */
  rebindActiveEditor = (delay = 0) => {
    if (this.paneState.rebindAttempts >= this.maxRebindAttempts) {
      return;
    }

    if (this.paneState.rebindTimer != null) {
      clearTimeout(this.paneState.rebindTimer);
    }

    this.paneState.rebindTimer = setTimeout(() => {
      this.paneState.rebindTimer = null;
      this.paneState.rebindAttempts++;
      const editor = inkdrop.getActiveEditor();
      if (editor == null) {
        this.detachEvents();
        this.rebindActiveEditor(100);
        return;
      }

      const attached = this.attachEvents(editor);
      const newState = this.updateState({ currentHeader: null });
      if (newState != null && newState.headers.length > 0) {
        this.paneState.previewCurrent = "_" + newState.headers[0].str.replace(/ /g, "");
      }
      if (attached) {
        const line = this.getCurrentEditorLine();
        if (line != null) {
          this.updateSection(line);
        }
      }
    }, delay);
  };

  /*
   * ノート切り替え時にキャッシュと接続状態を初期化し、目次更新と再接続を行う。
   */
  handleNoteSwitch = () => {
    this.invalidateElementCache();
    this.detachEvents();
    this.paneState.previewHeaders = [];
    this.paneState.previewCurrent = "";
    this.paneState.firstPreview = true;
    this.paneState.lastLine = -1;
    this.paneState.rebindAttempts = 0;
    this.paneState.noteId = this.props.editingNote?._id || "";

    const newState = this.updateState({ currentHeader: null });
    if (newState != null && newState.headers.length > 0) {
      this.paneState.previewCurrent = "_" + newState.headers[0].str.replace(/ /g, "");
    }

    this.rebindActiveEditor();
  };
  /*
   * 指定行に対応する見出しを求め、現在見出しが変わった場合に状態へ反映する。
   */
  updateSection(line: number): void {
    const header = this.getCurrentHeader(line);
    if (!this.isSameHeader(this.state.currentHeader, header)) {
      this.commit({ currentHeader: header });
    }
  }
  /*
   * 目次ペインの表示状態を切り替え、エディターの再描画を要求する。
   */
  handleVisibility = () => {
    this.commit({ visibility: !this.state.visibility });
    setTimeout(() => {
      inkdrop.commands.dispatch(document.body, "editor:refresh");
    }, 10);
  };
  /*
   * 文書変更を 200 ms のデバウンスで処理し、ノート切り替えや見出し行・行数の変更を反映する。
   */
  handleEditorUpdate = this.debounce(() => {
    if (this.props.editingNote._id != this.paneState.noteId) {
      this.handleNoteSwitch();
      return;
    }

    const editor = inkdrop.getActiveEditor();
    if (!editor) return;
    const text = this.getCurrentLineText(editor);
    // forcely update when starts with "#"
    if (!text.startsWith("#")) {
      // edited normal line.
      if (this.state.len == this.getEditorLineCount(editor)) {
        return;
      }
    }

    this.updateState();
  }, 200); // 200ms debounce
  /*
   * 編集モードのスクロールを 16 ms 間隔で処理し、表示上端の行に対応する見出しを更新する。
   * カーソル移動直後はカーソル位置による判定を優先する。
   */
  handleEditorScroll = this.throttle((_: Event) => {
    if (this.paneState.isPreview) {
      return;
    }
    if (performance.now() - this.lastCursorMoveAt < cursorScrollPriorityMs) {
      return;
    }

    const editor = inkdrop.getActiveEditor();
    if (!editor) return;

    const line = this.getVisibleEditorLine(editor);
    if (line != null && line !== this.paneState.lastLine) {
      this.paneState.lastLine = line;
      this.updateSection(line);
    }
  }, 16);
  /*
   * 編集モードでは現在または前の見出しへ移動し、プレビューでは前方の見出し位置へスクロールする。
   */
  handleJumpToPrev = () => {
    // for preview mode
    if (this.paneState.isPreview) {
      const preview = document.querySelector<HTMLElement>(".mde-preview-container")!;
      const meta = document.querySelector<HTMLElement>(".metadata");

      if (meta != null && meta.clientHeight != 0 && this.paneState.previewHeaders.length > 1) {
        const header = this.paneState.previewHeaders[0];
        if (preview.scrollTop <= header.offsetTop) {
          preview.scrollTop = 0;
          return;
        }
      }

      for (let i = 1; i < this.paneState.previewHeaders.length; i++) {
        const header = this.paneState.previewHeaders[i];
        const top = header.getBoundingClientRect().top;
        if (top > 0) {
          preview.scrollTop = this.paneState.previewHeaders[i - 1].offsetTop - preview.offsetTop;
          return;
        }
      }

      const header = this.paneState.previewHeaders[this.paneState.previewHeaders.length - 1];
      if (header == null) {
        return;
      }
      preview.scrollTop = header.offsetTop - preview.offsetTop;
      return;
    }

    // for editor mode
    const line = this.getCurrentEditorLine();
    if (line == null) return;
    const header = this.getCurrentHeader(line);
    const prev = this.getPrevHeader(header, line);
    if (prev != null) {
      this.moveEditorToLine(prev.rowStart, true, true);
    }
  };
  /*
   * 編集モードでは次の見出しへ移動し、プレビューでは次の見出し位置へスクロールする。
   */
  handleJumpToNext = () => {
    // for preview mode
    if (this.paneState.isPreview) {
      const preview = document.querySelector<HTMLElement>(".mde-preview-container")!;
      const meta = document.querySelector<HTMLElement>(".metadata");

      // meta div
      if (meta != null && meta.clientHeight != 0 && this.paneState.previewHeaders.length > 1) {
        const header = this.paneState.previewHeaders[0];
        if (preview.scrollTop < header.clientHeight) {
          preview.scrollTop = header.offsetTop - preview.offsetTop;
          return;
        }
      }

      const diff = preview.getBoundingClientRect().y;
      for (let i = this.paneState.previewHeaders.length - 2; i >= 0; i--) {
        const header = this.paneState.previewHeaders[i];
        const top = header.getBoundingClientRect().top;
        // maybe under 10
        if (top - diff < 50) {
          preview.scrollTop = this.paneState.previewHeaders[i + 1].offsetTop - preview.offsetTop;
          break;
        }
      }
      return;
    }

    // for editor mode
    const line = this.getCurrentEditorLine();
    if (line == null) return;
    const header = this.getCurrentHeader(line);
    const next = this.getNextHeader(header);
    if (next != null) {
      this.moveEditorToLine(next.rowStart, true, true);
    }
  };
  /*
   * 表示モードを確認し、プレビューモードの場合は見出し要素の一覧を更新する。
   */
  handlePreviewUpdate = (editorEle: Element | null) => {
    if (editorEle == null) {
      return;
    }

    this.paneState.isPreview = editorEle.classList.contains("editor-viewmode-preview");
    // skip editor mode
    if (!this.paneState.isPreview) {
      return;
    }

    this.paneState.previewHeaders = [];
    const preview = editorEle.querySelector(".mde-preview-container");
    if (!preview) return;

    // Use efficient CSS selector instead of scanning all elements
    const headerElements = preview.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
    this.paneState.previewHeaders = Array.from(headerElements);
  };

  /*
   * プレビューのスクロールを 16 ms 間隔で処理し、現在見出しとエディターのカーソル位置を同期する。
   */
  handlePreviewScroll = this.throttle((_: Event) => {
    // skip editor mode
    if (!this.paneState.isPreview) {
      return;
    }

    // for first preview
    if (this.paneState.firstPreview) {
      this.paneState.firstPreview = false;
      this.handlePreviewUpdate(this.getEditorElement());
    }

    const previewElement = document.querySelector(".mde-preview-container");
    if (!previewElement) return;

    const diff = previewElement.getBoundingClientRect().y;
    // analyze current header
    for (let i = this.paneState.previewHeaders.length - 1; i >= 0; i--) {
      const header = this.paneState.previewHeaders[i];
      const top = header.getBoundingClientRect().top;
      // create current header key
      if (top - diff < 50) {
        let current = "";
        let k = 0;
        for (k = 0; k <= i; k++) {
          current += "_" + this.paneState.previewHeaders[k].textContent;
        }
        current = current.replace(/ /g, "");
        // change preview current
        if (this.paneState.previewCurrent != current) {
          this.paneState.previewCurrent = current;
          // move cursor to active header
          const item = this.state.headers[k - 1];
          if (item != null) {
            this.moveEditorToLine(item.rowStart, false);
            this.forceUpdate();
          }
        }

        break;
      }
    }
  }, 16); // 60fps throttling
  /*
   * 目次が表示中の場合に DOM 要素キャッシュを破棄し、サイズ変更を描画へ反映する。
   */
  handleWindowResize = () => {
    // Handle size changed.
    if (!this.state.visibility) {
      return;
    }

    // Invalidate DOM cache on resize as layout may have changed
    this.invalidateElementCache();
    this.updateState();
  };
  /*
   * クリックした見出しへエディターのカーソルまたはプレビューのスクロール位置を移動する。
   */
  handleClick = (header: HeaderItem) => {
    // for preview mode
    if (this.paneState.isPreview) {
      for (let i = 0; i < this.state.headers.length; i++) {
        if (this.state.headers[i] == header) {
          const preview = document.querySelector<HTMLElement>(".mde-preview-container")!;
          preview.scrollTop = this.paneState.previewHeaders[i].offsetTop - preview.offsetTop;
          inkdrop.commands.dispatch(document.body, "editor:focus");
          break;
        }
      }
      return;
    }

    this.moveEditorToLine(header.rowStart);
  };
  /*
   * 指定された増加・減少・リセット操作をペイン幅の設定へ反映する。
   */
  handleChangeWidth = (mode: WidthChangeMode) => Settings.changeCurrentWidth(mode);
  /*
   * 見出しの折り返し設定を切り替え、コンポーネントの状態更新を要求する。
   */
  handleToggleTextwrap = () => {
    Settings.toggleTextWrap();
    this.commit({});
  };
  /*
   * 見出しのスタイルと現在見出しの判定結果をキャッシュし、保持件数を 100 件以内に保つ。
   */
  toStyleCached = (header: HeaderItem, current: string) => {
    // Generate cache key based on style-affecting properties
    const currentHeaderKey = this.paneState.isPreview
      ? this.paneState.previewCurrent
      : (this.state.currentHeader?.index ?? "none");
    const cacheKey = `${header.count}-${this.state.min}-${current}-${currentHeaderKey}`;

    // Check cache first
    if (this.paneState.styleCache.has(cacheKey)) {
      return this.paneState.styleCache.get(cacheKey);
    }

    // Calculate style
    const result = this.toStyle(header, current);

    // Cache the result
    this.paneState.styleCache.set(cacheKey, result);

    // Keep cache size reasonable (LRU-like behavior)
    if (this.paneState.styleCache.size > 100) {
      const firstKey = this.paneState.styleCache.keys().next().value;
      if (firstKey !== undefined) {
        this.paneState.styleCache.delete(firstKey);
      }
    }

    return result;
  };

  /*
   * 見出しレベルに応じた左余白と、現在見出しの強調表示に使うスタイルを生成する。
   */
  toStyle = (header: HeaderItem, current: string) => {
    let style = {
      marginLeft: 20 * (header.count - this.state.min),
      cursor: "pointer",
      backgroundColor: "",
      color: "",
    };

    let isCurrent = false;

    if (this.paneState.isPreview) {
      if (this.paneState.previewCurrent == current) {
        isCurrent = true;
      }
    } else if (this.isSameHeader(this.state.currentHeader, header)) {
      isCurrent = true;
    }

    if (isCurrent) {
      style.color = Settings.hiFgColor;
      style.backgroundColor = Settings.hiBgColor;
    }

    return { style, isCurrent };
  };
  /*
   * 見出しの参照またはレベル・番号・開始行・文字列を比較し、同じ見出しか判定する。
   */
  isSameHeader(h1: HeaderItem | null, h2: HeaderItem | null): boolean {
    if (h1 == null) {
      return h2 == null;
    } else if (h2 == null) {
      return false;
    } else if (h1 == h2) {
      return true;
    }

    if (
      h1.count == h2.count &&
      h1.index == h2.index &&
      h1.rowStart == h2.rowStart &&
      h1.str == h2.str
    ) {
      return true;
    }

    return false;
  }
  /*
   * 指定行を範囲内に含む見出しを二分探索で取得する。
   */
  getCurrentHeader(line: number): HeaderItem | null {
    const headers = this.state.headers;
    if (headers.length === 0) return null;

    let left = 0;
    let right = headers.length - 1;

    // Binary search for the header containing the line
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const header = headers[mid];

      if (line >= header.rowStart && line <= header.rowEnd) {
        return header;
      } else if (line < header.rowStart) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return null;
  }
  /*
   * カーソルが見出し行にある場合は前の見出しを、それ以外は現在の見出しを返す。
   * 最初の見出しでは同じ見出しを返す。
   */
  getPrevHeader(header: HeaderItem | null, line: number): HeaderItem | null {
    if (header == null) {
      return null;
    }
    // first header
    if (header.index == 0) {
      return header;
    }

    if (header.index - 1 >= 0) {
      // Jump to prev header
      if (header.rowStart == line) {
        return this.state.headers[header.index - 1];
      }
      // Jump to current header line if cursor is not current header.
      return header;
    }

    return null;
  }
  /*
   * 現在見出しの次の見出しを返し、現在見出しがない場合は最初の見出しを返す。
   */
  getNextHeader(header: HeaderItem | null) {
    if (header == null) {
      // jump to first header
      return this.state.headers.length > 0 ? this.state.headers[0] : null;
    }

    if (header.index + 1 < this.state.headers.length) {
      return this.state.headers[header.index + 1];
    }

    return null;
  }
  /*
   * 更新対象の状態に応じて描画・スタイルのキャッシュを破棄し、React の状態を更新する。
   */
  commit(state: any): void {
    // Only invalidate content if headers, visibility, or currentHeader changed
    if (
      state.headers !== undefined ||
      state.visibility !== undefined ||
      state.currentHeader !== undefined
    ) {
      this.paneState.content = null;
    }

    // Clear style cache when state changes that affect styling
    if (
      state.headers !== undefined ||
      state.currentHeader !== undefined ||
      state.min !== undefined
    ) {
      this.paneState.styleCache.clear();
    }

    this.setState(state);
  }
  /*
   * 表示状態、見出しの有無、見出しがない場合の表示設定からペインの表示可否を判定する。
   */
  isShowPane(): boolean {
    if (!this.state.visibility) {
      return false;
    }

    if (Settings.isShowIfNoHeader) {
      return true;
    }

    return this.state.headers.length != 0;
  }
  /*
   * デバッグログ用の呼び出し口を提供する。現在はログ出力を無効にしている。
   */
  log(_: () => string) {
    // console.log(`sidetoc: ${_()}`);
  }
}
