"use babel";

import * as React from "react";
import * as ripper from "./ripper";
import dispatcher from "./dispatcher";

export default class SideTocPane extends React.Component {
  /*
   *
   */
  componentWillMount() {
    this.initializeSettings();
    this.updateState();

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
  handleActions(action) {
    const editor = inkdrop.getActiveEditor().cm;
    const line = editor.getCursor().line;
    const header = this.getCurrentHeader(line);
    if (header == null) {
      return;
    }

    console.log(action);
    console.log(line);
    console.log(header);

    switch (action.type) {
      case "JumpToPrev":
        if (header.index - 1 >= 0) {
          const prev = this.state.headers[header.index - 1];
          editor.setCursor(prev.rowStart, 0);
          console.log(
            "jump to " + prev.rowStart + ", current: " + editor.getCursor().line
          );
        }
        break;
      case "JumpToNext":
        if (header.index + 1 < this.state.headers.length) {
          const next = this.state.headers[header.index + 1];
          editor.setCursor(next.rowStart, 0);
          console.log(
            "jump to " + next.rowStart + ", current: " + editor.getCursor().line
          );
        }
        break;
      default:
    }
  }
  /*
   *
   */
  render() {
    let style = { fontFamily: this.fontFamily };
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
   initializeSettings
   setup and observe config
  */
  initializeSettings = () => {
    // handle event
    dispatcher.register(this.handleActions.bind(this));
    // fontFamily
    inkdrop.config.observe("editor.fontFamily", (newValue) => {
      this.fontFamily = newValue;
    });
    // highlight
    inkdrop.config.observe("sidetoc.highlightColor", (newValue) => {
      this.hicolor = newValue;
      document.documentElement.style.setProperty(
        "--inkdrop-sidetoc-highlight-color",
        this.hicolor
      );
    });
    // width
    inkdrop.config.observe("sidetoc.width", (newValue) => {
      if (newValue < 10) {
        newValue = 200;
      }
      document.documentElement.style.setProperty(
        "--inkdrop-sidetoc-width",
        newValue.toString(10) + "px"
      );
    });
  };
  /*
   *
   */
  attatchEvents(editor) {
    const { cm } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("update", this.handleUpdate);
    cm.on("scroll", this.handleScroll);
  }
  /*
   *
   */
  updateState = () => {
    let { headers, min } = ripper.parse(this.props);
    let len = this.props.editingNote.body.length;
    this.setState({ headers, min, len });
  };
  /*
   *
   */
  handleUpdate = (_) => {
    if (this.state.len == this.props.editingNote.body.length) {
      return;
    }
    this.updateState();
  };
  /*
   *
   */
  handleCursorActivity = (editor) => {
    let cur = editor.getCursor();
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
      style.backgroundColor = this.hicolor;
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
}
