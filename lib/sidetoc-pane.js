"use babel";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as React from "react";
import * as ripper from "./ripper";
import dispatcher from "./dispatcher";
import Settings from "./settings";
import { PaneState } from "./pane-state";
var $ = function (query) { return document.querySelector(query); };
var SideTocPane = /** @class */ (function (_super) {
    __extends(SideTocPane, _super);
    function SideTocPane() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // internal state
        _this.iState = new PaneState();
        /*
         *
         */
        _this.updateState = function (option) {
            if (option === void 0) { option = {}; }
            var editor = inkdrop.getActiveEditor();
            if (editor == null) {
                return;
            }
            var ret = ripper.parse(_this.props);
            ret["len"] = editor.cm.lineCount();
            var newState = Object.assign(option, ret);
            _this.commit(newState);
        };
        /*
         *
         */
        _this.handleVisibility = function () {
            // show to hide
            if (_this.state.visibility) {
                _this.commit({ visibility: false });
                inkdrop.getActiveEditor().forceUpdate();
                return;
            }
            // hide to show and update section
            _this.updateState({ visibility: true });
            inkdrop.getActiveEditor().forceUpdate();
        };
        /*
         *
         */
        _this.handleCmUpdate = function () {
            if (_this.props.editingNote._id != _this.iState.noteId) {
                _this.iState.noteId = _this.props.editingNote._id;
                _this.updateState();
                return;
            }
            var editor = inkdrop.getActiveEditor();
            var cm = editor.cm;
            var text = cm.lineInfo(cm.getCursor().line).text;
            // forcely udpate when starts width "#"
            if (!text.startsWith("#")) {
                // edited normal line.
                if (_this.state.len == editor.cm.lineCount()) {
                    return;
                }
            }
            _this.updateState();
        };
        /*
         *
         */
        _this.handleCursorActivity = function (cm) {
            var cur = cm.getCursor();
            if (cur.line == _this.iState.lastLine) {
                return;
            }
            _this.iState.lastLine = cur.line;
            _this.updateSection(cur.line);
            _this.iState.cursorTime = new Date();
        };
        /*
         * Handle scrolling and refresh highlight section.
         */
        _this.handleCmScroll = function (cm) {
            // prioritize handleCursorActivity
            if (_this.iState.cursorTime != null &&
                new Date().getTime() - _this.iState.cursorTime.getTime() < 100) {
                return;
            }
            var info = cm.getScrollInfo();
            // todo: with adjusted value
            var top = info.top + inkdrop.config.get("editor.cursorScrollMargin");
            // for scrool to bottom
            if (top + info.clientHeight >= info.height) {
                top = info.height - 10;
            }
            var line = cm.lineAtHeight(top, "local");
            _this.updateSection(line);
        };
        /*
         *
         */
        _this.handleJumpToPrev = function () {
            // for preview mode
            if (_this.iState.isPreview) {
                for (var i = 1; i < _this.iState.previewHeaders.length; i++) {
                    var header_1 = _this.iState.previewHeaders[i];
                    var top_1 = header_1.getBoundingClientRect().top;
                    if (top_1 > 0) {
                        _this.iState.previewHeaders[i - 1].scrollIntoView();
                        return;
                    }
                }
                _this.iState.previewHeaders[_this.iState.previewHeaders.length - 1].scrollIntoView();
                return;
            }
            // for editor mode
            var cm = inkdrop.getActiveEditor().cm;
            var line = cm.getCursor().line;
            var header = _this.getCurrentHeader(line);
            var prev = _this.getPrevHeader(header, line);
            if (prev != null) {
                cm.setCursor(prev.rowStart, 0);
                _this.handleCursorActivity(cm);
            }
        };
        /*
         *
         */
        _this.handleJumpToNext = function () {
            // for preview mode
            if (_this.iState.isPreview) {
                for (var i = _this.iState.previewHeaders.length - 2; i >= 0; i--) {
                    var header_2 = _this.iState.previewHeaders[i];
                    var top_2 = header_2.getBoundingClientRect().top;
                    if (top_2 < 100) {
                        _this.iState.previewHeaders[i + 1].scrollIntoView();
                        break;
                    }
                }
                return;
            }
            // for editor mode
            var cm = inkdrop.getActiveEditor().cm;
            var line = cm.getCursor().line;
            var header = _this.getCurrentHeader(line);
            var next = _this.getNextHeader(header, line);
            if (next != null) {
                cm.scrollTo(0, 99999);
                cm.setCursor(next.rowStart, 0);
                _this.handleCursorActivity(cm);
            }
        };
        /*
         *
         */
        _this.handlePreviewUpdate = function (editorEle) {
            if (editorEle == null) {
                return;
            }
            _this.iState.isPreview = editorEle.classList.contains("editor-viewmode-preview");
            // skip editor mode
            if (!_this.iState.isPreview) {
                return;
            }
            _this.iState.previewHeaders = [];
            var preview = editorEle.querySelector(".mde-preview");
            preview.querySelectorAll("*").forEach(function (v) {
                if (v.tagName.length == 2 && v.tagName.startsWith("H")) {
                    _this.iState.previewHeaders.push(v);
                }
            });
        };
        /*
         * Handle preview scroll.
         */
        _this.handlePreviewScroll = function (_) {
            // skip editor mode
            if (!_this.iState.isPreview) {
                return;
            }
            // for first preview
            if (_this.iState.firstPreview) {
                _this.iState.firstPreview = false;
                _this.handlePreviewUpdate($(".editor"));
            }
            // analyze current header
            for (var i = _this.iState.previewHeaders.length - 1; i >= 0; i--) {
                var top_3 = _this.iState.previewHeaders[i].getBoundingClientRect().top;
                // create current header key
                if (top_3 < 100) {
                    var current = "";
                    var k = 0;
                    for (k = 0; k <= i; k++) {
                        current += "_" + _this.iState.previewHeaders[k].textContent;
                    }
                    // change preview current
                    if (_this.iState.previewCurrent != current) {
                        _this.iState.previewCurrent = current;
                        // move cursor to active header
                        var cm = inkdrop.getActiveEditor().cm;
                        var header = _this.state.headers[k - 1];
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
                        _this.forceUpdate();
                    }
                    break;
                }
            }
        };
        /*
         *
         */
        _this.handleWindowResize = function (_) {
            // Handle size changed.
            if (!_this.state.visibility) {
                return;
            }
            _this.updateState();
        };
        /*
         * scroll to header
         */
        _this.handleClick = function (header, _) {
            // for preview mode
            if (_this.iState.isPreview) {
                for (var i = 0; i < _this.state.headers.length; i++) {
                    if (_this.state.headers[i] == header) {
                        _this.iState.previewHeaders[i].scrollIntoView();
                        inkdrop.commands.dispatch(document.body, "editor:focus");
                        break;
                    }
                }
                return;
            }
            var cm = inkdrop.getActiveEditor().cm;
            cm.scrollTo(0, 99999);
            cm.setCursor(header.rowStart, 0);
            cm.focus();
        };
        /*
         * convert to style
         */
        _this.toStyle = function (header, current) {
            var style = {
                marginLeft: 20 * (header.count - _this.state.min),
                cursor: "pointer"
            };
            var isCurrent = false;
            if (_this.iState.isPreview) {
                if (_this.iState.previewCurrent == current) {
                    isCurrent = true;
                }
            }
            else if (_this.state.currentHeader == header) {
                isCurrent = true;
            }
            if (isCurrent) {
                style.backgroundColor = Settings.hicolor;
            }
            return { style: style, isCurrent: isCurrent };
        };
        return _this;
    }
    /*
     *
     */
    SideTocPane.prototype.componentWillMount = function () {
        var _this = this;
        // state of this component
        this.state = {
            visibility: true,
            headers: [],
            currentHeader: null,
            min: 0,
            len: 0
        };
        this.iState.dispatchId = dispatcher.register(function (action) {
            return _this.dispachAction(action);
        });
        var editor = inkdrop.getActiveEditor();
        if (editor != null) {
            this.attatchEvents(editor);
        }
        else {
            inkdrop.onEditorLoad(function (e) { return _this.attatchEvents(e); });
        }
    };
    /*
     *
     */
    SideTocPane.prototype.componentDidUpdate = function () {
        this.log(function () { return "★★★ componentDidUpdate"; });
        if (this.iState.curSectionRef.current != null) {
            this.iState.curSectionRef.current.scrollIntoView();
        }
    };
    /*
     *
     */
    SideTocPane.prototype.componentWillUnmount = function () {
        // unhandle event
        dispatcher.unregister(this.iState.dispatchId);
        var editor = inkdrop.getActiveEditor();
        // for delete note
        if (editor == null) {
            return;
        }
        this.dettatchEvents(editor);
    };
    /*
     *
     */
    SideTocPane.prototype.dispachAction = function (action) {
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
    };
    /*
     *
     */
    SideTocPane.prototype.render = function () {
        var _this = this;
        this.log(function () { return "★★★ render"; });
        var className = "sidetoc-pane";
        if (!this.state.visibility || this.state.headers.length == 0) {
            className = "sidetoc-pane-hide";
        }
        var style = {
            fontFamily: Settings.fontFamily,
            height: inkdrop.window.getSize()[1] - this.iState.heightDiff
        };
        // current header key for preview which join header text with "_".
        var current = "";
        return (React.createElement("div", { className: className, style: style }, this.state.headers.map(function (v) {
            current += "_" + v.str;
            var _a = _this.toStyle(v, current), style = _a.style, isCurrent = _a.isCurrent;
            var ref = isCurrent ? _this.iState.curSectionRef : null;
            return (React.createElement("li", { style: style, onClick: _this.handleClick.bind(_this, v), ref: ref }, v.str));
        })));
    };
    /*----- private -----*/
    /*
     *
     */
    SideTocPane.prototype.attatchEvents = function (editor) {
        var _this = this;
        // refresh
        this.updateState();
        var cm = editor.cm;
        cm.on("cursorActivity", this.handleCursorActivity);
        cm.on("changes", this.handleCmUpdate);
        cm.on("scroll", this.handleCmScroll);
        // for sidetoc overflow-y
        var winHeight = inkdrop.window.getSize()[1];
        this.iState.heightDiff = winHeight - cm.getScrollInfo().clientHeight;
        inkdrop.window.on("resize", this.handleWindowResize);
        // hook preview scroll
        var editorEle = $(".editor");
        if (editorEle == null) {
            return;
        }
        // preview element
        var preview = editorEle.querySelector(".mde-preview");
        if (preview == null) {
            return;
        }
        preview.addEventListener("scroll", this.handlePreviewScroll);
        // check initial view mode
        this.iState.isPreview = editorEle.classList.contains("editor-viewmode-preview");
        // observe preview update
        this.iState.observer = new MutationObserver(function (_) {
            return _this.handlePreviewUpdate(editorEle);
        });
        this.iState.observer.observe(preview, { attributes: true, subtree: true });
    };
    /*
     *
     */
    SideTocPane.prototype.dettatchEvents = function (editor) {
        var cm = editor.cm;
        cm.off("cursorActivity", this.handleCursorActivity);
        cm.off("update", this.handleCmUpdate);
        cm.off("scroll", this.handleCmScroll);
        inkdrop.window.off("resize", this.handleWindowResize);
        this.iState.observer.disconnect();
        // TODO
        //const preview = editorEle.querySelector(".mde-preview");
        //preview.removeEventListener("scroll", this.handlePreviewScroll);
    };
    /*
     *
     */
    SideTocPane.prototype.updateSection = function (line) {
        var header = this.getCurrentHeader(line);
        if (header != null && this.state.currentHeader != header) {
            this.commit({ currentHeader: header });
        }
    };
    /*
     *
     */
    SideTocPane.prototype.getCurrentHeader = function (line) {
        var len = this.state.headers.length;
        for (var i = 0; i < len; i++) {
            var header = this.state.headers[i];
            if (header == null) {
                continue;
            }
            if (line >= header.rowStart && line <= header.rowEnd) {
                return header;
            }
        }
        return null;
    };
    /*
     *
     */
    SideTocPane.prototype.getPrevHeader = function (header, line) {
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
    };
    /*
     *
     */
    SideTocPane.prototype.getNextHeader = function (header, _) {
        if (header == null) {
            // jump to first header
            return this.state.headers.length > 0 ? this.state.headers[0] : null;
        }
        if (header.index + 1 < this.state.headers.length) {
            return this.state.headers[header.index + 1];
        }
        return null;
    };
    /*
     *
     */
    SideTocPane.prototype.commit = function (state) {
        this.log(function () { return "★★★ commit"; });
        this.setState(state);
    };
    /*
     *
     */
    SideTocPane.prototype.log = function (_) {
        //console.log(`sidetoc: ${fn()}`);
    };
    return SideTocPane;
}(React.Component));
export default SideTocPane;
