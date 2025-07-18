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
var HeaderListItem = React.memo(React.forwardRef(function (_a, ref) {
    var header = _a.header, style = _a.style, onClick = _a.onClick, isCurrent = _a.isCurrent;
    return (React.createElement("li", { style: style, onClick: function () { return onClick(header); }, ref: isCurrent ? ref : null }, header.str));
}), function (prevProps, nextProps) {
    // Only prevent re-render if header content is the same AND isCurrent status unchanged
    // Always re-render when isCurrent changes to update background color
    if (prevProps.isCurrent !== nextProps.isCurrent) {
        return false; // Force re-render when active state changes
    }
    // For performance, skip deep style comparison and only check header identity
    return prevProps.header === nextProps.header;
});
var SideTocPane = /** @class */ (function (_super) {
    __extends(SideTocPane, _super);
    function SideTocPane() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // internal state
        _this.paneState = new PaneState();
        // element cache
        _this.statusBar = null;
        // Utility functions for performance optimization
        _this.debounce = function (func, wait) {
            var timeout;
            return (function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var later = function () {
                    clearTimeout(timeout);
                    func.apply(void 0, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            });
        };
        _this.throttle = function (func, limit) {
            var inThrottle;
            return (function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (!inThrottle) {
                    func.apply(void 0, args);
                    inThrottle = true;
                    setTimeout(function () { return inThrottle = false; }, limit);
                }
            });
        };
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
            _this.commit({ visibility: !_this.state.visibility });
            setTimeout(function () {
                inkdrop.commands.dispatch(document.body, "editor:refresh");
            }, 10);
        };
        /*
         * Handle CodeMirror updates with debouncing
         */
        _this.handleCmUpdate = _this.debounce(function () {
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
            if (!editor)
                return;
            var cm = editor.cm;
            var text = cm.lineInfo(cm.getCursor().line).text;
            // forcely update when starts with "#"
            if (!text.startsWith("#")) {
                // edited normal line.
                if (_this.state.len == editor.cm.lineCount()) {
                    return;
                }
            }
            _this.updateState();
        }, 200); // 200ms debounce
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
                var meta = document.querySelector(".metadata");
                if (meta != null && meta.clientHeight != 0 && _this.paneState.previewHeaders.length > 1) {
                    var header_1 = _this.paneState.previewHeaders[0];
                    if (preview.scrollTop <= header_1.offsetTop) {
                        preview.scrollTop = 0;
                        return;
                    }
                }
                for (var i = 1; i < _this.paneState.previewHeaders.length; i++) {
                    var header_2 = _this.paneState.previewHeaders[i];
                    var top_1 = header_2.getBoundingClientRect().top;
                    if (top_1 > 0) {
                        preview.scrollTop = _this.paneState.previewHeaders[i - 1].offsetTop - preview.offsetTop;
                        return;
                    }
                }
                var header_3 = _this.paneState.previewHeaders[_this.paneState.previewHeaders.length - 1];
                if (header_3 == null) {
                    return;
                }
                preview.scrollTop = header_3.offsetTop - preview.offsetTop;
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
                var meta = document.querySelector(".metadata");
                // meta div
                if (meta != null && meta.clientHeight != 0 && _this.paneState.previewHeaders.length > 1) {
                    var header_4 = _this.paneState.previewHeaders[0];
                    if (preview.scrollTop < header_4.clientHeight) {
                        preview.scrollTop = header_4.offsetTop - preview.offsetTop;
                        return;
                    }
                }
                var diff = preview.getBoundingClientRect().y;
                for (var i = _this.paneState.previewHeaders.length - 2; i >= 0; i--) {
                    var header_5 = _this.paneState.previewHeaders[i];
                    var top_2 = header_5.getBoundingClientRect().top;
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
            if (!preview)
                return;
            // Use efficient CSS selector instead of scanning all elements
            var headerElements = preview.querySelectorAll("h1, h2, h3, h4, h5, h6");
            _this.paneState.previewHeaders = Array.from(headerElements);
        };
        /*
         * Handle preview scroll with throttling.
         */
        _this.handlePreviewScroll = _this.throttle(function (_) {
            // skip editor mode
            if (!_this.paneState.isPreview) {
                return;
            }
            // for first preview
            if (_this.paneState.firstPreview) {
                _this.paneState.firstPreview = false;
                _this.handlePreviewUpdate(_this.getEditorElement());
            }
            var previewElement = document.querySelector(".mde-preview");
            if (!previewElement)
                return;
            var diff = previewElement.getBoundingClientRect().y;
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
        }, 16); // 60fps throttling
        /*
         *
         */
        _this.handleWindowResize = function () {
            // Handle size changed.
            if (!_this.state.visibility) {
                return;
            }
            // Invalidate DOM cache on resize as layout may have changed
            _this.invalidateElementCache();
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
         * convert to style with caching for object pooling
         */
        _this.toStyleCached = function (header, current) {
            var _a;
            // Generate cache key based on style-affecting properties
            var cacheKey = "".concat(header.count, "-").concat(_this.state.min, "-").concat(current, "-").concat(_this.paneState.isPreview ? _this.paneState.previewCurrent : ((_a = _this.state.currentHeader) === null || _a === void 0 ? void 0 : _a.index) || 'none');
            // Check cache first
            if (_this.paneState.styleCache.has(cacheKey)) {
                return _this.paneState.styleCache.get(cacheKey);
            }
            // Calculate style
            var result = _this.toStyle(header, current);
            // Cache the result
            _this.paneState.styleCache.set(cacheKey, result);
            // Keep cache size reasonable (LRU-like behavior)
            if (_this.paneState.styleCache.size > 100) {
                var firstKey = _this.paneState.styleCache.keys().next().value;
                if (firstKey !== undefined) {
                    _this.paneState.styleCache.delete(firstKey);
                }
            }
            return result;
        };
        /*
         * convert to style (original implementation)
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
    // DOM element cache methods for performance
    SideTocPane.prototype.getPaneElement = function () {
        if (!this.paneState.cachedPaneElement) {
            this.paneState.cachedPaneElement = document.querySelector("#app-container > .main-layout > .editor-layout > .mde-layout > .sidetoc-pane");
        }
        return this.paneState.cachedPaneElement;
    };
    SideTocPane.prototype.getEditorElement = function () {
        if (!this.paneState.cachedEditorElement) {
            this.paneState.cachedEditorElement = document.querySelector(".editor");
        }
        return this.paneState.cachedEditorElement;
    };
    SideTocPane.prototype.invalidateElementCache = function () {
        this.paneState.cachedPaneElement = null;
        this.paneState.cachedEditorElement = null;
    };
    /*
     *
     */
    SideTocPane.prototype.componentWillMount = function () {
        var _this = this;
        // state of this component
        this.state = {
            visibility: Settings.isDefaultVisible,
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
     * Optimized render with better caching strategy
     */
    SideTocPane.prototype.render = function () {
        // Check if we need to regenerate content
        if (this.paneState.content == null || this.shouldUpdateContent()) {
            this.paneState.content = this.createContent();
            this.paneState.lastRenderHeaders = this.state.headers;
            this.paneState.lastRenderVisibility = this.state.visibility;
            this.paneState.lastRenderCurrentHeader = this.state.currentHeader;
        }
        return this.paneState.content;
    };
    /*
     * Check if content should be updated
     */
    SideTocPane.prototype.shouldUpdateContent = function () {
        return this.paneState.lastRenderHeaders !== this.state.headers ||
            this.paneState.lastRenderVisibility !== this.state.visibility ||
            this.paneState.lastRenderCurrentHeader !== this.state.currentHeader;
    };
    /*
     *
     */
    SideTocPane.prototype.createContent = function () {
        var _this = this;
        var isShowPane = this.isShowPane();
        var className = "sidetoc-pane";
        if (!isShowPane) {
            className = "sidetoc-pane-hide";
        }
        else if (!Settings.isTextwrap) {
            className += " sidetoc-pane-nowrap";
        }
        var style = {
            fontFamily: Settings.fontFamily,
        };
        var wrapperStyle = {};
        if (isShowPane) {
            var pane = this.getPaneElement();
            if (pane != null) {
                wrapperStyle.height = pane.offsetHeight - 20;
            }
        }
        // current header key for preview which join header text with "_".
        var current = "";
        return (React.createElement("div", { className: className, style: style },
            React.createElement("div", { className: "sidetoc-pane-wrapper", style: wrapperStyle }, this.state.headers.map(function (v, index) {
                // Optimized string processing - avoid regex replace
                var cleanStr = v.str.split(' ').join('');
                current += "_" + cleanStr;
                var _a = _this.toStyleCached(v, current), style = _a.style, isCurrent = _a.isCurrent;
                var ref = isCurrent ? _this.paneState.curSectionRef : null;
                return (React.createElement(HeaderListItem, { key: "".concat(v.index, "-").concat(v.str), header: v, style: style, onClick: _this.handleClick, ref: ref, isCurrent: isCurrent }));
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
        inkdrop.window.on("resize", this.handleWindowResize);
        // hook preview scroll
        var editorEle = this.getEditorElement();
        if (editorEle == null) {
            return;
        }
        // preview element
        var preview = editorEle.querySelector(".mde-preview");
        if (preview == null) {
            return;
        }
        // Store reference for proper cleanup
        this.paneState.previewElement = preview;
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
        // Properly remove preview scroll event listener to prevent memory leaks
        if (this.paneState.previewElement) {
            this.paneState.previewElement.removeEventListener("scroll", this.handlePreviewScroll);
            this.paneState.previewElement = null;
        }
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
     * Binary search optimized header lookup - O(log n) instead of O(n)
     */
    SideTocPane.prototype.getCurrentHeader = function (line) {
        var headers = this.state.headers;
        if (headers.length === 0)
            return null;
        var left = 0;
        var right = headers.length - 1;
        // Binary search for the header containing the line
        while (left <= right) {
            var mid = Math.floor((left + right) / 2);
            var header = headers[mid];
            if (line >= header.rowStart && line <= header.rowEnd) {
                return header;
            }
            else if (line < header.rowStart) {
                right = mid - 1;
            }
            else {
                left = mid + 1;
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
     * Optimized commit with selective content invalidation
     */
    SideTocPane.prototype.commit = function (state) {
        // Only invalidate content if headers, visibility, or currentHeader changed
        if (state.headers !== undefined || state.visibility !== undefined || state.currentHeader !== undefined) {
            this.paneState.content = null;
        }
        // Clear style cache when state changes that affect styling
        if (state.headers !== undefined || state.currentHeader !== undefined || state.min !== undefined) {
            this.paneState.styleCache.clear();
        }
        this.setState(state);
    };
    /*
     *
     */
    SideTocPane.prototype.isShowPane = function () {
        if (!this.state.visibility) {
            return false;
        }
        if (Settings.isShowIfNoHeader) {
            return true;
        }
        return this.state.headers.length != 0;
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
