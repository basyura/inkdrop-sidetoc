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
} from "./types";

const $ = (query: string) => document.querySelector(query);

declare var inkdrop: Inkdrop;

export default class SideTocPane extends React.Component<Props, State> {
  // internal state
  paneState = new PaneState();
  /*
   *
   */
  componentWillMount() {
    // state of this component
    this.state = {
      visibility: true,
      headers: [],
      currentHeader: null,
      min: 0,
      len: 0,
    };

    this.paneState.dispatchId = dispatcher.register((action: DispatchAction) =>
      this.dispachAction(action)
    );

    const editor = inkdrop.getActiveEditor();
    if (editor != null) {
      this.attatchEvents(editor);
    } else {
      inkdrop.onEditorLoad((e) => this.attatchEvents(e));
    }
  }
  /*
   *
   */
  componentDidUpdate() {
    this.log(() => "★★★ componentDidUpdate");
    this.paneState.curSectionRef.current?.scrollIntoView();
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

    this.dettatchEvents(editor);
  }
  /*
   *
   */
  dispachAction(action: DispatchAction) {
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

      default:
    }
  }
  /*
   *
   */
  render() {
    this.log(() => "★★★ render");

    let className = "sidetoc-pane";
    if (!this.state.visibility || this.state.headers.length == 0) {
      className = "sidetoc-pane-hide";
    }

    const style = {
      fontFamily: Settings.fontFamily,
      height: inkdrop.window.getSize()[1] - this.paneState.heightDiff,
    };

    // current header key for preview which join header text with "_".
    let current = "";

    return (
      <div className={className} style={style}>
        {this.state.headers.map((v: HeaderItem) => {
          current += "_" + v.str;
          const { style, isCurrent } = this.toStyle(v, current);
          const ref = isCurrent ? this.paneState.curSectionRef : null;
          return (
            <li
              style={style}
              onClick={this.handleClick.bind(this, v)}
              ref={ref}
            >
              {v.str}
            </li>
          );
        })}
      </div>
    );
  }
  /*----- private -----*/
  /*
   *
   */
  attatchEvents(editor: Editor) {
    // refresh
    this.updateState();

    const { cm } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("changes", this.handleCmUpdate);
    cm.on("scroll", this.handleCmScroll);

    // for sidetoc overflow-y
    const winHeight = inkdrop.window.getSize()[1];
    this.paneState.heightDiff = winHeight - cm.getScrollInfo().clientHeight;
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
    this.paneState.isPreview = editorEle.classList.contains(
      "editor-viewmode-preview"
    );
    // observe preview update
    this.paneState.observer = new MutationObserver((_) =>
      this.handlePreviewUpdate(editorEle)
    );

    this.paneState.observer.observe(preview, {
      childList: true,
      subtree: true,
    });
  }
  /*
   *
   */
  dettatchEvents(editor: Editor) {
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleCmUpdate);
    cm.off("scroll", this.handleCmScroll);

    inkdrop.window.off("resize", this.handleWindowResize);
    this.paneState.observer!.disconnect();

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
    // show to hide
    if (this.state.visibility) {
      this.commit({ visibility: false });
      inkdrop.getActiveEditor().forceUpdate();
      return;
    }
    // hide to show and update section
    this.updateState({ visibility: true });
    inkdrop.getActiveEditor().forceUpdate();
  };
  /*
   *
   */
  handleCmUpdate = () => {
    if (this.props.editingNote._id != this.paneState.noteId) {
      this.paneState.noteId = this.props.editingNote._id;
      this.updateState();
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

    this.updateState();
  };
  /*
   *
   */
  handleCursorActivity = (cm: CodeMirror.Editor) => {
    const cur = cm.getCursor();
    if (cur.line == this.paneState.lastLine) {
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
      for (let i = 1; i < this.paneState.previewHeaders.length; i++) {
        const header = this.paneState.previewHeaders[i];
        const top = header.getBoundingClientRect().top;
        if (top > 0) {
          this.paneState.previewHeaders[i - 1].scrollIntoView();
          return;
        }
      }
      this.paneState.previewHeaders[
        this.paneState.previewHeaders.length - 1
      ]?.scrollIntoView();
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
      for (let i = this.paneState.previewHeaders.length - 2; i >= 0; i--) {
        const header = this.paneState.previewHeaders[i];
        const top = header.getBoundingClientRect().top;
        if (top < 100) {
          this.paneState.previewHeaders[i + 1].scrollIntoView();
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
      cm.scrollTo(0, 99999);
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

    this.paneState.isPreview = editorEle.classList.contains(
      "editor-viewmode-preview"
    );
    // skip editor mode
    if (!this.paneState.isPreview) {
      return;
    }

    this.paneState.previewHeaders = [];

    const preview = editorEle.querySelector(".mde-preview");
    preview!.querySelectorAll("*").forEach((v: Element) => {
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

    // analyze current header
    for (let i = this.paneState.previewHeaders.length - 1; i >= 0; i--) {
      const top = this.paneState.previewHeaders[i].getBoundingClientRect().top;
      // create current header key
      if (top < 100) {
        let current = "";
        let k = 0;
        for (k = 0; k <= i; k++) {
          current += "_" + this.paneState.previewHeaders[k].textContent;
        }
        // change preview current
        if (this.paneState.previewCurrent != current) {
          this.paneState.previewCurrent = current;

          // move cursor to active header
          const { cm } = inkdrop.getActiveEditor();
          const header = this.state.headers[k - 1];
          if (header != null) {
            cm.setCursor(header.rowStart, 0);
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
          this.paneState.previewHeaders[i].scrollIntoView();
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
   * convert to style
   */
  toStyle = (header: HeaderItem, current: string) => {
    let style = {
      marginLeft: 20 * (header.count - this.state.min),
      cursor: "pointer",
      backgroundColor: "",
    };

    let isCurrent = false;

    if (this.paneState.isPreview) {
      if (this.paneState.previewCurrent == current) {
        isCurrent = true;
      }
    } else if (this.state.currentHeader == header) {
      isCurrent = true;
    }

    if (isCurrent) {
      style.backgroundColor = Settings.hicolor;
    }

    return { style, isCurrent };
  };
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
    this.log(() => "★★★ commit");
    this.setState(state);
  }
  /*
   *
   */
  log(_: () => string) {
    //console.log(`sidetoc: ${fn()}`);
  }
}
