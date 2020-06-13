"use babel";

import React from "react";
import * as ripper from "./ripper";
import dispatcher from "./dispatcher";
import Settings from "./settings";

export default class SideTocPane extends React.Component {
  /*
   *
   */
  componentWillMount() {
    this.state = { visibility: true, headers: [], min: 0, len: 0 };
    // last cursor line
    this.lastLine = -1;
    // current note id
    this.noteId = "";
    // diff between window and codemirror to apply to sidetoc height
    this.heightDiff = 0;
    // ref to scrollIntoView
    this.curSectionRef = React.createRef();
    // for handle event
    this.dispatchId = dispatcher.register(this.handleActions.bind(this));
    // previewMode
    this.isPreview = false;
    // preview headers. this value is cleared with null when mode change to preview.
    this.previewHeaders = null;
    // preview current header
    this.previewcurrent = "";

    let editor = inkdrop.getActiveEditor();
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
    if (this.curSectionRef.current != null) {
      this.curSectionRef.current.scrollIntoView();
    }
  }
  /*
   *
   */
  componentWillUnmount() {
    // unhandle event
    dispatcher.unregister(this.dispatchId);

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
  handleActions(action) {
    const { cm } = inkdrop.getActiveEditor();
    const { line } = cm.getCursor();
    const header = this.getCurrentHeader(line);

    switch (action.type) {
      case "Toggle":
        this.handleVisibility(action);
        break;
      case "JumpToPrev":
        const prev = this.getPrevHeader(header, line);
        if (prev != null) {
          cm.setCursor(prev.rowStart, 0);
          this.handleCursorActivity(cm);
        }
        break;
      case "JumpToNext":
        const next = this.getNextHeader(header, line);
        if (next != null) {
          cm.scrollTo(0, 99999);
          cm.setCursor(next.rowStart, 0);
          this.handleCursorActivity(cm);
        }
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
      height: inkdrop.window.getSize()[1] - this.heightDiff,
    };

    // current header key which join header text with "_".
    let current = "";

    return (
      <div className={className} style={style}>
        {this.state.headers.map((v) => {
          current += "_" + v.str;
          const { style, isCurrent } = this.toStyle(v, current);
          let ref = isCurrent ? this.curSectionRef : null;
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
  attatchEvents(editor) {
    // refresh
    this.updateState();

    const { cm } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("changes", this.handleCmUpdate);
    cm.on("scroll", this.handleCmScroll);

    // for sidetoc overflow-y
    const winHeight = inkdrop.window.getSize()[1];
    this.heightDiff = winHeight - cm.getScrollInfo().clientHeight;
    inkdrop.window.on("resize", this.handleWindowResize);

    // hook preview scroll
    const editorEle = document.querySelector(".editor");
    const preview = editorEle.querySelector(".mde-preview");
    preview.addEventListener("scroll", this.handlePreviewScroll);

    // check initial view mode
    this.isPreview = editorEle.classList.contains("editor-viewmode-preview");
    if (this.isPreview) {
      this.handlePreviewUpdate(editorEle);
    }
    // observe preview update
    this.observer = new MutationObserver((_) =>
      this.handlePreviewUpdate(editorEle)
    );
    this.observer.observe(preview, { attributes: true, subtree: true });

    // hook view mode
    /*
    this.observer = new MutationObserver((mutations) => {
      this.isPreview = mutations[0].target.classList.contains(
        "editor-viewmode-preview"
      );
      this.previewHeaders = null;
    });
    this.observer.observe(editorEle, { attributes: true });
    */
  }
  /*
   *
   */
  dettatchEvents(editor) {
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleCmUpdate);
    cm.off("scroll", this.handleCmScroll);

    inkdrop.window.off("resize", this.handleWindowResize);
    this.observer.disconnect();

    const preview = editorEle.querySelector(".mde-preview");
    preview.removeEventListener("scroll", this.handlePreviewScroll);
  }
  /*
   *
   */
  updateState = (option = {}) => {
    const editor = inkdrop.getActiveEditor();
    if (editor == null) {
      return;
    }
    let ret = ripper.parse(this.props);
    ret["len"] = editor.cm.lineCount();

    const newState = Object.assign(option, ret);

    this.commit(newState);
  };
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
  handleCmUpdate = (_) => {
    if (this.props.editingNote._id != this.noteId) {
      this.noteId = this.props.editingNote._id;
      this.updateState();
      return;
    }

    const editor = inkdrop.getActiveEditor();
    const { cm } = editor;
    const text = cm.lineInfo(cm.getCursor().line).text;
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
  handleCursorActivity = (cm) => {
    let cur = cm.getCursor();
    if (cur.line == this.lastLine) {
      return;
    }
    this.lastLine = cur.line;
    this.updateSection(cur.line);
    this.cursorTime = new Date();
  };
  /*
   * Handle scrolling and refresh highlight section.
   */
  handleCmScroll = (cm) => {
    // prioritize handleCursorActivity
    if (
      this.cursorTime != null &&
      new Date().getTime() - this.cursorTime.getTime() < 100
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
  handlePreviewUpdate = (editorEle) => {
    this.isPreview = editorEle.classList.contains("editor-viewmode-preview");
    if (!this.isPreview) {
      return;
    }

    console.log("--- preview update ---");
    this.previewHeaders = [];

    const preview = editorEle.querySelector(".mde-preview");
    preview.querySelectorAll("*").forEach((v) => {
      if (v.tagName.length == 2 && v.tagName.startsWith("H")) {
        this.previewHeaders.push(v);
        console.log(v.innerText + " : " + v.getBoundingClientRect().top);
      }
    });
  };

  /*
   * Handle preview scroll.
   */
  handlePreviewScroll = (evnt) => {
    if (!this.isPreview) {
      return;
    }

    for (let i = this.previewHeaders.length - 1; i >= 0; i--) {
      const header = this.previewHeaders[i];
      const top = header.getBoundingClientRect().top;
      // create current header key
      if (top < 100) {
        let current = "";
        for (let k = 0; k <= i; k++) {
          current += "_" + this.previewHeaders[k].innerText;
        }

        if (this.previewCurrent != current) {
          this.previewCurrent = current;
          this.forceUpdate();
        }

        break;
      }
    }
  };
  /*
   *
   */
  handleWindowResize = (cm) => {
    // Handle size changed.
    if (!this.state.visibility) {
      return;
    }

    this.updateState();
  };
  /*
   *
   */
  updateSection(line) {
    const header = this.getCurrentHeader(line);
    if (header != null && this.state.currentHeader != header) {
      this.commit({ currentHeader: header });
    }
  }
  /*
   * scroll to header
   */
  handleClick = (header, _) => {
    // for preview mode
    if (this.isPreview) {
      for (let i = 0; i < this.state.headers.length; i++) {
        if (this.state.headers[i] == header) {
          this.previewHeaders[i].scrollIntoView();
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
  toStyle = (header, current) => {
    let style = {
      marginLeft: 20 * (header.count - this.state.min),
      cursor: "pointer",
    };

    let isCurrent = false;

    if (this.isPreview) {
      if (this.previewCurrent == current) {
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
  getCurrentHeader(line) {
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
  getPrevHeader(header, line) {
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
  getNextHeader(header, line) {
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
  commit(state) {
    this.log(() => "★★★ commit");
    this.setState(state);
  }
  /*
   *
   */
  log(fn) {
    console.log(`sidetoc: ${fn()}`);
  }
}
