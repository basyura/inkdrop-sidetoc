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
    this.state = { headers: [], min: 0, len: 0 };
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
      case "ToggleShow":
        this.updateState();
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
      default:
    }
  }
  /*
   *
   */
  render() {
    let style = { fontFamily: Settings.fontFamily };
    if (this.state.headers.length == 0) {
      style.minWidth = "0px";
      style.maxWidth = "0px";
    }

    return (
      <div className="sidetoc-pane" style={style}>
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
    cm.on("update", this.handleUpdate);
    cm.on("scroll", this.handleScroll);
  }
  /*
   *
   */
  dettatchEvents(editor) {
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleUpdate);
    cm.off("scroll", this.handleScroll);
  }
  /*
   *
   */
  updateState = () => {
    const editor = inkdrop.getActiveEditor();
    if (editor == null) {
      return;
    }
    const { cm } = editor;
    const len = cm.lineCount();
    const { headers, min } = ripper.parse(this.props);

    this.setState({ headers, min, len });
  };
  /*
   *
   */
  handleUpdate = (_) => {
    const editor = inkdrop.getActiveEditor();
    const { cm } = editor;
    const text = cm.lineInfo(cm.getCursor().line).text;
    // forcely udpate when starts width "#"
    if (!text.startsWith("#")) {
      // update if content lenghth changed
      if (this.state.len == cm.lineCount()) {
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
    this.updateSection(cur.line);
    this.cursorTime = new Date();
  };
  /*
   * refresh highlight section
   */
  handleScroll = (cm) => {
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
  updateSection(line) {
    const header = this.getCurrentHeader(line);
    if (header != null && this.state.currentHeader != header) {
      this.setState({ currentHeader: header });
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
    let style = { marginLeft: 20 * (header.count - this.state.min) };
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
}
