"use babel";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
import { WidthChangeMode, } from "./types";
var $ = function (query) { return document.querySelector(query); };
var SideTocPane = /** @class */ (function (_super) {
    __extends(SideTocPane, _super);
    function SideTocPane() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // internal state
        _this.paneState = new PaneState();
        // element cache
        _this.statusBar = null;
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
            // renew state
            var newState = Object.assign(option, {
                headers: ret.headers,
                min: ret.min,
                len: editor.cm.lineCount(),
            });
            _this.commit(newState);
            return newState;
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
            if (_this.props.editingNote._id != _this.paneState.noteId) {
                _this.paneState.noteId = _this.props.editingNote._id;
                _this.paneState.previewCurrent = "";
                var newState = _this.updateState();
                if (newState != null && newState.headers.length > 0) {
                    _this.paneState.previewCurrent = "_" + newState.headers[0].str.replace(/ /g, "");
                    setTimeout(function () {
                        _this.handleCursorActivity(inkdrop.getActiveEditor().cm, true);
                    }, 100);
                }
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
            // delay to catch the ime covnersion.
            setTimeout(function () { return _this.updateState(); }, 100);
        };
        /*
         *
         */
        _this.handleCursorActivity = function (cm, forcibly) {
            if (forcibly === void 0) { forcibly = false; }
            var cur = cm.getCursor();
            if (!forcibly && cur.line == _this.paneState.lastLine) {
                return;
            }
            _this.paneState.lastLine = cur.line;
            _this.updateSection(cur.line);
            _this.paneState.cursorTime = new Date();
        };
        /*
         * Handle scrolling and refresh highlight section.
         */
        _this.handleCmScroll = function (cm) {
            // prioritize handleCursorActivity
            if (_this.paneState.cursorTime != null &&
                new Date().getTime() - _this.paneState.cursorTime.getTime() < 100) {
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
            if (_this.paneState.isPreview) {
                var preview = document.querySelector(".mde-preview");
                for (var i = 1; i < _this.paneState.previewHeaders.length; i++) {
                    var header_1 = _this.paneState.previewHeaders[i];
                    var top_1 = header_1.getBoundingClientRect().top;
                    if (top_1 > 0) {
                        preview.scrollTop = _this.paneState.previewHeaders[i - 1].offsetTop - preview.offsetTop;
                        return;
                    }
                }
                var header_2 = _this.paneState.previewHeaders[_this.paneState.previewHeaders.length - 1];
                if (header_2 == null) {
                    return;
                }
                preview.scrollTop = header_2.offsetTop - preview.offsetTop;
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
            if (_this.paneState.isPreview) {
                var preview = document.querySelector(".mde-preview");
                var diff = preview.getBoundingClientRect().y;
                for (var i = _this.paneState.previewHeaders.length - 2; i >= 0; i--) {
                    var header_3 = _this.paneState.previewHeaders[i];
                    var top_2 = header_3.getBoundingClientRect().top;
                    // maybe under 10
                    if (top_2 - diff < 50) {
                        preview.scrollTop = _this.paneState.previewHeaders[i + 1].offsetTop - preview.offsetTop;
                        break;
                    }
                }
                return;
            }
            // for editor mode
            var cm = inkdrop.getActiveEditor().cm;
            var line = cm.getCursor().line;
            var header = _this.getCurrentHeader(line);
            var next = _this.getNextHeader(header);
            if (next != null) {
                var vp = cm.getViewport();
                cm.setCursor(next.rowStart + Math.round((vp.to - vp.from) / 2), 0);
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
            _this.paneState.isPreview = editorEle.classList.contains("editor-viewmode-preview");
            // skip editor mode
            if (!_this.paneState.isPreview) {
                return;
            }
            _this.paneState.previewHeaders = [];
            var preview = editorEle.querySelector(".mde-preview");
            preview.querySelectorAll("*").forEach(function (v) {
                if (v.tagName.length == 2 && v.tagName.startsWith("H")) {
                    _this.paneState.previewHeaders.push(v);
                }
            });
        };
        /*
         * Handle preview scroll.
         */
        _this.handlePreviewScroll = function (_) {
            // skip editor mode
            if (!_this.paneState.isPreview) {
                return;
            }
            // for first preview
            if (_this.paneState.firstPreview) {
                _this.paneState.firstPreview = false;
                _this.handlePreviewUpdate($(".editor"));
            }
            var diff = document.querySelector(".mde-preview").getBoundingClientRect().y;
            // analyze current header
            for (var i = _this.paneState.previewHeaders.length - 1; i >= 0; i--) {
                var header = _this.paneState.previewHeaders[i];
                var top_3 = header.getBoundingClientRect().top;
                // create current header key
                if (top_3 - diff < 50) {
                    var current = "";
                    var k = 0;
                    for (k = 0; k <= i; k++) {
                        current += "_" + _this.paneState.previewHeaders[k].textContent;
                    }
                    current = current.replace(/ /g, "");
                    // change preview current
                    if (_this.paneState.previewCurrent != current) {
                        _this.paneState.previewCurrent = current;
                        // move cursor to active header
                        var cm = inkdrop.getActiveEditor().cm;
                        var item = _this.state.headers[k - 1];
                        if (item != null) {
                            cm.setCursor(item.rowStart, 0);
                            _this.forceUpdate();
                        }
                    }
                    break;
                }
            }
        };
        /*
         *
         */
        _this.handleWindowResize = function () {
            // Handle size changed.
            if (!_this.state.visibility) {
                return;
            }
            _this.updateState();
        };
        /*
         * scroll to header
         */
        _this.handleClick = function (header) {
            // for preview mode
            if (_this.paneState.isPreview) {
                for (var i = 0; i < _this.state.headers.length; i++) {
                    if (_this.state.headers[i] == header) {
                        var preview = document.querySelector(".mde-preview");
                        preview.scrollTop = _this.paneState.previewHeaders[i].offsetTop - preview.offsetTop;
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
         *
         */
        _this.handleChangeWidth = function (mode) { return Settings.changeCurrentWidth(mode); };
        /*
         *
         */
        _this.handleToggleTextwrap = function () {
            Settings.toggleTextWrap();
            _this.commit({});
        };
        /*
         * convert to style
         */
        _this.toStyle = function (header, current) {
            var style = {
                marginLeft: 20 * (header.count - _this.state.min),
                cursor: "pointer",
                backgroundColor: "",
                color: "",
            };
            var isCurrent = false;
            if (_this.paneState.isPreview) {
                if (_this.paneState.previewCurrent == current) {
                    isCurrent = true;
                }
            }
            else if (_this.isSameHeader(_this.state.currentHeader, header)) {
                isCurrent = true;
            }
            if (isCurrent) {
                style.color = Settings.hiFgColor;
                style.backgroundColor = Settings.hiBgColor;
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
            len: 0,
        };
        this.paneState.dispatchId = dispatcher.register(function (action) {
            return _this.dispatchAction(action);
        });
        var editor = inkdrop.getActiveEditor();
        if (editor != null) {
            this.attachEvents(editor);
        }
        else {
            inkdrop.onEditorLoad(function (e) {
                _this.attachEvents(e);
            });
        }
    };
    /*
     *
     */
    SideTocPane.prototype.componentDidUpdate = function () {
        var cur = this.paneState.curSectionRef.current;
        if (cur == null) {
            return;
        }
        var pane = document.querySelector(".sidetoc-pane-wrapper");
        if (pane != null) {
            pane.scrollTop = cur.offsetTop - pane.offsetTop;
        }
    };
    /*
     *
     */
    SideTocPane.prototype.componentWillUnmount = function () {
        // unhandle event
        dispatcher.unregister(this.paneState.dispatchId);
        var editor = inkdrop.getActiveEditor();
        // for delete note
        if (editor == null) {
            return;
        }
        this.detachEvents(editor);
    };
    /*
     *
     */
    SideTocPane.prototype.dispatchAction = function (action) {
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
    };
    /*
     *
     */
    SideTocPane.prototype.render = function () {
        // use cache
        if (this.paneState.content == null) {
            this.paneState.content = this.createContent();
        }
        return this.paneState.content;
    };
    /*
     *
     */
    SideTocPane.prototype.createContent = function () {
        var _this = this;
        var className = "sidetoc-pane";
        if (!this.state.visibility || this.state.headers.length == 0) {
            className = "sidetoc-pane-hide";
        }
        else if (!Settings.isTextwrap) {
            className += " sidetoc-pane-nowrap";
        }
        var style = {
            fontFamily: Settings.fontFamily,
        };
        var wrapperStyle = {
            height: inkdrop.window.getSize()[1] -
                this.paneState.heightDiff -
                (this.statusBar != null ? this.statusBar.clientHeight : 0),
        };
        // current header key for preview which join header text with "_".
        var current = "";
        return (React.createElement("div", { className: className, style: style },
            React.createElement("div", { className: "sidetoc-pane-wrapper", style: wrapperStyle }, this.state.headers.map(function (v) {
                current += "_" + v.str.replace(/ /g, "");
                var _a = _this.toStyle(v, current), style = _a.style, isCurrent = _a.isCurrent;
                var ref = isCurrent ? _this.paneState.curSectionRef : null;
                return (React.createElement("li", { style: style, onClick: _this.handleClick.bind(_this, v), ref: ref }, v.str));
            }))));
    };
    /*----- private -----*/
    /*
     *
     */
    SideTocPane.prototype.attachEvents = function (editor) {
        var _this = this;
        this.statusBar = document.querySelector("#app-container .main-layout .editor-layout .editor-status-bar-layout");
        // refresh
        this.updateState();
        var cm = editor.cm;
        cm.on("cursorActivity", this.handleCursorActivity);
        cm.on("changes", this.handleCmUpdate);
        cm.on("scroll", this.handleCmScroll);
        // for sidetoc overflow-y
        var winHeight = inkdrop.window.getSize()[1];
        this.paneState.heightDiff = winHeight - cm.getScrollInfo().clientHeight;
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
        this.paneState.isPreview = editorEle.classList.contains("editor-viewmode-preview");
        // observe preview update
        this.paneState.observer = new MutationObserver(function (_) { return _this.handlePreviewUpdate(editorEle); });
        this.paneState.observer.observe(preview, {
            childList: true,
            subtree: true,
            attributes: true,
        });
        // observe ui theme
        this.paneState.bodyObserver = new MutationObserver(function (_) {
            Settings.refresh();
            _this.updateState();
        });
        this.paneState.bodyObserver.observe(document.body, { attributes: true });
    };
    /*
     *
     */
    SideTocPane.prototype.detachEvents = function (editor) {
        var cm = editor.cm;
        cm.off("cursorActivity", this.handleCursorActivity);
        cm.off("update", this.handleCmUpdate);
        cm.off("scroll", this.handleCmScroll);
        inkdrop.window.off("resize", this.handleWindowResize);
        this.paneState.observer.disconnect();
        this.paneState.bodyObserver.disconnect();
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
    SideTocPane.prototype.isSameHeader = function (h1, h2) {
        if (h1 == null) {
            return false;
        }
        else if (h1 == h2) {
            return true;
        }
        if (h1.count == h2.count &&
            h1.index == h2.index &&
            h1.rowStart == h2.rowStart &&
            h1.str == h2.str) {
            return true;
        }
        return false;
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
    SideTocPane.prototype.getNextHeader = function (header) {
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
        // this.log(() => "★★★ commit");
        this.paneState.content = null;
        this.setState(state);
    };
    /*
     *
     */
    SideTocPane.prototype.log = function (_) {
        // console.log(`sidetoc: ${_()}`);
    };
    return SideTocPane;
}(React.Component));
export default SideTocPane;
