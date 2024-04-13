"use babel";

import * as React from "react";
import * as ripper from "./ripper";
import CodeMirror from "codemirror";
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

const $ = (query: string) => document.querySelector(query);

declare var inkdrop: Inkdrop;

export default class SideTocPane extends React.Component<Props, State> {
  // internal state
  paneState = new PaneState();
  // element cache
  statusBar: Element | null = null;
  /*
   *
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

    const editor = inkdrop.getActiveEditor();
    if (editor != null) {
      this.attachEvents(editor);
    } else {
      inkdrop.onEditorLoad((e) => {
        this.attachEvents(e);
      });
    }
  }
  /*
   *
   */
  componentDidUpdate() {
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
   *
   */
  componentWillUnmount() {
    // unhandle event
    dispatcher.unregister(this.paneState.dispatchId);

    const editor = inkdrop.getActiveEditor();
    // for delete note
    if (editor == null) {
      return;
    }

    this.detachEvents(editor);
  }
  /*
   *
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
        this.updateState({ visibility: true });
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
   *
   */
  render() {
    // use cache
    if (this.paneState.content == null) {
      this.paneState.content = this.createContent();
    }

    return this.paneState.content;
  }
  /*
   *
   */
  createContent() {
    let className = "sidetoc-pane";
    if (!this.state.visibility || this.state.headers.length == 0) {
      className = "sidetoc-pane-hide";
    } else if (!Settings.isTextwrap) {
      className += " sidetoc-pane-nowrap";
    }

    const style = {
      fontFamily: Settings.fontFamily,
    };

    let wrapperStyle: { [key: string]: any } = {};
    if (this.state.visibility) {
      const pane = document.querySelector<HTMLDivElement>(
        "#app-container > .main-layout > .editor-layout > .mde-layout > .sidetoc-pane"
      );
      if (pane != null) {
        wrapperStyle.height = pane.offsetHeight - 20;
      }
    }

    // current header key for preview which join header text with "_".
    let current = "";

    return (
      <div className={className} style={style}>
        <div className="sidetoc-pane-wrapper" style={wrapperStyle}>
          {this.state.headers.map((v: HeaderItem) => {
            current += "_" + v.str.replace(/ /g, "");
            const { style, isCurrent } = this.toStyle(v, current);
            const ref = isCurrent ? this.paneState.curSectionRef : null;
            return (
              <li style={style} onClick={this.handleClick.bind(this, v)} ref={ref}>
                {v.str}
              </li>
            );
          })}
        </div>
      </div>
    );
  }
  /*----- private -----*/
  /*
   *
   */
  attachEvents(editor: Editor) {
    this.statusBar = document.querySelector(
      "#app-container .main-layout .editor-layout .editor-status-bar-layout"
    );

    // refresh
    this.updateState();

    const { cm } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("changes", this.handleCmUpdate);
    cm.on("scroll", this.handleCmScroll);

    // for sidetoc overflow-y
    inkdrop.window.on("resize", this.handleWindowResize);

    // hook preview scroll
    const editorEle = $(".editor");
    if (editorEle == null) {
      return;
    }
    // preview element
    const preview = editorEle.querySelector(".mde-preview");
    if (preview == null) {
      return;
    }
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
  }
  /*
   *
   */
  detachEvents(editor: Editor) {
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleCmUpdate);
    cm.off("scroll", this.handleCmScroll);

    inkdrop.window.off("resize", this.handleWindowResize);
    this.paneState.observer!.disconnect();
    this.paneState.bodyObserver!.disconnect();

    // TODO
    //const preview = editorEle.querySelector(".mde-preview");
    //preview.removeEventListener("scroll", this.handlePreviewScroll);
  }
  /*
   *
   */
  updateState = (option = {}) => {
    const editor = inkdrop.getActiveEditor();
    if (editor == null) {
      return;
    }
    const ret = ripper.parse(this.props);
    // renew state
    const newState = Object.assign(option, {
      headers: ret.headers,
      min: ret.min,
      len: editor.cm.lineCount(),
    });

    this.commit(newState);

    return newState;
  };
  /*
   *
   */
  updateSection(line: number): void {
    const header = this.getCurrentHeader(line);
    if (header != null && this.state.currentHeader != header) {
      this.commit({ currentHeader: header });
    }
  }
  /*
   *
   */
  handleVisibility = () => {
    this.commit({ visibility: !this.state.visibility });
    setTimeout(() => {
      inkdrop.commands.dispatch(document.body, "editor:refresh");
    }, 10);
  };
  /*
   *
   */
  handleCmUpdate = () => {
    if (this.props.editingNote._id != this.paneState.noteId) {
      this.paneState.noteId = this.props.editingNote._id;
      this.paneState.previewCurrent = "";
      const newState = this.updateState();
      if (newState != null && newState.headers.length > 0) {
        this.paneState.previewCurrent = "_" + newState.headers[0].str.replace(/ /g, "");
        setTimeout(() => {
          this.handleCursorActivity(inkdrop.getActiveEditor().cm, true);
        }, 100);
      }
      return;
    }

    const editor = inkdrop.getActiveEditor();
    const { cm } = editor;
    const text = cm.lineInfo(cm.getCursor().line).text as string;
    // forcely udpate when starts width "#"
    if (!text.startsWith("#")) {
      // edited normal line.
      if (this.state.len == editor.cm.lineCount()) {
        return;
      }
    }

    // delay to catch the ime covnersion.
    setTimeout(() => this.updateState(), 100);
  };
  /*
   *
   */
  handleCursorActivity = (cm: CodeMirror.Editor, forcibly: boolean = false) => {
    const cur = cm.getCursor();
    if (!forcibly && cur.line == this.paneState.lastLine) {
      return;
    }
    this.paneState.lastLine = cur.line;
    this.updateSection(cur.line);
    this.paneState.cursorTime = new Date();
  };
  /*
   * Handle scrolling and refresh highlight section.
   */
  handleCmScroll = (cm: CodeMirror.Editor) => {
    // prioritize handleCursorActivity
    if (
      this.paneState.cursorTime != null &&
      new Date().getTime() - this.paneState.cursorTime.getTime() < 100
    ) {
      return;
    }

    const info = cm.getScrollInfo();
    // todo: with adjusted value
    let top = info.top + inkdrop.config.get("editor.cursorScrollMargin");
    // for scrool to bottom
    if (top + info.clientHeight >= info.height) {
      top = info.height - 10;
    }
    const line = cm.lineAtHeight(top, "local");

    this.updateSection(line);
  };
  /*
   *
   */
  handleJumpToPrev = () => {
    // for preview mode
    if (this.paneState.isPreview) {
      const preview = document.querySelector<HTMLElement>(".mde-preview")!;
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
    const { cm } = inkdrop.getActiveEditor();
    const { line } = cm.getCursor();
    const header = this.getCurrentHeader(line);
    const prev = this.getPrevHeader(header, line);
    if (prev != null) {
      cm.setCursor(prev.rowStart, 0);
      this.handleCursorActivity(cm);
    }
  };
  /*
   *
   */
  handleJumpToNext = () => {
    // for preview mode
    if (this.paneState.isPreview) {
      const preview = document.querySelector<HTMLElement>(".mde-preview")!;
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
    const { cm } = inkdrop.getActiveEditor();
    const { line } = cm.getCursor();
    const header = this.getCurrentHeader(line);
    const next = this.getNextHeader(header);
    if (next != null) {
      const vp = cm.getViewport();
      cm.setCursor(next.rowStart + Math.round((vp.to - vp.from) / 2), 0);
      cm.setCursor(next.rowStart, 0);
      this.handleCursorActivity(cm);
    }
  };
  /*
   *
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
    const preview = editorEle.querySelector(".mde-preview");
    preview!.querySelectorAll<HTMLElement>("*").forEach((v: HTMLElement) => {
      if (v.tagName.length == 2 && v.tagName.startsWith("H")) {
        this.paneState.previewHeaders.push(v);
      }
    });
  };

  /*
   * Handle preview scroll.
   */
  handlePreviewScroll = (_: Event) => {
    // skip editor mode
    if (!this.paneState.isPreview) {
      return;
    }

    // for first preview
    if (this.paneState.firstPreview) {
      this.paneState.firstPreview = false;
      this.handlePreviewUpdate($(".editor"));
    }

    const diff = document.querySelector(".mde-preview")!.getBoundingClientRect().y;
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
          const { cm } = inkdrop.getActiveEditor();
          const item = this.state.headers[k - 1];
          if (item != null) {
            cm.setCursor(item.rowStart, 0);
            this.forceUpdate();
          }
        }

        break;
      }
    }
  };
  /*
   *
   */
  handleWindowResize = () => {
    // Handle size changed.
    if (!this.state.visibility) {
      return;
    }

    this.updateState();
  };
  /*
   * scroll to header
   */
  handleClick = (header: HeaderItem) => {
    // for preview mode
    if (this.paneState.isPreview) {
      for (let i = 0; i < this.state.headers.length; i++) {
        if (this.state.headers[i] == header) {
          const preview = document.querySelector<HTMLElement>(".mde-preview")!;
          preview.scrollTop = this.paneState.previewHeaders[i].offsetTop - preview.offsetTop;
          inkdrop.commands.dispatch(document.body, "editor:focus");
          break;
        }
      }
      return;
    }

    const cm = inkdrop.getActiveEditor().cm;
    cm.scrollTo(0, 99999);
    cm.setCursor(header.rowStart, 0);
    cm.focus();
  };
  /*
   *
   */
  handleChangeWidth = (mode: WidthChangeMode) => Settings.changeCurrentWidth(mode);
  /*
   *
   */
  handleToggleTextwrap = () => {
    Settings.toggleTextWrap();
    this.commit({});
  };
  /*
   * convert to style
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
   *
   */
  isSameHeader(h1: HeaderItem | null, h2: HeaderItem): boolean {
    if (h1 == null) {
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
   *
   */
  getCurrentHeader(line: number): HeaderItem | null {
    let len = this.state.headers.length;
    for (let i = 0; i < len; i++) {
      let header = this.state.headers[i];
      if (header == null) {
        continue;
      }
      if (line >= header.rowStart && line <= header.rowEnd) {
        return header;
      }
    }
    return null;
  }
  /*
   *
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
   *
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
   *
   */
  commit(state: {}): void {
    // this.log(() => "★★★ commit");
    this.paneState.content = null;
    this.setState(state);
  }
  /*
   *
   */
  log(_: () => string) {
    // console.log(`sidetoc: ${_()}`);
  }
}
