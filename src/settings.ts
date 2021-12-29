"use babel";

import { Inkdrop, WidthChangeMode } from "./types";

declare var inkdrop: Inkdrop;

class Settings {
  DefaultWidth = 200;
  fontFamily: string = "";
  hicolor: string = "";
  currentWidth: number = 0;
  _settingWidth: number = 0;
  sidetocPanePadding = 10;

  constructor() {
    // fontFamily
    inkdrop.config.observe("editor.fontFamily", (newValue: string) => {
      this.fontFamily = newValue;
    });
    // highlight
    inkdrop.config.observe("sidetoc.highlightColor", (newValue: string) => {
      this.hicolor = newValue;
      document.documentElement.style.setProperty("--inkdrop-sidetoc-highlight-color", this.hicolor);
    });
    // width
    inkdrop.config.observe("sidetoc.width", (newValue: number) => {
      if (newValue == null || newValue < 10) {
        newValue = this.DefaultWidth;
      }
      this._settingWidth = newValue;
      this.currentWidth = newValue;
      this.changeCurrentWidth(WidthChangeMode.Reset);
    });
    // wrapper's padding
    document.documentElement.style.setProperty(
      "--inkdrop-sidetoc-padding",
      this.sidetocPanePadding.toString(10) + "px"
    );
  }
  /*
   *
   */
  changeCurrentWidth = (mode: WidthChangeMode) => {
    let width = inkdrop.config.get("sidetoc.IncreaseWidth");
    // check settings
    if (width == null || width == 0) {
      width = 10;
    }

    if (mode == WidthChangeMode.Reset) {
      this.currentWidth = this._settingWidth;
    } else if (mode == WidthChangeMode.Increase) {
      this.currentWidth += width;
    } else if (mode == WidthChangeMode.Decrease) {
      this.currentWidth -= width;
    }

    document.documentElement.style.setProperty(
      "--inkdrop-sidetoc-width",
      this.currentWidth.toString(10) + "px"
    );

    document.documentElement.style.setProperty(
      "--inkdrop-sidetoc-pane-wrapper-width",
      (this.currentWidth - 2 * this.sidetocPanePadding).toString(10) + "px"
    );
  };
}

export default new Settings();
