"use babel";
import { WidthChangeMode } from "./types";
var Settings = /** @class */ (function () {
    function Settings() {
        var _this = this;
        this.DefaultWidth = 200;
        this.fontFamily = "";
        this.hicolor = "";
        this.currentWidth = 0;
        this._settingWidth = 0;
        this.isTextwrap = true;
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
        // fontFamily
        inkdrop.config.observe("editor.fontFamily", function (newValue) {
            _this.fontFamily = newValue;
        });
        // highlight
        inkdrop.config.observe("sidetoc.highlightColor", function (newValue) {
            _this.hicolor = newValue;
            document.documentElement.style.setProperty("--inkdrop-sidetoc-highlight-color", _this.hicolor);
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
        // wrapper's padding
        document.documentElement.style.setProperty("--inkdrop-sidetoc-padding", this.sidetocPanePadding.toString(10) + "px");
    }
    return Settings;
}());
export default new Settings();
