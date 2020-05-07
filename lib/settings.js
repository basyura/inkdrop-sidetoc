"use babel";

class Settings {
  constructor() {
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
      if (newValue == null || newValue < 10) {
        newValue = 200;
      }
      document.documentElement.style.setProperty(
        "--inkdrop-sidetoc-width",
        newValue.toString(10) + "px"
      );
    });
  }
}

export default new Settings();