"use babel";

import * as React from "react";
import * as ripper from "./ripper";
import dispatcher from "./dispatcher";
import Settings from "./settings";

export default class SideTocPane extends React.Component {
  /*
   *
   */
  componentWillMount() {
    this.state = { visibility: true, headers: [], min: 0, len: 0 };
    this.noteId = "";
    // handle event
    this.dispatchId = dispatcher.register(this.handleActions.bind(this));

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

    return (
      <div className={className} style={{ fontFamily: Settings.fontFamily }}>
        {this.state.headers.map((v) => (
          <li style={this.toStyle(v)} onClick={this.handleClick.bind(this, v)}>
            {v.str}
          </li>
        ))}
      </div>
    );
  }
  /*----- private -----*/
  /*
   *
   */
  attatchEvents(editor) {
    this.updateState();

    const { cm } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("changes", this.handleCmUpdate);
    cm.on("scroll", this.handleCmScroll);
  }
  /*
   *
   */
  dettatchEvents(editor) {
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleCmUpdate);
    cm.off("scroll", this.handleCmScroll);
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
    this.log(() => "handleVisibility ");

    // show to hide
    if (this.state.visibility) {
      this.commit({ visibility: false });
      return;
    }
    // hide to show and update section
    this.updateState({ visibility: true });
  };
  /*
   *
   */
  handleCmUpdate = (_) => {
    if (this.props.editingNote._id != this.noteId) {
      this.noteId = this.props.editingNote._id;
      console.log("handleCmUpdate");
      this.updateState();
      return;
    }

    const editor = inkdrop.getActiveEditor();
    const { cm } = editor;
    const text = cm.lineInfo(cm.getCursor().line).text;
    // forcely udpate when starts width "#"
    if (!text.startsWith("#")) {
      return;
    }

    console.log("handleCmUpdate");
    this.updateState();
  };
  /*
   *
   */
  handleCursorActivity = (cm) => {
    console.log("handleCursorActivity ");
    let cur = cm.getCursor();
    this.updateSection(cur.line);
    this.cursorTime = new Date();
  };
  /*
   * refresh highlight section
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

    console.log("handleCmScroll");
    this.updateSection(line);
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
    let cm = inkdrop.getActiveEditor().cm;
    cm.scrollTo(0, 99999);
    cm.setCursor(header.rowStart, 0);
    cm.focus();
  };
  /*
   * convert to style
   */
  toStyle = (header) => {
    let style = {
      marginLeft: 20 * (header.count - this.state.min),
      cursor: "pointer",
    };
    if (this.state.currentHeader == header) {
      style.backgroundColor = Settings.hicolor;
    }

    return style;
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
