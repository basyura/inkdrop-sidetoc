"use babel";

import * as React from "react";
import * as ripper from "./ripper";
import dispatcher from "./dispatcher";
import Settings from "./settings";
import { PaneState } from './pane-state'
import { DispatchAction, HeaderItem } from "./types";

const $ = (query: string) => document.querySelector(query);

declare var inkdrop: any;

export default class SideTocPane extends React.Component {
  iState = new PaneState();
  state: any;
  props: any;

  /*
   *
   */
  componentWillMount() {
    // state of this component
    this.state = { visibility: true, headers: [], min: 0, len: 0 };

    this.iState.dispatchId = dispatcher.register((action: DispatchAction) =>
      this.dispachAction(action)
    );

    let editor = inkdrop.getActiveEditor();
    if (editor != null) {
      this.attatchEvents(editor);
    } else {
      inkdrop.onEditorLoad((e: any) => this.attatchEvents(e));
    }
  }
  /*
   *
   */
  componentDidUpdate() {
    this.log(() => "★★★ componentDidUpdate");
    if (this.iState.curSectionRef.current != null) {
      this.iState.curSectionRef.current.scrollIntoView();
    }
  }
  /*
   *
   */
  componentWillUnmount() {
    // unhandle event
    dispatcher.unregister(this.iState.dispatchId);

    let editor = inkdrop.getActiveEditor();
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
      height: inkdrop.window.getSize()[1] - this.iState.heightDiff
    };

    // current header key for preview which join header text with "_".
    let current = "";

    return (
      <div className={className} style={style}>
        {this.state.headers.map((v: HeaderItem) => {
          current += "_" + v.str;
          const { style, isCurrent } = this.toStyle(v, current);
          let ref = isCurrent ? this.iState.curSectionRef : null;
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
  attatchEvents(editor: any) {
    // refresh
    this.updateState();

    const { cm } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("changes", this.handleCmUpdate);
    cm.on("scroll", this.handleCmScroll);

    // for sidetoc overflow-y
    const winHeight = inkdrop.window.getSize()[1];
    this.iState.heightDiff = winHeight - cm.getScrollInfo().clientHeight;
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
    this.iState.isPreview = editorEle.classList.contains(
      "editor-viewmode-preview"
    );
    // observe preview update
    this.iState.observer = new MutationObserver(_ =>
      this.handlePreviewUpdate(editorEle)
    );

    this.iState.observer.observe(preview, { attributes: true, subtree: true });
  }
  /*
   *
   */
  dettatchEvents(editor: any) {
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleCmUpdate);
    cm.off("scroll", this.handleCmScroll);

    inkdrop.window.off("resize", this.handleWindowResize);
    this.iState.observer!.disconnect();

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
    let ret: any = ripper.parse(this.props);
    ret["len"] = editor.cm.lineCount();

    const newState = Object.assign(option, ret);

    this.commit(newState);
  };
  /*
   *
   */
  updateSection(line: number) {
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
    if (this.props.editingNote._id != this.iState.noteId) {
      this.iState.noteId = this.props.editingNote._id;
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
  handleCursorActivity = (cm: any) => {
    let cur = cm.getCursor();
    if (cur.line == this.iState.lastLine) {
      return;
    }
    this.iState.lastLine = cur.line;
    this.updateSection(cur.line);
    this.iState.cursorTime = new Date();
  };
  /*
   * Handle scrolling and refresh highlight section.
   */
  handleCmScroll = (cm: any) => {
    // prioritize handleCursorActivity
    if (
      this.iState.cursorTime != null &&
      new Date().getTime() - this.iState.cursorTime.getTime() < 100
    ) {
      return;
    }

    let info = cm.getScrollInfo();
    // todo: with adjusted value
    let top = info.top + inkdrop.config.get("editor.cursorScrollMargin");
    // for scrool to bottom
    if (top + info.clientHeight >= info.height) {
      top = info.height - 10;
    }
    let line = cm.lineAtHeight(top, "local");

    this.updateSection(line);
  };
  /*
   *
   */
  handleJumpToPrev = () => {
    // for preview mode
    if (this.iState.isPreview) {
      for (let i = 1; i < this.iState.previewHeaders.length; i++) {
        const header = this.iState.previewHeaders[i];
        const top = header.getBoundingClientRect().top;
        if (top > 0) {
          this.iState.previewHeaders[i - 1].scrollIntoView();
          return;
        }
      }
      this.iState.previewHeaders[
        this.iState.previewHeaders.length - 1
      ].scrollIntoView();
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
    if (this.iState.isPreview) {
      for (let i = this.iState.previewHeaders.length - 2; i >= 0; i--) {
        const header = this.iState.previewHeaders[i];
        const top = header.getBoundingClientRect().top;
        if (top < 100) {
          this.iState.previewHeaders[i + 1].scrollIntoView();
          break;
        }
      }
      return;
    }

    // for editor mode
    const { cm } = inkdrop.getActiveEditor();
    const { line } = cm.getCursor();
    const header = this.getCurrentHeader(line);
    const next = this.getNextHeader(header, line);
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

    this.iState.isPreview = editorEle.classList.contains(
      "editor-viewmode-preview"
    );
    // skip editor mode
    if (!this.iState.isPreview) {
      return;
    }

    this.iState.previewHeaders = [];

    const preview = editorEle.querySelector(".mde-preview");
    preview!.querySelectorAll("*").forEach((v: Element) => {
      if (v.tagName.length == 2 && v.tagName.startsWith("H")) {
        this.iState.previewHeaders.push(v);
      }
    });
  };

  /*
   * Handle preview scroll.
   */
  handlePreviewScroll = (_: Event) => {
    // skip editor mode
    if (!this.iState.isPreview) {
      return;
    }

    // for first preview
    if (this.iState.firstPreview) {
      this.iState.firstPreview = false;
      this.handlePreviewUpdate($(".editor"));
    }

    // analyze current header
    for (let i = this.iState.previewHeaders.length - 1; i >= 0; i--) {
      const top = this.iState.previewHeaders[i].getBoundingClientRect().top;
      // create current header key
      if (top < 100) {
        let current = "";
        let k = 0;
        for (k = 0; k <= i; k++) {
          current += "_" + this.iState.previewHeaders[k].textContent;
        }
        // change preview current
        if (this.iState.previewCurrent != current) {
          this.iState.previewCurrent = current;

          // move cursor to active header
          const { cm } = inkdrop.getActiveEditor();
          const header = this.state.headers[k - 1];
          cm.setCursor(header.rowStart, 0);

          /*
          let height = cm.heightAtLine(
            this.state.headers[k - 1].rowStart,
            "local"
          );

          console.log("height: " + height);

          //cm.scrollTo(0, height);

          console.log("Row:" + this.state.headers[k - 1].rowStart);
          cm.scrollIntoView({
            line: this.state.headers[k - 1].rowStart,
            char: 0,
          });
          */

          this.forceUpdate();
        }

        break;
      }
    }
  };
  /*
   *
   */
  handleWindowResize = (_: any) => {
    // Handle size changed.
    if (!this.state.visibility) {
      return;
    }

    this.updateState();
  };
  /*
   * scroll to header
   */
  handleClick = (header: HeaderItem, _: any) => {
    // for preview mode
    if (this.iState.isPreview) {
      for (let i = 0; i < this.state.headers.length; i++) {
        if (this.state.headers[i] == header) {
          this.iState.previewHeaders[i].scrollIntoView();
          inkdrop.commands.dispatch(document.body, "editor:focus");
          break;
        }
      }
      return;
    }

    let cm = inkdrop.getActiveEditor().cm;
    cm.scrollTo(0, 99999);
    cm.setCursor(header.rowStart, 0);
    cm.focus();
  };
  /*
   * convert to style
   */
  toStyle = (header: any, current: any) => {
    let style: any = {
      marginLeft: 20 * (header.count - this.state.min),
      cursor: "pointer"
    };

    let isCurrent = false;

    if (this.iState.isPreview) {
      if (this.iState.previewCurrent == current) {
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
  getCurrentHeader(line: number) {
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
  getPrevHeader(header: any, line: any) {
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
  getNextHeader(header: any, _: any) {
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
  commit(state: any) {
    this.log(() => "★★★ commit");
    this.setState(state);
  }
  /*
   *
   */
  log(_: any) {
    //console.log(`sidetoc: ${fn()}`);
  }
}
