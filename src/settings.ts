"use babel";

declare var inkdrop: any;

class Settings {
  fontFamily: string = "";
  hicolor: string = "";

  constructor() {
    // fontFamily
    inkdrop.config.observe("editor.fontFamily", (newValue: string) => {
      this.fontFamily = newValue;
    });
    // highlight
    inkdrop.config.observe("sidetoc.highlightColor", (newValue: string) => {
      this.hicolor = newValue;
      document.documentElement.style.setProperty(
        "--inkdrop-sidetoc-highlight-color",
        this.hicolor
      );
    });
    // width
    inkdrop.config.observe("sidetoc.width", (newValue: number) => {
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
