"use babel";

import { Inkdrop, WidthChangeMode } from "./types";

declare var inkdrop: Inkdrop;

class Settings {
  DefaultWidth = 200;
  fontFamily: string = "";
  hiBgColor: string = "";
  hiFgColor: string = "";
  currentWidth: number = 0;
  _settingWidth: number = 0;
  isTextwrap: boolean = true;
  isDefaultVisible: boolean = true;
  sidetocPanePadding = 10;
  computedStyle: CSSStyleDeclaration;

  constructor() {
    // to get css value
    this.computedStyle = getComputedStyle(document.body);
    // fontFamily
    inkdrop.config.observe("editor.fontFamily", (newValue: string) => {
      this.fontFamily = newValue;
    });
    // highlight BG
    inkdrop.config.observe("sidetoc.highlightBgColor", (newValue: string) => {
      this._changeBgColor(newValue);
    });
    // highlight FG
    inkdrop.config.observe("sidetoc.highlightFgColor", (newValue: string) => {
      this._changeFgColor(newValue);
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
    // ellipsis
    inkdrop.config.observe("sidetoc.textwrap", (newValue: boolean) => {
      if (newValue == undefined) {
        newValue = true;
      }
      this.isTextwrap = newValue;
    });
    // visibility
    inkdrop.config.observe("sidetoc.defaultVisible", (newValue: boolean) => {
      if (newValue == undefined) {
        newValue = true;
      }
      this.isDefaultVisible = newValue;
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
  refresh() {
    // to get css value
    this.computedStyle = getComputedStyle(document.body);
    this._changeBgColor(inkdrop.config.get("sidetoc.highlightBgColor"));
    this._changeFgColor(inkdrop.config.get("sidetoc.highlightFgColor"));
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
  /*
   *
   */
  toggleTextWrap = () => {
    this.isTextwrap = !this.isTextwrap;
  };
  /*
   *
   */
  _changeBgColor(newValue: string) {
    if (newValue == null) {
      return;
    }
    if (newValue.startsWith("--")) {
      newValue = this.computedStyle.getPropertyValue(newValue);
    }
    this.hiBgColor = newValue;
    document.documentElement.style.setProperty("--inkdrop-sidetoc-highlight-bg-color", newValue);
  }
  /*
   *
   */
  _changeFgColor(newValue: string) {
    if (newValue == null) {
      return null;
    }
    if (newValue.startsWith("--")) {
      newValue = this.computedStyle.getPropertyValue(newValue);
    }
    this.hiFgColor = newValue;
    document.documentElement.style.setProperty("--inkdrop-sidetoc-highlight-fg-color", newValue);
  }
}

export default new Settings();
