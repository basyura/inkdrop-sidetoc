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
    this.state = { headers: [], min: 0, len: 0 };
    // handle event
    this.dispatchId = dispatcher.register(this.handleActions.bind(this));

    let editor = inkdrop.getActiveEditor();
    if (editor != null) {
      this.updateState();
      this.attatchEvents(editor);
    } else {
      inkdrop.onEditorLoad((e) => {
        this.updateState();
        this.attatchEvents(e);
      });
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
      return
    }
    const { cm } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleUpdate);
    cm.off("scroll", this.handleScroll);
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
        if (header != null && header.index - 1 >= 0) {
          const prev = this.state.headers[header.index - 1];
          cm.setCursor(prev.rowStart, 0);
        }
        break;
      case "JumpToNext":
        if (header != null && header.index + 1 < this.state.headers.length) {
          const next = this.state.headers[header.index + 1];
          cm.scrollTo(0, 99999);
          cm.setCursor(next.rowStart, 0);
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
