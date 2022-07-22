"use babel";
import { WidthChangeMode } from "./types";
var Settings = /** @class */ (function () {
    function Settings() {
        var _this = this;
        this.DefaultWidth = 200;
        this.fontFamily = "";
        this.hiBgColor = "";
        this.hiFgColor = "";
        this.currentWidth = 0;
        this._settingWidth = 0;
        this.isTextwrap = true;
        this.isDefaultVisible = true;
        this.sidetocPanePadding = 10;
        /*
         *
         */
        this.changeCurrentWidth = function (mode) {
            var width = inkdrop.config.get("sidetoc.IncreaseWidth");
            // check settings
            if (width == null || width == 0) {
                width = 10;
            }
            if (mode == WidthChangeMode.Reset) {
                _this.currentWidth = _this._settingWidth;
            }
            else if (mode == WidthChangeMode.Increase) {
                _this.currentWidth += width;
            }
            else if (mode == WidthChangeMode.Decrease) {
                _this.currentWidth -= width;
            }
            document.documentElement.style.setProperty("--inkdrop-sidetoc-width", _this.currentWidth.toString(10) + "px");
            document.documentElement.style.setProperty("--inkdrop-sidetoc-pane-wrapper-width", (_this.currentWidth - 2 * _this.sidetocPanePadding).toString(10) + "px");
        };
        /*
         *
         */
        this.toggleTextWrap = function () {
            _this.isTextwrap = !_this.isTextwrap;
        };
        // to get css value
        this.computedStyle = getComputedStyle(document.body);
        // fontFamily
        inkdrop.config.observe("editor.fontFamily", function (newValue) {
            _this.fontFamily = newValue;
        });
        // highlight BG
        inkdrop.config.observe("sidetoc.highlightBgColor", function (newValue) {
            _this._changeBgColor(newValue);
        });
        // highlight FG
        inkdrop.config.observe("sidetoc.highlightFgColor", function (newValue) {
            _this._changeFgColor(newValue);
        });
        // width
        inkdrop.config.observe("sidetoc.width", function (newValue) {
            if (newValue == null || newValue < 10) {
                newValue = _this.DefaultWidth;
            }
            _this._settingWidth = newValue;
            _this.currentWidth = newValue;
            _this.changeCurrentWidth(WidthChangeMode.Reset);
        });
        // ellipsis
        inkdrop.config.observe("sidetoc.textwrap", function (newValue) {
            if (newValue == undefined) {
                newValue = true;
            }
            _this.isTextwrap = newValue;
        });
        // visibility
        inkdrop.config.observe("sidetoc.defaultVisible", function (newValue) {
            if (newValue == undefined) {
                newValue = true;
            }
            _this.isDefaultVisible = newValue;
        });
        // wrapper's padding
        document.documentElement.style.setProperty("--inkdrop-sidetoc-padding", this.sidetocPanePadding.toString(10) + "px");
    }
    /*
     *
     */
    Settings.prototype.refresh = function () {
        // to get css value
        this.computedStyle = getComputedStyle(document.body);
        this._changeBgColor(inkdrop.config.get("sidetoc.highlightBgColor"));
        this._changeFgColor(inkdrop.config.get("sidetoc.highlightFgColor"));
    };
    /*
     *
     */
    Settings.prototype._changeBgColor = function (newValue) {
        if (newValue == null) {
            return;
        }
        if (newValue.startsWith("--")) {
            newValue = this.computedStyle.getPropertyValue(newValue);
        }
        this.hiBgColor = newValue;
        document.documentElement.style.setProperty("--inkdrop-sidetoc-highlight-bg-color", newValue);
    };
    /*
     *
     */
    Settings.prototype._changeFgColor = function (newValue) {
        if (newValue == null) {
            return null;
        }
        if (newValue.startsWith("--")) {
            newValue = this.computedStyle.getPropertyValue(newValue);
        }
        this.hiFgColor = newValue;
        document.documentElement.style.setProperty("--inkdrop-sidetoc-highlight-fg-color", newValue);
    };
    return Settings;
}());
export default new Settings();
