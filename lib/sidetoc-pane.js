"use strict";
"use babel";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var React = _interopRequireWildcard(require("react"));

var ripper = _interopRequireWildcard(require("./ripper"));

var _dispatcher = _interopRequireDefault(require("./dispatcher"));

var _settings = _interopRequireDefault(require("./settings"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class SideTocPane extends React.Component {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "updateState", () => {
      const editor = inkdrop.getActiveEditor();

      if (editor == null) {
        return;
      }

      const {
        cm
      } = editor;
      const len = cm.lineCount();
      const {
        headers,
        min
      } = ripper.parse(this.props);
      this.setState({
        headers,
        min,
        len
      });
    });

    _defineProperty(this, "handleUpdate", _ => {
      const editor = inkdrop.getActiveEditor();
      const {
        cm
      } = editor;
      const text = cm.lineInfo(cm.getCursor().line).text; // forcely udpate when starts width "#"

      if (!text.startsWith("#")) {
        // update if content lenghth changed
        if (this.state.len == cm.lineCount()) {
          return;
        }
      }

      this.updateState();
    });

    _defineProperty(this, "handleCursorActivity", cm => {
      let cur = cm.getCursor();
      this.updateSection(cur.line);
      this.cursorTime = new Date();
    });

    _defineProperty(this, "handleScroll", cm => {
      // prioritize handleCursorActivity
      if (this.cursorTime != null && new Date().getTime() - this.cursorTime.getTime() < 100) {
        return;
      }

      let info = cm.getScrollInfo(); // todo: with adjusted value

      let top = info.top + inkdrop.config.get("editor.cursorScrollMargin"); // for scrool to bottom

      if (top + info.clientHeight >= info.height) {
        top = info.height - 10;
      }

      let line = cm.lineAtHeight(top, "local");
      this.updateSection(line);
    });

    _defineProperty(this, "handleClick", (header, _) => {
      let cm = inkdrop.getActiveEditor().cm;
      cm.scrollTo(0, 99999);
      cm.setCursor(header.rowStart, 0);
      cm.focus();
    });

    _defineProperty(this, "toStyle", header => {
      let style = {
        marginLeft: 20 * (header.count - this.state.min),
        cursor: "pointer"
      };

      if (this.state.currentHeader == header) {
        style.backgroundColor = _settings.default.hicolor;
      }

      return style;
    });
  }

  /*
   *
   */
  componentWillMount() {
    this.state = {
      headers: [],
      min: 0,
      len: 0
    }; // handle event

    this.dispatchId = _dispatcher.default.register(this.handleActions.bind(this));
    let editor = inkdrop.getActiveEditor();

    if (editor != null) {
      this.attatchEvents(editor);
    } else {
      inkdrop.onEditorLoad(e => this.attatchEvents(e));
    }
  }
  /*
   *
   */


  componentWillUnmount() {
    // unhandle event
    _dispatcher.default.unregister(this.dispatchId);

    let editor = inkdrop.getActiveEditor(); // for delete note

    if (editor == null) {
      return;
    }

    this.dettatchEvents(editor);
  }
  /*
   *
   */


  handleActions(action) {
    const {
      cm
    } = inkdrop.getActiveEditor();
    const {
      line
    } = cm.getCursor();
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
    let style = {
      fontFamily: _settings.default.fontFamily
    };

    if (this.state.headers.length == 0) {
      style.minWidth = "0px";
      style.maxWidth = "0px";
    }

    return /*#__PURE__*/React.createElement("div", {
      className: "sidetoc-pane",
      style: style
    }, this.state.headers.map(v => /*#__PURE__*/React.createElement("li", {
      style: this.toStyle(v),
      onClick: this.handleClick.bind(this, v)
    }, v.str)));
  }
  /*----- private -----*/

  /*
   *
   */


  attatchEvents(editor) {
    this.updateState();
    const {
      cm
    } = editor;
    cm.on("cursorActivity", this.handleCursorActivity);
    cm.on("update", this.handleUpdate);
    cm.on("scroll", this.handleScroll);
  }
  /*
   *
   */


  dettatchEvents(editor) {
    const {
      cm
    } = editor;
    cm.off("cursorActivity", this.handleCursorActivity);
    cm.off("update", this.handleUpdate);
    cm.off("scroll", this.handleScroll);
  }
  /*
   *
   */


  /*
   *
   */
  updateSection(line) {
    const header = this.getCurrentHeader(line);

    if (header != null && this.state.currentHeader != header) {
      this.setState({
        currentHeader: header
      });
    }
  }
  /*
   * scroll to header
   */


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
    } // first header


    if (header.index == 0) {
      return header;
    }

    if (header.index - 1 >= 0) {
      // Jump to prev header
      if (header.rowStart == line) {
        return this.state.headers[header.index - 1];
      } // Jump to current header line if cursor is not current header.


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

exports.default = SideTocPane;