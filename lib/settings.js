"use babel";
var Settings = /** @class */ (function () {
    function Settings() {
        var _this = this;
        this.fontFamily = "";
        this.hicolor = "";
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
                newValue = 200;
            }
            document.documentElement.style.setProperty("--inkdrop-sidetoc-width", newValue.toString(10) + "px");
        });
    }
    return Settings;
}());
export default new Settings();
